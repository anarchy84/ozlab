// ─────────────────────────────────────────────
// /api/admin/consultations/export — 선택 또는 전체 CSV 다운로드
//   ?ids=uuid1,uuid2,... 또는 비우면 전체 (max 5000)
// ─────────────────────────────────────────────

import { createAdminClient } from '@/lib/supabase/admin'
import { guardApi } from '@/lib/admin/auth-helpers'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const guard = await guardApi()
  if (!guard.ok) return guard.response

  const { searchParams } = new URL(req.url)
  const idsParam = searchParams.get('ids')
  const ids = idsParam ? idsParam.split(',').filter(Boolean) : null

  const admin = createAdminClient()
  let query = admin
    .from('consultations')
    .select(
      `id, created_at, name, phone, store_name, industry, region, message, internal_memo,
       inferred_channel, inferred_keyword, inferred_creative, inferred_landing_title,
       utm_source, utm_medium, utm_campaign, utm_term, utm_content,
       status, status_id, counselor_id, assigned_at, contacted_at, last_contacted_at, done_at,
       db_group_label, callable_time, device_type, contract_period,
       is_favorite, is_blacklisted, ip_address`
    )
    .order('created_at', { ascending: false })
    .limit(5000)

  if (ids && ids.length > 0) {
    query = query.in('id', ids)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const headers = [
    'No', '접수일시', '신청자', '연락처', '매장', '업종', '지역',
    '매체분류', '캠페인', '키워드', '소재', '랜딩글',
    'DB그룹', '단말기', '약정', '통화가능시간',
    '상태id', '담당자id', '배정일시', '최종상담', '완료일시',
    '메모(고객)', '내부메모', '즐겨찾기', '블랙리스트', 'IP',
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
    lines.push(
      [
        r.id?.slice(-8) ?? '',
        r.created_at,
        r.name ?? '',
        r.phone ?? '',
        r.store_name ?? '',
        r.industry ?? '',
        r.region ?? '',
        r.inferred_channel ?? '',
        r.utm_campaign ?? '',
        r.inferred_keyword ?? '',
        r.inferred_creative ?? '',
        r.inferred_landing_title ?? '',
        r.db_group_label ?? '',
        r.device_type ?? '',
        r.contract_period ?? '',
        r.callable_time ?? '',
        r.status_id ?? '',
        r.counselor_id ?? '',
        r.assigned_at ?? '',
        r.last_contacted_at ?? '',
        r.done_at ?? '',
        r.message ?? '',
        r.internal_memo ?? '',
        r.is_favorite ? 'Y' : '',
        r.is_blacklisted ? 'Y' : '',
        r.ip_address ?? '',
      ].map(escape).join(',')
    )
  }

  const csv = '﻿' + lines.join('\n')  // BOM (엑셀 한글)
  const filename = `consultations_${new Date().toISOString().slice(0, 10)}${ids ? '_selected' : ''}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
