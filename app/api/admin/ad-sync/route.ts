// ─────────────────────────────────────────────
// /api/admin/ad-sync — 광고 시트 sync 설정 + 수동 sync 트리거
//
// 2 소스 :
//   - db_purchase : 시트 헤더 (날짜·출처·매입수량·단가·총매입비)
//   - paid_media  : 시트 헤더 (날짜·매체·캠페인·키워드·광고비·노출수·클릭수·전환수·서비스)
//                   * 우리편 시트 _서비스분류 탭 호환
//                   * 같은 (date, channel, service) 행이 여러 캠페인으로 흩어져 있어도
//                     사전 집계 후 upsert (광고비/노출/클릭/전환 SUM)
//
// 매체값 정규화 :
//   sheet_channel_alias 테이블 → 시트 한글 매체값('네이버 검색광고' 등)
//   → channel_code('naver-search') 로 자동 변환.
//
// 멀티 사이트 :
//   ad_sync_config.site 로 결정 (default 'ozlab', 우리편 데이터는 'wooripen').
//   ad_metrics.site 컬럼에 그대로 저장. upsert 키 (site, date, channel, service).
//
// GET   : 현재 두 URL + 마지막 sync 상태 + 최근 50건
// PATCH : URL 저장 (body: { sheet_csv_url? / sheet_csv_url_paid? / site? })
// POST  : sync 실행
//          body: { type: 'db_purchase' | 'paid_media' }  → 해당 시트만
//          body: {}                                       → 등록된 시트 모두
//
// 결과 :
//   { success, results: [{ type, rows, status, message?, unmappedChannels? }], normalizedUrls? }
//
// 슬랙 :
//   sync 완료 시 alerts_warning 채널로 결과 broadcast (fire-and-forget)
// ─────────────────────────────────────────────

import { createAdminClient } from '@/lib/supabase/admin'
import { guardApi } from '@/lib/admin/auth-helpers'
import { sendToSlackChannel } from '@/lib/slack'
import { NextRequest, NextResponse } from 'next/server'

type SourceType = 'db_purchase' | 'paid_media'

export async function GET() {
  const guard = await guardApi()
  if (!guard.ok) return guard.response

  const admin = createAdminClient()
  const [config, recent] = await Promise.all([
    admin.from('ad_sync_config').select('*').eq('id', 1).single(),
    admin
      .from('ad_metrics')
      .select('site, date, channel, service, impressions, clicks, conversions, spend, lead_qty, source, synced_at')
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
  if (body.sheet_csv_url !== undefined) {
    update.sheet_csv_url = body.sheet_csv_url || null
  }
  if (body.sheet_csv_url_paid !== undefined) {
    update.sheet_csv_url_paid = body.sheet_csv_url_paid || null
  }
  if (body.site !== undefined) {
    update.site = body.site || 'ozlab'
  }

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

// ─────────────────────────────────────────────
// Google Sheets URL 자동 변환
// ─────────────────────────────────────────────
function normalizeGoogleSheetUrl(url: string): string {
  if (!url) return url
  if (url.includes('export?format=csv') || url.includes('out:csv')) return url
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  if (!m) return url
  const sheetId = m[1]
  const gidMatch = url.match(/[#?&]gid=(\d+)/)
  const gid = gidMatch ? gidMatch[1] : '0'
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`
}

// ─────────────────────────────────────────────
// CSV 파서 — RFC 4180 호환 (따옴표 묶인 콤마 보존)
// ─────────────────────────────────────────────
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/\r/g, '').split('\n')
  if (lines.length < 2) return []
  const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase())
  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    const cells = parseCsvLine(lines[i])
    const r: Record<string, string> = {}
    headers.forEach((h, idx) => (r[h] = (cells[idx] ?? '').trim()))
    rows.push(r)
  }
  return rows
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let cur = ''
  let inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuote) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (ch === '"') {
        inQuote = false
      } else {
        cur += ch
      }
    } else {
      if (ch === '"') {
        inQuote = true
      } else if (ch === ',') {
        result.push(cur)
        cur = ''
      } else {
        cur += ch
      }
    }
  }
  result.push(cur)
  return result
}

// ─────────────────────────────────────────────
// 한글·영문 헤더 매핑 (한 정규화 함수)
// ─────────────────────────────────────────────
function normalizeRow(r: Record<string, string>): {
  date: string
  channel: string
  service: string
  impressions: number
  clicks: number
  conversions: number
  spend: number
  lead_qty: number
  has_lead_qty: boolean
} {
  const get = (...keys: string[]): string => {
    for (const k of keys) {
      const v = r[k.toLowerCase()]
      if (v != null && v !== '') return v
    }
    return ''
  }
  const has = (...keys: string[]): boolean => {
    for (const k of keys) {
      if (k.toLowerCase() in r) return true
    }
    return false
  }
  const parseNum = (s: string): number => {
    const cleaned = s.replace(/[,₩원\s"]/g, '')
    const n = Number(cleaned)
    return Number.isFinite(n) ? n : 0
  }
  return {
    date: get('date', '날짜', '일자'),
    channel: get('channel', '매체', '채널', '출처'),
    service: get('service', '서비스', '상품군') || '',
    impressions: parseNum(get('impressions', '노출수', '노출')),
    clicks: parseNum(get('clicks', '클릭수', '클릭')),
    conversions: parseNum(get('conversions', '전환수', '전환')),
    spend: parseNum(get('spend', '광고비', '비용', '총매입비')),
    lead_qty: parseNum(get('lead_qty', '매입수량', '인입수량', 'db수량')),
    has_lead_qty: has('lead_qty', '매입수량', '인입수량', 'db수량'),
  }
}

function normalizeDate(raw: string): string | null {
  if (!raw) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const m = raw.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/)
  if (m) {
    return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  }
  const d = new Date(raw)
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return null
}

// ─────────────────────────────────────────────
// 단일 시트 sync — 한 URL 처리 + ad_metrics UPSERT
//
// 처리 :
//   1) CSV fetch + 파싱 (RFC 4180)
//   2) 행 정규화 (헤더 한글/영문 alias 인식)
//   3) 매체값 정규화 (sheet_channel_alias) — 매핑 없으면 시트값 그대로 + unmapped 리스트에 추가
//   4) (date, channel, service) 사전 집계 — SUM (광고비/노출/클릭/전환/매입수량)
//   5) ad_metrics UPSERT — onConflict (site, date, channel, service)
// ─────────────────────────────────────────────
async function syncOneSheet(
  type: SourceType,
  rawUrl: string,
  site: string,
): Promise<{
  type: SourceType
  status: 'success' | 'error'
  rows: number
  message: string
  normalizedUrl?: string
  unmappedChannels?: string[]
}> {
  const url = normalizeGoogleSheetUrl(rawUrl)
  const normalizedUrl = url !== rawUrl ? url : undefined

  let csvText: string
  try {
    const res = await fetch(url, { cache: 'no-store', redirect: 'follow' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    csvText = await res.text()
    if (csvText.trim().startsWith('<') || csvText.includes('<html')) {
      throw new Error(
        '시트 공유 권한 미설정 가능성. "링크가 있는 모든 사용자 — 뷰어" 로 변경하세요.',
      )
    }
  } catch (e) {
    return {
      type,
      status: 'error',
      rows: 0,
      message: `fetch 실패: ${e instanceof Error ? e.message : String(e)}`,
      normalizedUrl,
    }
  }

  const admin = createAdminClient()

  // 매체값 정규화 매핑 로드 (시트 한글값 → channel_code)
  const { data: aliases } = await admin
    .from('sheet_channel_alias')
    .select('sheet_value, channel_code')
  const aliasMap = new Map<string, string>(
    (aliases ?? []).map((a) => [String(a.sheet_value).trim().toLowerCase(), String(a.channel_code)]),
  )

  const parsedRaw = parseCsv(csvText)
  const parsed = parsedRaw.map(normalizeRow)

  const unmappedSet = new Set<string>()

  // 행 정규화 + 매체값 매핑
  const cleanedRows = parsed
    .map((r) => ({ ...r, dateNorm: normalizeDate(r.date) }))
    .filter((r) => r.dateNorm && r.channel)
    .map((r) => {
      const original = r.channel.trim()
      const mapped = aliasMap.get(original.toLowerCase())
      if (!mapped) unmappedSet.add(original)
      return {
        date: r.dateNorm as string,
        channel: mapped ?? original,
        service: r.service,
        impressions: r.impressions,
        clicks: r.clicks,
        conversions: r.conversions,
        spend: r.spend,
        lead_qty: r.lead_qty,
      }
    })

  if (cleanedRows.length === 0) {
    const headerKeys = Object.keys(parsedRaw[0] ?? {})
    return {
      type,
      status: 'error',
      rows: 0,
      message: `CSV 행 0건 — 감지된 헤더: ${headerKeys.join(', ') || '(없음)'}`,
      normalizedUrl,
    }
  }

  // (date, channel, service) 사전 집계 — SUM
  type AggRow = (typeof cleanedRows)[number]
  const aggMap = new Map<string, AggRow>()
  for (const r of cleanedRows) {
    const key = `${r.date}|${r.channel}|${r.service}`
    const existing = aggMap.get(key)
    if (existing) {
      existing.impressions += r.impressions
      existing.clicks += r.clicks
      existing.conversions += r.conversions
      existing.spend += r.spend
      existing.lead_qty += r.lead_qty
    } else {
      aggMap.set(key, { ...r })
    }
  }

  const syncedAt = new Date().toISOString()
  const rows = Array.from(aggMap.values()).map((r) => ({
    site,
    date: r.date,
    channel: r.channel,
    service: r.service,
    impressions: r.impressions,
    clicks: r.clicks,
    conversions: r.conversions,
    spend: r.spend,
    lead_qty: r.lead_qty,
    source: type,
    synced_at: syncedAt,
  }))

  const { error: upErr } = await admin
    .from('ad_metrics')
    .upsert(rows, { onConflict: 'site,date,channel,service', ignoreDuplicates: false })

  if (upErr) {
    return {
      type,
      status: 'error',
      rows: 0,
      message: `upsert 실패: ${upErr.message}`,
      normalizedUrl,
    }
  }

  const unmapped = Array.from(unmappedSet)
  const baseMsg = `${rows.length}행 동기화 완료 (raw ${cleanedRows.length}행 집계, site=${site})`
  const message =
    unmapped.length > 0
      ? `${baseMsg} · ⚠️ 매핑 안 된 매체값 ${unmapped.length}종: ${unmapped.slice(0, 5).join(', ')}${unmapped.length > 5 ? '...' : ''}`
      : baseMsg

  return {
    type,
    status: 'success',
    rows: rows.length,
    message,
    normalizedUrl,
    unmappedChannels: unmapped.length > 0 ? unmapped : undefined,
  }
}

// ─────────────────────────────────────────────
// sync 결과를 ad_sync_config 에 기록
// ─────────────────────────────────────────────
async function recordSyncResult(
  type: SourceType,
  result: { status: 'success' | 'error'; rows: number; message: string },
): Promise<void> {
  const admin = createAdminClient()
  const fields =
    type === 'db_purchase'
      ? {
          last_synced_at: new Date().toISOString(),
          last_status: result.status,
          last_message: result.message,
        }
      : {
          last_synced_at_paid: new Date().toISOString(),
          last_status_paid: result.status,
          last_message_paid: result.message,
        }
  await admin.from('ad_sync_config').update(fields).eq('id', 1)
}

// ─────────────────────────────────────────────
// 슬랙 알림 — sync 결과 broadcast (fire-and-forget)
// ─────────────────────────────────────────────
function notifySlack(
  results: Array<{
    type: SourceType
    status: string
    rows: number
    message: string
    unmappedChannels?: string[]
  }>,
  site: string,
) {
  const lines: string[] = [`📊 *광고 시트 sync 결과 — site: \`${site}\`*`]
  for (const r of results) {
    const emoji = r.status === 'success' ? '✅' : '❌'
    const label = r.type === 'db_purchase' ? 'DB 매입' : '페이드 미디어'
    lines.push(`${emoji} ${label}: ${r.message}`)
    if (r.unmappedChannels && r.unmappedChannels.length > 0) {
      lines.push(`   ↳ 매핑 필요한 매체값 (sheet_channel_alias 추가): ${r.unmappedChannels.join(', ')}`)
    }
  }
  lines.push(
    `\n📈 <https://www.ozlabpay.kr/admin/dashboard/paid-media|광고 퍼포먼스 보기>`,
  )
  void sendToSlackChannel('alerts_warning', { text: lines.join('\n') })
}

// ─────────────────────────────────────────────
// POST — sync 실행
// ─────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const guard = await guardApi(['super_admin', 'marketing', 'admin'])
  if (!guard.ok) return guard.response

  const body = await request.json().catch(() => ({}))
  const requestedType = (body?.type ?? null) as SourceType | null

  const admin = createAdminClient()
  const { data: cfg } = await admin
    .from('ad_sync_config')
    .select('sheet_csv_url, sheet_csv_url_paid, site')
    .eq('id', 1)
    .single()

  // body.site 우선, 없으면 ad_sync_config.site, 그래도 없으면 'ozlab'
  const site = ((body?.site as string | undefined) ?? cfg?.site ?? 'ozlab').trim() || 'ozlab'

  // 처리할 시트 목록 결정
  const targets: { type: SourceType; url: string | null }[] = []
  if (!requestedType || requestedType === 'db_purchase') {
    targets.push({ type: 'db_purchase', url: cfg?.sheet_csv_url ?? null })
  }
  if (!requestedType || requestedType === 'paid_media') {
    targets.push({ type: 'paid_media', url: cfg?.sheet_csv_url_paid ?? null })
  }

  const usableTargets = targets.filter((t) => t.url)
  if (usableTargets.length === 0) {
    return NextResponse.json(
      { error: '등록된 시트 URL이 없습니다.' },
      { status: 400 },
    )
  }

  // 순차 sync (병렬보다 안전 — supabase 트래픽 제어)
  const results: Array<{
    type: SourceType
    status: 'success' | 'error'
    rows: number
    message: string
    normalizedUrl?: string
    unmappedChannels?: string[]
  }> = []
  for (const t of usableTargets) {
    const r = await syncOneSheet(t.type, t.url as string, site)
    await recordSyncResult(t.type, r)
    results.push(r)
  }

  // 슬랙 알림 (성공/실패 무관 결과 broadcast)
  notifySlack(results, site)

  const allSuccess = results.every((r) => r.status === 'success')
  return NextResponse.json(
    {
      success: allSuccess,
      results,
    },
    { status: allSuccess ? 200 : 207 },  // 207 Multi-Status (일부 실패)
  )
}
