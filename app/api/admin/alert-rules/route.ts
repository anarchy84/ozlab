// ─────────────────────────────────────────────
// /api/admin/alert-rules — 이상 시그널 룰 CRUD (super_admin + marketing)
//
// GET  : 활성 + 비활성 룰 전체 목록
// POST : 신규 룰 등록
// ─────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { guardApi } from '@/lib/admin/auth-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED_METRICS = [
  'lead_count',
  'cpa',
  'roas',
  'conversion_rate',
  'unassigned_count',
  'channel_no_lead',
] as const
const ALLOWED_DIMENSIONS = ['global', 'channel', 'service', 'channel_x_service'] as const
const ALLOWED_COMPARISONS = ['multiplier', 'absolute', 'percentage_of_avg'] as const
const ALLOWED_BASIS = ['target', 'rolling_30d_avg', 'previous_week'] as const

interface PostBody {
  name?: string
  description?: string | null
  metric?: string
  dimension?: string
  dim_filter?: Record<string, unknown>
  comparison?: string
  threshold?: number
  comparison_basis?: string
  baseline_value?: number | null
  channel_codes?: string[]
  user_ids?: string[]
  cooldown_minutes?: number
  is_active?: boolean
}

function validate(b: PostBody): string | null {
  if (!b.name || b.name.trim().length === 0) return '룰 이름 필수'
  if (!b.metric || !ALLOWED_METRICS.includes(b.metric as (typeof ALLOWED_METRICS)[number])) {
    return `metric 값: ${ALLOWED_METRICS.join('|')}`
  }
  if (b.dimension && !ALLOWED_DIMENSIONS.includes(b.dimension as (typeof ALLOWED_DIMENSIONS)[number])) {
    return `dimension 값: ${ALLOWED_DIMENSIONS.join('|')}`
  }
  if (!b.comparison || !ALLOWED_COMPARISONS.includes(b.comparison as (typeof ALLOWED_COMPARISONS)[number])) {
    return `comparison 값: ${ALLOWED_COMPARISONS.join('|')}`
  }
  if (typeof b.threshold !== 'number' || !isFinite(b.threshold)) return 'threshold 숫자 필수'
  if (b.comparison_basis && !ALLOWED_BASIS.includes(b.comparison_basis as (typeof ALLOWED_BASIS)[number])) {
    return `comparison_basis 값: ${ALLOWED_BASIS.join('|')}`
  }
  if (b.comparison_basis === 'target' && (b.baseline_value === null || b.baseline_value === undefined)) {
    return 'target 비교는 baseline_value 필수'
  }
  return null
}

export async function GET() {
  const guard = await guardApi(['super_admin', 'marketing'])
  if (!guard.ok) return guard.response

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('alert_rules')
    .select(
      'id, name, description, metric, dimension, dim_filter, comparison, threshold, comparison_basis, baseline_value, channel_codes, user_ids, cooldown_minutes, is_active, created_at, updated_at',
    )
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rules: data ?? [] })
}

export async function POST(req: NextRequest) {
  const guard = await guardApi(['super_admin', 'marketing'])
  if (!guard.ok) return guard.response

  let body: PostBody
  try {
    body = (await req.json()) as PostBody
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  const validationError = validate(body)
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('alert_rules')
    .insert({
      name: body.name!.trim(),
      description: body.description ?? null,
      metric: body.metric!,
      dimension: body.dimension ?? 'global',
      dim_filter: body.dim_filter ?? {},
      comparison: body.comparison!,
      threshold: body.threshold,
      comparison_basis: body.comparison_basis ?? 'rolling_30d_avg',
      baseline_value: body.baseline_value ?? null,
      channel_codes: body.channel_codes ?? [],
      user_ids: body.user_ids ?? [],
      cooldown_minutes: body.cooldown_minutes ?? 60,
      is_active: body.is_active ?? true,
      created_by: guard.profile.user_id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, rule: data })
}
