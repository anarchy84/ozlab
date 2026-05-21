// ─────────────────────────────────────────────
// /api/admin/alert-rules/[id]/evaluate — 룰 즉시 평가 (드라이런 또는 실발송)
//
// POST { dryRun?: boolean }
//   - dryRun=true : 평가만 하고 발송 X
//   - dryRun=false (또는 미지정): 실제 평가 + 발송 (쿨다운은 무시 — 어드민 테스트용)
// ─────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { guardApi } from '@/lib/admin/auth-helpers'
import { evaluateAndDispatchRule, type AlertRule } from '@/lib/alerts/evaluator'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const guard = await guardApi(['super_admin', 'marketing'])
  if (!guard.ok) return guard.response

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('alert_rules')
    .select(
      'id, name, description, metric, dimension, dim_filter, comparison, threshold, comparison_basis, baseline_value, channel_codes, user_ids, cooldown_minutes, is_active',
    )
    .eq('id', params.id)
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'rule not found' }, { status: 404 })
  }

  // 어드민 테스트는 쿨다운 우회 — 임시로 cooldown_minutes=0 으로 평가
  const result = await evaluateAndDispatchRule({ ...(data as AlertRule), cooldown_minutes: 0 })
  return NextResponse.json({
    rule_id: data.id,
    rule_name: data.name,
    ...result,
  })
}
