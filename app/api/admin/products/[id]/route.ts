// ─────────────────────────────────────────────
// /api/admin/products/[id] — 상품 수정·삭제
// ─────────────────────────────────────────────

import { createAdminClient } from '@/lib/supabase/admin'
import { guardApi } from '@/lib/admin/auth-helpers'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await guardApi(['super_admin', 'admin', 'marketer'])
  if (!guard.ok) return guard.response

  const body = await request.json()
  const update: Record<string, unknown> = {}

  if (body.label !== undefined) update.label = body.label
  if (body.category !== undefined) update.category = body.category
  if (body.default_amount !== undefined) update.default_amount = body.default_amount
  if (body.default_period !== undefined) update.default_period = body.default_period
  if (body.is_subscription !== undefined) update.is_subscription = body.is_subscription === true
  if (body.default_monthly !== undefined) update.default_monthly = body.default_monthly
  if (body.sort_order !== undefined) update.sort_order = body.sort_order
  if (body.is_active !== undefined) update.is_active = body.is_active === true
  if (body.note !== undefined) update.note = body.note

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: '업데이트할 필드가 없습니다.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('products')
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
  const { error } = await admin.from('products').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
