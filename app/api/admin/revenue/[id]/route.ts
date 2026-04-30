// ─────────────────────────────────────────────
// /api/admin/revenue/[id] — 매출 기록 수정·삭제
// ─────────────────────────────────────────────

import { createAdminClient } from '@/lib/supabase/admin'
import { guardApi } from '@/lib/admin/auth-helpers'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await guardApi(['super_admin', 'admin', 'marketer', 'counselor'])
  if (!guard.ok) return guard.response

  const body = await request.json()
  const update: Record<string, unknown> = {}
  for (const k of [
    'product_id',
    'product_label',
    'amount',
    'gift_amount',
    'monthly_amount',
    'contract_period',
    'revenue_date',
    'note',
  ]) {
    if (body[k] !== undefined) update[k] = body[k]
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: '업데이트할 필드가 없습니다.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('revenue_records')
    .update(update)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await guardApi(['super_admin', 'admin'])
  if (!guard.ok) return guard.response

  const admin = createAdminClient()
  const { error } = await admin.from('revenue_records').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
