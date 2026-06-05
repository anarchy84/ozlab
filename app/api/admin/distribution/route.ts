// ─────────────────────────────────────────────
// /api/admin/distribution — DB 자동배분 정책 + 재분배 트리거
// 권한 :
//   GET  : 모든 admin
//   PATCH/POST(redistribute) : super_admin / marketing / tm_lead / admin
// ─────────────────────────────────────────────

import { createAdminClient } from '@/lib/supabase/admin'
import { guardApi } from '@/lib/admin/auth-helpers'
import { AUTO_DISTRIBUTION_ROLES } from '@/lib/admin/assignment'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const guard = await guardApi()
  if (!guard.ok) return guard.response

  const admin = createAdminClient()
  const [
    { data: ruleData, error },
    { data: members, error: membersError },
    { data: statuses, error: statusesError },
  ] = await Promise.all([
    admin
      .from('distribution_rules')
      .select('*')
      .eq('id', 1)
      .maybeSingle(),
    admin
      .from('admin_users')
      .select(
        `user_id, role, display_name, department, is_active,
         distribution_enabled, distribution_pause_reason,
         distribution_paused_until, distribution_note,
         distribution_weight, distribution_score`,
      )
      .in('role', ['tm_lead', 'counselor'])
      .eq('is_active', true)
      .order('role', { ascending: false })
      .order('display_name', { ascending: true, nullsFirst: false }),
    admin
      .from('db_statuses')
      .select('id, code, label, sort_order')
      .order('sort_order', { ascending: true }),
  ])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (membersError) {
    return NextResponse.json({ error: membersError.message }, { status: 500 })
  }
  if (statusesError) {
    return NextResponse.json({ error: statusesError.message }, { status: 500 })
  }

  let rule = ruleData
  if (!rule) {
    const { data: createdRule, error: createError } = await admin
      .from('distribution_rules')
      .upsert(
        {
          id: 1,
          is_enabled: false,
          mode: 'round_robin',
          eligible_roles: [...AUTO_DISTRIBUTION_ROLES],
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      )
      .select()
      .single()
    if (createError) return NextResponse.json({ error: createError.message }, { status: 500 })
    rule = createdRule
  }

  return NextResponse.json({ rule, members: members ?? [], statuses: statuses ?? [] })
}

export async function PATCH(request: NextRequest) {
  const guard = await guardApi(['super_admin', 'marketing', 'tm_lead', 'admin'])
  if (!guard.ok) return guard.response

  const body = await request.json()
  const update: Record<string, unknown> = { updated_at: new Date().toISOString(), updated_by: guard.profile.user_id }
  if (body.is_enabled !== undefined) {
    update.is_enabled = Boolean(body.is_enabled)
  }
  if (body.mode !== undefined) {
    update.mode = body.mode === 'manual_only' ? 'manual_only' : 'round_robin'
  }
  if (body.eligible_roles !== undefined) {
    const roles = Array.isArray(body.eligible_roles)
      ? body.eligible_roles.filter((role: unknown) => role === 'counselor' || role === 'tm_lead')
      : []
    update.eligible_roles = roles.length ? roles : [...AUTO_DISTRIBUTION_ROLES]
  }

  const admin = createAdminClient()
  const { data: rule, error } = await admin
    .from('distribution_rules')
    .upsert({ id: 1, ...update }, { onConflict: 'id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rule })
}
