// ─────────────────────────────────────────────
// /api/admin/ad-sync — 광고 시트 sync 설정 + 수동 sync 트리거
//
// GET   : 현재 sheet URL + 마지막 동기화 상태 조회
// PATCH : sheet URL 저장 (super_admin/marketing/admin)
// POST  : 즉시 sync 실행 (시트 CSV fetch → ad_metrics UPSERT)
//
// 지원 CSV 헤더 (한글/영문 자동 매핑):
//   date / 날짜 / 일자
//   channel / 매체 / 채널 / 출처            ← 시트 'DB 매입' 모델: 출처
//   service / 서비스 / 상품군
//   impressions / 노출수 / 노출
//   clicks / 클릭수 / 클릭
//   conversions / 전환수 / 전환
//   spend / 광고비 / 비용 / 총매입비          ← 시트 'DB 매입' 모델: 총매입비
//   lead_qty / 매입수량 / 인입수량 / db수량   ← 신규 (DB 매입 시트)
//
// URL 자동 변환:
//   https://docs.google.com/spreadsheets/d/{ID}/edit?usp=sharing  → CSV export 형태로 자동 변환
//   https://docs.google.com/spreadsheets/d/{ID}/edit#gid={GID}     → gid 보존 + CSV export
//
// source 자동 분류:
//   - 매입수량(lead_qty) 컬럼이 시트에 있으면 source='db_purchase'
//   - 없으면 source='paid_media' (페이드 미디어 광고비 시트로 가정)
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
      .select('date, channel, service, impressions, clicks, conversions, spend, lead_qty, source, synced_at')
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

// ─────────────────────────────────────────────
// Google Sheets URL 자동 변환
// ─────────────────────────────────────────────
//
// 입력 예:
//   https://docs.google.com/spreadsheets/d/{ID}/edit?usp=sharing
//   https://docs.google.com/spreadsheets/d/{ID}/edit#gid={GID}
//   https://docs.google.com/spreadsheets/d/{ID}/edit#gid={GID}&...
//
// 출력:
//   https://docs.google.com/spreadsheets/d/{ID}/export?format=csv&gid={GID|0}
//
// 이미 export?format=csv 면 그대로 사용.
function normalizeGoogleSheetUrl(url: string): string {
  if (!url) return url
  // 이미 export format이면 그대로
  if (url.includes('export?format=csv') || url.includes('out:csv')) return url

  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  if (!m) return url  // 구글 시트 형태가 아니면 변경 없이 반환

  const sheetId = m[1]
  // gid 추출 — #gid=숫자 또는 ?gid=숫자 또는 &gid=숫자
  const gidMatch = url.match(/[#?&]gid=(\d+)/)
  const gid = gidMatch ? gidMatch[1] : '0'

  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`
}

// ─────────────────────────────────────────────
// CSV 파서 — 따옴표 묶인 콤마 처리 ("30,000" 같은 값)
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

// RFC 4180 간이 파서 — 따옴표 안 콤마 보존
function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let cur = ''
  let inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuote) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"'
        i++  // escaped quote
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
// 한글·영문 컬럼명 → 정규 키 매핑
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
  has_lead_qty: boolean  // 시트에 매입수량 컬럼이 있었는지 (source 분류용)
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
    service: get('service', '서비스', '상품군') || '',  // NULL 대신 빈 문자열 — unique constraint 호환
    impressions: parseNum(get('impressions', '노출수', '노출')),
    clicks: parseNum(get('clicks', '클릭수', '클릭')),
    conversions: parseNum(get('conversions', '전환수', '전환')),
    spend: parseNum(get('spend', '광고비', '비용', '총매입비')),
    lead_qty: parseNum(get('lead_qty', '매입수량', '인입수량', 'db수량')),
    has_lead_qty: has('lead_qty', '매입수량', '인입수량', 'db수량'),
  }
}

// ─────────────────────────────────────────────
// 날짜 정규화 — "2026-03-30" / "2026.3.30" / "2026/3/30" 등 → ISO YYYY-MM-DD
// ─────────────────────────────────────────────
function normalizeDate(raw: string): string | null {
  if (!raw) return null
  // ISO 그대로
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  // YYYY.M.D or YYYY/M/D
  const m = raw.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/)
  if (m) {
    const yyyy = m[1]
    const mm = m[2].padStart(2, '0')
    const dd = m[3].padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }
  // Date 파싱 시도 (최후)
  const d = new Date(raw)
  if (!Number.isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10)
  }
  return null
}

export async function POST() {
  const guard = await guardApi(['super_admin', 'marketing', 'admin'])
  if (!guard.ok) return guard.response

  const admin = createAdminClient()
  const { data: cfg } = await admin.from('ad_sync_config').select('sheet_csv_url').eq('id', 1).single()
  const rawUrl = cfg?.sheet_csv_url
  if (!rawUrl) {
    return NextResponse.json({ error: '먼저 sheet_csv_url 을 등록하세요.' }, { status: 400 })
  }

  // edit URL 등을 export?format=csv 로 자동 변환
  const url = normalizeGoogleSheetUrl(rawUrl)

  let csvText: string
  try {
    const res = await fetch(url, { cache: 'no-store', redirect: 'follow' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    csvText = await res.text()
    // HTML 응답 감지 (공유 권한 없을 때 발생)
    if (csvText.trim().startsWith('<') || csvText.includes('<html')) {
      throw new Error('시트 공유 권한 미설정 가능성. "링크가 있는 모든 사용자 - 뷰어" 로 변경하세요.')
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await admin.from('ad_sync_config').update({
      last_synced_at: new Date().toISOString(),
      last_status: 'error',
      last_message: `fetch 실패: ${msg}`,
    }).eq('id', 1)
    return NextResponse.json({ error: `시트 fetch 실패: ${msg}` }, { status: 500 })
  }

  const parsed = parseCsv(csvText).map(normalizeRow)

  // 시트가 DB 매입 모델인지 페이드 미디어 모델인지 자동 판단
  const isDbPurchaseSheet = parsed.length > 0 && parsed[0].has_lead_qty
  const sourceTag = isDbPurchaseSheet ? 'db_purchase' : 'paid_media'

  // 날짜 정규화 + 유효성 필터
  const rows = parsed
    .map((r) => ({ ...r, dateNorm: normalizeDate(r.date) }))
    .filter((r) => r.dateNorm && r.channel)
    .map((r) => ({
      date: r.dateNorm as string,
      channel: r.channel,
      service: r.service,
      impressions: r.impressions,
      clicks: r.clicks,
      conversions: r.conversions,
      spend: r.spend,
      lead_qty: r.lead_qty,
      source: sourceTag,
      synced_at: new Date().toISOString(),
    }))

  if (rows.length === 0) {
    await admin.from('ad_sync_config').update({
      last_synced_at: new Date().toISOString(),
      last_status: 'error',
      last_message: `CSV 행 0건 — 헤더 확인 필요. 감지된 헤더: ${Object.keys(parseCsv(csvText)[0] ?? {}).join(', ') || '(없음)'}`,
    }).eq('id', 1)
    return NextResponse.json({ error: 'CSV 행 0건' }, { status: 400 })
  }

  // UPSERT (date, channel, service)
  const { error: upErr } = await admin
    .from('ad_metrics')
    .upsert(rows, { onConflict: 'date,channel,service', ignoreDuplicates: false })

  if (upErr) {
    await admin.from('ad_sync_config').update({
      last_synced_at: new Date().toISOString(),
      last_status: 'error',
      last_message: `upsert 실패: ${upErr.message}`,
    }).eq('id', 1)
    return NextResponse.json({ error: upErr.message }, { status: 500 })
  }

  await admin.from('ad_sync_config').update({
    last_synced_at: new Date().toISOString(),
    last_status: 'success',
    last_message: `${rows.length}행 동기화 완료 (${sourceTag})`,
  }).eq('id', 1)

  return NextResponse.json({
    success: true,
    rows: rows.length,
    source: sourceTag,
    normalizedUrl: url !== rawUrl ? url : undefined,
  })
}
