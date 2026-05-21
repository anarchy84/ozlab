// ─────────────────────────────────────────────
// /api/admin/alert-rules/[id] — 룰 PATCH/DELETE + 발송 테스트
//
// PATCH  : 룰 일부 필드 수정
// DELETE : 룰 삭제 (alert_log.rule_id 는 SET NULL)
// ─────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { guardApi } from '@/lib/admin/auth-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface PatchBody {
  name?: string
  description?: string | null
  threshold?: number
  comparison_basis?: string
  baseline_value?: number | null
  channel_codes?: string[]
  user_ids?: string[]
  cooldown_minutes?: number
  is_active?: boolean
  dim_filter?: Record<string, unknown>
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const guard = await guardApi(['super_admin', 'marketing'])
  if (!guard.ok) return guard.response

  let body: PatchBody
  try {
    body = (await req.json()) as PatchBody
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}
  for (const k of [
    'name',
    'description',
    'threshold',
    'comparison_basis',
    'baseline_value',
    'channel_codes',
    'user_ids',
    'cooldown_minutes',
    'is_active',
    'dim_filter',
  ] as Array<keyof PatchBody>) {
    if (body[k] !== undefined) update[k] = body[k]
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: '변경할 필드가 없습니다.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('alert_rules')
    .update(update)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 })

  return NextResponse.json({ success: true, rule: data })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const guard = await guardApi(['super_admin', 'marketing'])
  if (!guard.ok) return guard.response

  const supabase = createAdminClient()
  const { error } = await supabase.from('alert_rules').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
