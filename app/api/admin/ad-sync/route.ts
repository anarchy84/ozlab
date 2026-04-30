// ─────────────────────────────────────────────
// /api/admin/ad-sync — 광고 시트 sync 설정 + 수동 sync 트리거
//
// GET   : 현재 sheet URL + 마지막 동기화 상태 조회
// PATCH : sheet URL 저장 (super_admin/marketing/admin)
// POST  : 즉시 sync 실행 (시트 CSV fetch → ad_metrics UPSERT)
//
// CSV 포맷 가정 (시트 1행 헤더):
//   date, channel, service, impressions, clicks, conversions, spend
// 한글 컬럼이면 alias 매핑해야 — 시트 본 후 다음 단계에서 정교화
// ─────────────────────────────────────────────

import { createAdminClient } from '@/lib/supabase/admin'
import { guardApi } from '@/lib/admin/auth-helpers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const guard = await guardApi()
  if (!guard.ok) return guard.response

  const admin = createAdminClient()
  const [config, recent] = await Promise.all([
    admin.from('ad_sync_config').select('*').eq('id', 1).single(),
    admin
      .from('ad_metrics')
      .select('date, channel, service, impressions, clicks, conversions, spend, source, synced_at')
      .order('date', { ascending: false })
      .limit(50),
  ])

  return NextResponse.json({
    config: config.data,
    recent: recent.data ?? [],
  })
}

export async function PATCH(request: NextRequest) {
  const guard = await guardApi(['super_admin', 'marketing', 'admin'])
  if (!guard.ok) return guard.response

  const body = await request.json()
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.sheet_csv_url !== undefined) update.sheet_csv_url = body.sheet_csv_url || null

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('ad_sync_config')
    .update(update)
    .eq('id', 1)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// CSV 파싱 (간단 — 따옴표 안 쓴 일반 CSV 가정)
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/\r/g, '').split('\n').filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',').map((c) => c.trim())
    const r: Record<string, string> = {}
    headers.forEach((h, idx) => (r[h] = cells[idx] ?? ''))
    rows.push(r)
  }
  return rows
}

// 한글·영문 컬럼명 → 정규 키 매핑
function normalizeRow(r: Record<string, string>) {
  const get = (...keys: string[]): string => {
    for (const k of keys) {
      const v = r[k.toLowerCase()]
      if (v != null && v !== '') return v
    }
    return ''
  }
  return {
    date: get('date', '날짜', '일자'),
    channel: get('channel', '매체', '채널'),
    service: get('service', '서비스', '상품군') || null,
    impressions: parseInt(get('impressions', '노출수', '노출')) || 0,
    clicks: parseInt(get('clicks', '클릭수', '클릭')) || 0,
    conversions: parseInt(get('conversions', '전환수', '전환')) || 0,
    spend: Number(get('spend', '광고비', '비용').replace(/[,₩원]/g, '')) || 0,
  }
}

export async function POST() {
  const guard = await guardApi(['super_admin', 'marketing', 'admin'])
  if (!guard.ok) return guard.response

  const admin = createAdminClient()
  const { data: cfg } = await admin.from('ad_sync_config').select('sheet_csv_url').eq('id', 1).single()
  const url = cfg?.sheet_csv_url
  if (!url) {
    return NextResponse.json({ error: '먼저 sheet_csv_url 을 등록하세요.' }, { status: 400 })
  }

  let csvText: string
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    csvText = await res.text()
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await admin.from('ad_sync_config').update({
      last_synced_at: new Date().toISOString(),
      last_status: 'error',
      last_message: `fetch failed: ${msg}`,
    }).eq('id', 1)
    return NextResponse.json({ error: `시트 fetch 실패: ${msg}` }, { status: 500 })
  }

  const rows = parseCsv(csvText).map(normalizeRow).filter((r) => r.date && r.channel)

  if (rows.length === 0) {
    await admin.from('ad_sync_config').update({
      last_synced_at: new Date().toISOString(),
      last_status: 'error',
      last_message: 'CSV 행 0건 — 헤더가 date, channel, ... 인지 확인',
    }).eq('id', 1)
    return NextResponse.json({ error: 'CSV 행 0건' }, { status: 400 })
  }

  // UPSERT (date, channel, service)
  const payload = rows.map((r) => ({ ...r, source: 'sheet', synced_at: new Date().toISOString() }))
  const { error: upErr } = await admin
    .from('ad_metrics')
    .upsert(payload, { onConflict: 'date,channel,service', ignoreDuplicates: false })

  if (upErr) {
    await admin.from('ad_sync_config').update({
      last_synced_at: new Date().toISOString(),
      last_status: 'error',
      last_message: `upsert failed: ${upErr.message}`,
    }).eq('id', 1)
    return NextResponse.json({ error: upErr.message }, { status: 500 })
  }

  await admin.from('ad_sync_config').update({
    last_synced_at: new Date().toISOString(),
    last_status: 'success',
    last_message: `${rows.length}행 동기화`,
  }).eq('id', 1)

  return NextResponse.json({ success: true, rows: rows.length })
}
