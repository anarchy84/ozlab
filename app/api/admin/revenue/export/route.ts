// ─────────────────────────────────────────────
// /api/admin/revenue/export — 매출 + 코호트 매트릭스 CSV 다운로드
//   마케팅팀 주간 리포트용
// ─────────────────────────────────────────────

import { createAdminClient } from '@/lib/supabase/admin'
import { guardApi } from '@/lib/admin/auth-helpers'
import { NextResponse } from 'next/server'

export async function GET() {
  const guard = await guardApi(['super_admin', 'marketing', 'tm_lead', 'admin', 'marketer'])
  if (!guard.ok) return guard.response

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('revenue_records')
    .select(
      `id, revenue_date, recorded_at, amount, gift_amount, net_amount,
       monthly_amount, contract_period, product_label, note,
       consultations:consultation_id (
         name, phone, store_name, industry, region,
         created_at, inferred_channel, inferred_keyword, inferred_creative,
         utm_source, utm_medium, utm_campaign
       )`
    )
    .order('revenue_date', { ascending: false })
    .limit(5000)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // CSV 헤더
  const headers = [
    '매출일', '리드접수일', '리드→매출(일)',
    '매체분류', '캠페인', '키워드', '소재',
    '신청자', '연락처', '매장', '업종', '지역',
    '상품', '약정', '매출액', '사은품', '순매출', '월매출',
    '메모', '등록시각',
  ]

  function escape(v: unknown): string {
    if (v === null || v === undefined) return ''
    const s = String(v)
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }

  const lines: string[] = [headers.join(',')]
  for (const r of data ?? []) {
    // consultations 는 1:1 이지만 Supabase 가 array 로 줄 수 있음 — 안전하게 처리
    const cRaw = (r as unknown as { consultations?: Record<string, unknown> | Record<string, unknown>[] }).consultations
    const c: Record<string, unknown> = Array.isArray(cRaw) ? (cRaw[0] ?? {}) : (cRaw ?? {})
    const created = c.created_at ? new Date(c.created_at as string) : null
    const revDate = r.revenue_date ? new Date(r.revenue_date) : null
    const daysToRevenue =
      created && revDate
        ? Math.max(0, Math.round((revDate.getTime() - created.getTime()) / 86400000))
        : ''

    lines.push(
      [
        r.revenue_date,
        c.created_at ? String(c.created_at).slice(0, 10) : '',
        daysToRevenue,
        c.inferred_channel ?? '',
        c.utm_campaign ?? '',
        c.inferred_keyword ?? '',
        c.inferred_creative ?? '',
        c.name ?? '',
        c.phone ?? '',
        c.store_name ?? '',
        c.industry ?? '',
        c.region ?? '',
        r.product_label ?? '',
        r.contract_period ?? '',
        r.amount,
        r.gift_amount,
        r.net_amount,
        r.monthly_amount ?? '',
        r.note ?? '',
        r.recorded_at ? new Date(r.recorded_at).toISOString() : '',
      ].map(escape).join(',')
    )
  }

  // BOM 추가 (엑셀 한글 깨짐 방지)
  const csv = '﻿' + lines.join('\n')
  const filename = `revenue_export_${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
