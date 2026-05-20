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
import { sendGa4Purchase } from '@/lib/tracking/ga-measurement-protocol'
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

  // ─────────────────────────────────────────────
  // GA4 Measurement Protocol — 실 net 마진 동적 보정
  //   · consultations 에서 ga_client_id + utm/광고 클릭 ID 조회
  //   · purchase 이벤트 fire-and-forget (await 안 함 — API 응답 지연 방지)
  //   · 매출 row 의 net_amount = amount - gift_amount (DB 가 자동 계산)
  //   · GA4_MEASUREMENT_ID / GA4_API_SECRET env 없으면 sendGa4Purchase 가 no-op
  // ─────────────────────────────────────────────
  try {
    const { data: consult } = await admin
      .from('consultations')
      .select(
        'id, ga_client_id, ga_session_id, utm_source, utm_medium, utm_campaign, utm_content, utm_term, gclid, fbclid',
      )
      .eq('id', body.consultation_id)
      .single()

    const netValue =
      typeof data.net_amount === 'number'
        ? data.net_amount
        : Number(data.amount) - Number(data.gift_amount ?? 0)

    // fire-and-forget — Promise 안 기다림 (API 응답 빠르게 반환)
    void sendGa4Purchase({
      clientId: consult?.ga_client_id ?? null,
      sessionId: consult?.ga_session_id ?? null,
      transactionId: data.id,
      leadId: body.consultation_id,
      value: netValue,
      currency: 'KRW',
      utm_source: consult?.utm_source ?? null,
      utm_medium: consult?.utm_medium ?? null,
      utm_campaign: consult?.utm_campaign ?? null,
      utm_content: consult?.utm_content ?? null,
      utm_term: consult?.utm_term ?? null,
      gclid: consult?.gclid ?? null,
      fbclid: consult?.fbclid ?? null,
      productLabel: productLabel,
    })
  } catch (e) {
    // 매출 입력 자체는 이미 성공. 트래킹 실패는 콘솔만.
    console.warn('[revenue POST] GA4 MP trigger error', e instanceof Error ? e.message : e)
  }

  return NextResponse.json(data, { status: 201 })
}
