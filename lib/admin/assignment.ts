import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'

export const AUTO_DISTRIBUTION_ROLES = ['counselor', 'tm_lead'] as const
export const MANUAL_ASSIGNABLE_ROLES = ['counselor', 'tm_lead', 'admin', 'super_admin'] as const

export interface CounselorOption {
  user_id: string
  display_name: string | null
  role?: string | null
  is_active?: boolean | null
}

interface DistributionRule {
  is_enabled: boolean
  mode: string | null
  eligible_roles: string[] | null
  last_assigned: string | null
}

interface DistributionCandidate {
  user_id: string
  display_name: string | null
  distribution_weight: number | string | null
  distribution_score: number | string | null
}

export async function fetchAssignableCounselors(
  supabase: SupabaseClient,
): Promise<CounselorOption[]> {
  const roles = [...MANUAL_ASSIGNABLE_ROLES]
  const primary = await queryAssignableCounselors(supabase, roles)

  if (!primary.error && primary.data && primary.data.length > 1) {
    return primary.data
  }

  try {
    const admin = createAdminClient()
    const fallback = await queryAssignableCounselors(admin, roles)
    if (!fallback.error && fallback.data) return fallback.data
  } catch {
    // 로컬처럼 service role 키가 없는 환경에서는 RLS 결과를 그대로 사용한다.
  }

  return primary.data ?? []
}

export async function fetchCounselorsByIds(
  supabase: SupabaseClient,
  ids: string[],
): Promise<CounselorOption[]> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)))
  if (uniqueIds.length === 0) return []

  const primary = await queryCounselorsByIds(supabase, uniqueIds)
  if (!primary.error && primary.data && primary.data.length === uniqueIds.length) {
    return primary.data
  }

  try {
    const admin = createAdminClient()
    const fallback = await queryCounselorsByIds(admin, uniqueIds)
    if (!fallback.error && fallback.data) return fallback.data
  } catch {
    // service role 키가 없으면 조회 가능한 이름만 반환한다.
  }

  return primary.data ?? []
}

export async function validateAssignableCounselor(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from('admin_users')
    .select('user_id, role, is_active')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) return { ok: false, error: error.message }
  if (!data || !data.is_active) {
    return { ok: false, error: '배정 가능한 활성 담당자가 아닙니다.' }
  }
  if (!MANUAL_ASSIGNABLE_ROLES.includes(data.role as (typeof MANUAL_ASSIGNABLE_ROLES)[number])) {
    return { ok: false, error: '배정 가능한 담당자에게만 지정할 수 있습니다.' }
  }
  return { ok: true }
}

export async function assignNextCounselorIfNeeded(
  supabase: SupabaseClient,
  consultationId: string,
  currentCounselorId?: string | null,
): Promise<string | null> {
  if (currentCounselorId) return currentCounselorId

  const { data: existing } = await supabase
    .from('consultations')
    .select('counselor_id')
    .eq('id', consultationId)
    .maybeSingle()

  if (existing?.counselor_id) return existing.counselor_id

  const { data: rule, error: ruleError } = await supabase
    .from('distribution_rules')
    .select('is_enabled, mode, eligible_roles, last_assigned')
    .eq('id', 1)
    .maybeSingle<DistributionRule>()

  if (ruleError || !rule?.is_enabled || rule.mode !== 'round_robin') {
    if (ruleError) console.error('[auto distribution rule]', ruleError)
    return null
  }

  const eligibleRoles = normalizeDistributionRoles(rule.eligible_roles)
  const now = new Date().toISOString()
  const { data: candidates, error: candidatesError } = await supabase
    .from('admin_users')
    .select('user_id, display_name, distribution_weight, distribution_score')
    .eq('is_active', true)
    .eq('distribution_enabled', true)
    .in('role', eligibleRoles)
    .or(`distribution_paused_until.is.null,distribution_paused_until.lte.${now}`)

  if (candidatesError) {
    console.error('[auto distribution candidates]', candidatesError)
    return null
  }

  const next = pickWeightedCandidate(
    ((candidates as DistributionCandidate[] | null) ?? []),
    rule.last_assigned,
  )
  if (!next) return null

  const assignedAt = new Date().toISOString()
  const { data: updated, error: updateError } = await supabase
    .from('consultations')
    .update({
      counselor_id: next.user_id,
      assigned_at: assignedAt,
      updated_at: assignedAt,
    })
    .eq('id', consultationId)
    .is('counselor_id', null)
    .select('counselor_id')
    .maybeSingle()

  if (updateError) {
    console.error('[auto distribution update consultation]', updateError)
    return null
  }
  if (!updated?.counselor_id) {
    const { data: refreshed } = await supabase
      .from('consultations')
      .select('counselor_id')
      .eq('id', consultationId)
      .maybeSingle()
    return refreshed?.counselor_id ?? null
  }

  const increment = 1 / Math.max(normalizeWeight(next.distribution_weight), 0.5)
  const nextScore = normalizeScore(next.distribution_score) + increment

  await Promise.all([
    supabase
      .from('admin_users')
      .update({ distribution_score: nextScore, updated_at: assignedAt })
      .eq('user_id', next.user_id),
    supabase
      .from('distribution_rules')
      .update({ last_assigned: next.user_id, updated_at: assignedAt })
      .eq('id', 1),
  ])

  return updated.counselor_id
}

async function queryAssignableCounselors(
  client: SupabaseClient,
  roles: readonly string[],
) {
  return client
    .from('admin_users')
    .select('user_id, display_name, role, is_active')
    .eq('is_active', true)
    .in('role', roles)
    .order('role', { ascending: false })
    .order('display_name', { ascending: true, nullsFirst: false })
}

async function queryCounselorsByIds(client: SupabaseClient, ids: string[]) {
  return client
    .from('admin_users')
    .select('user_id, display_name, role, is_active')
    .in('user_id', ids)
}

function normalizeDistributionRoles(value: string[] | null | undefined): string[] {
  const roles = Array.isArray(value)
    ? value.filter((role) =>
        AUTO_DISTRIBUTION_ROLES.includes(role as (typeof AUTO_DISTRIBUTION_ROLES)[number]),
      )
    : []
  return roles.length > 0 ? roles : [...AUTO_DISTRIBUTION_ROLES]
}

function pickWeightedCandidate(
  candidates: DistributionCandidate[],
  lastAssigned: string | null,
): DistributionCandidate | null {
  return [...candidates]
    .filter((candidate) => normalizeWeight(candidate.distribution_weight) > 0)
    .sort((a, b) => {
      const scoreDiff = normalizeScore(a.distribution_score) - normalizeScore(b.distribution_score)
      if (scoreDiff !== 0) return scoreDiff

      const lastDiff = Number(a.user_id === lastAssigned) - Number(b.user_id === lastAssigned)
      if (lastDiff !== 0) return lastDiff

      const nameA = a.display_name ?? a.user_id
      const nameB = b.display_name ?? b.user_id
      return nameA.localeCompare(nameB, 'ko')
    })[0] ?? null
}

function normalizeWeight(value: number | string | null): number {
  const numberValue = Number(value)
  if (numberValue === 0.5 || numberValue === 2) return numberValue
  return 1
}

function normalizeScore(value: number | string | null): number {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : 0
}
