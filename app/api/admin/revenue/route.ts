// ─────────────────────────────────────────────
// /api/admin/revenue — 매출 기록 (리드별 1:N)
// 권한 :
//   GET  : 모든 admin
//   POST : counselor 이상
// 쿼리 :
//   ?consultation_id=uuid → 특정 리드의 매출만
// ─────────────────────────────────────────────

import { createAdminClient } from '@/lib/supabase/admin'
import { guardApi } from '@/lib/admin/auth-helpers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const guard = await guardApi()
  if (!guard.ok) return guard.response

  const { searchParams } = new URL(request.url)
  const consultationId = searchParams.get('consultation_id')

  const admin = createAdminClient()
  let q = admin
    .from('revenue_records')
    .select(
      `id, consultation_id, product_id, product_label, amount, gift_amount, net_amount,
       monthly_amount, contract_period, revenue_date, recorded_by, recorded_at, note`
    )
    .order('revenue_date', { ascending: false })
    .limit(200)

  if (consultationId) q = q.eq('consultation_id', consultationId)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const guard = await guardApi(['super_admin', 'admin', 'marketer', 'counselor'])
  if (!guard.ok) return guard.response

  const body = await request.json()
  if (!body.consultation_id || body.amount == null || !body.revenue_date) {
    return NextResponse.json(
      { error: 'consultation_id / amount / revenue_date 는 필수입니다.' },
      { status: 400 }
    )
  }

  const admin = createAdminClient()

  // 상품 라벨 snapshot (상품 삭제돼도 보존)
  let productLabel: string | null = body.product_label ?? null
  if (body.product_id && !productLabel) {
    const { data: prod } = await admin
      .from('products')
      .select('label')
      .eq('id', body.product_id)
      .single()
    productLabel = prod?.label ?? null
  }

  const { data, error } = await admin
    .from('revenue_records')
    .insert({
      consultation_id: body.consultation_id,
      product_id: body.product_id ?? null,
      product_label: productLabel,
      amount: body.amount,
      gift_amount: body.gift_amount ?? 0,
      monthly_amount: body.monthly_amount ?? null,
      contract_period: body.contract_period ?? null,
      revenue_date: body.revenue_date,
      recorded_by: guard.profile.user_id,
      note: body.note ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
