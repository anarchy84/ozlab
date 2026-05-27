// ─────────────────────────────────────────────────────────────
// 우리편 시트 → ad_metrics 일괄 마이그레이션 (1회성)
//
// 이 데이터는 ‘우리편’ 사이트 데이터이며,
// site='wooripen' 으로 ad_metrics 에 저장된다.
// 오즈랩 본격 운영 시작 후 :
//   DELETE FROM ad_metrics WHERE site = 'wooripen';
// 한 줄로 정리할 수 있다.
//
// 대상 :
//   - _서비스분류 탭 (4,466행 → 매체×서비스 집계 후 ad_metrics) — source='paid_media'
//   - 외부디비 탭 (117행 → 출처×날짜) — source='db_purchase'
//
// 사용법 :
//   1. SHEET_URL_SERVICE / SHEET_URL_EXTERNAL_DB 환경변수 설정 (각 탭 CSV export URL)
//   2. .env.local 에 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 설정
//   3. npx tsx scripts/migrate_wooripen_sheet.ts
//   4. --dry-run 옵션으로 검증만 수행 (DB write 없음)
//
// 검증 :
//   2026-04: 페이드 광고비 22,963,780 / 디비 513건
//   2026-04: 외부DB 매입 517건 / 15,510,000원
//   2026-05: 페이드 광고비 285,991 / 디비 7건
//   2026-05: 외부DB 매입 272건 / 8,160,000원
// ─────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

// ─────────────────────────────────────────────
// 환경변수 + CLI 옵션
// ─────────────────────────────────────────────
const DRY_RUN = process.argv.includes('--dry-run')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SHEET_URL_SERVICE = process.env.SHEET_URL_SERVICE
const SHEET_URL_EXTERNAL_DB = process.env.SHEET_URL_EXTERNAL_DB

// site 값 — 우리편 시트 데이터는 site='wooripen' 으로 저장.
// 오즈랩 본격 운영 시작 후 DELETE WHERE site='wooripen' 한 줄로 정리.
const SITE = (process.env.SITE ?? 'wooripen').trim() || 'wooripen'

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경변수 미설정')
  process.exit(1)
}

if (!SHEET_URL_SERVICE || !SHEET_URL_EXTERNAL_DB) {
  console.error(`
❌ 시트 URL 환경변수 미설정

다음 환경변수를 .env.local 또는 export 로 설정 :

  SHEET_URL_SERVICE        : "_서비스분류" 탭의 CSV export URL
  SHEET_URL_EXTERNAL_DB    : "외부디비" 탭의 CSV export URL

각 탭의 gid 확인 방법 :
  1) 시트 열기 → 해당 탭 클릭
  2) 브라우저 주소창 URL 끝의 "#gid=숫자" 복사
  3) CSV URL 조립 :
     https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv&gid={gid}

예시 (우리편 시트) :
  SHEET_URL_SERVICE="https://docs.google.com/spreadsheets/d/1tHMGXEjhH-mFOsonG3ReFqiRng9K2E6FLd3fjsl6K0E/export?format=csv&gid=XXXXXXX"
`)
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// ─────────────────────────────────────────────
// CSV 파서 (RFC 4180)
// ─────────────────────────────────────────────
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
      if (ch === '"') inQuote = true
      else if (ch === ',') {
        result.push(cur)
        cur = ''
      } else cur += ch
    }
  }
  result.push(cur)
  return result
}

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

// ─────────────────────────────────────────────
// 날짜 정규화
// ─────────────────────────────────────────────
function normalizeDate(raw: string): string | null {
  if (!raw) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const m = raw.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})\.?$/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  const d = new Date(raw)
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return null
}

function parseNum(s: string): number {
  const cleaned = (s ?? '').replace(/[,₩원\s"]/g, '')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : 0
}

// ─────────────────────────────────────────────
// 1) _서비스분류 탭 처리 (paid_media)
// ─────────────────────────────────────────────
async function importServiceClassified(): Promise<void> {
  console.log('\n📊 [1/2] _서비스분류 탭 import 시작')

  const res = await fetch(SHEET_URL_SERVICE!, { cache: 'no-store', redirect: 'follow' })
  if (!res.ok) throw new Error(`fetch 실패: HTTP ${res.status}`)
  const csv = await res.text()
  if (csv.trim().startsWith('<')) {
    throw new Error('시트 공유 권한 미설정 — "링크가 있는 모든 사용자" 로 변경 필요')
  }

  const rawRows = parseCsv(csv)
  console.log(`  CSV 파싱: ${rawRows.length}행`)

  // sheet_channel_alias 로드
  const { data: aliases } = await supabase.from('sheet_channel_alias').select('sheet_value, channel_code')
  const aliasMap = new Map((aliases ?? []).map((a) => [a.sheet_value.trim().toLowerCase(), a.channel_code]))

  // 행 정규화
  type NormRow = {
    date: string
    channel: string
    service: string
    impressions: number
    clicks: number
    conversions: number
    spend: number
  }

  const normalized: NormRow[] = []
  const unmappedChannels = new Set<string>()

  for (const r of rawRows) {
    const date = normalizeDate(r['날짜'] || r['date'] || '')
    const sheetChannel = (r['매체'] || r['channel'] || '').trim()
    if (!date || !sheetChannel) continue

    const channel = aliasMap.get(sheetChannel.toLowerCase()) ?? sheetChannel
    if (!aliasMap.has(sheetChannel.toLowerCase())) {
      unmappedChannels.add(sheetChannel)
    }

    normalized.push({
      date,
      channel,
      service: (r['서비스'] || r['service'] || '').trim(),
      impressions: parseNum(r['노출수'] || r['노출'] || ''),
      clicks: parseNum(r['클릭수'] || r['클릭'] || ''),
      conversions: parseNum(r['전환수'] || r['전환'] || ''),
      spend: parseNum(r['광고비'] || r['비용'] || ''),
    })
  }

  // 사전 집계
  const aggMap = new Map<string, NormRow & { lead_qty: number; source: string; synced_at: string; site: string }>()
  for (const r of normalized) {
    const key = `${r.date}|${r.channel}|${r.service}`
    const existing = aggMap.get(key)
    if (existing) {
      existing.impressions += r.impressions
      existing.clicks += r.clicks
      existing.conversions += r.conversions
      existing.spend += r.spend
    } else {
      aggMap.set(key, {
        ...r,
        lead_qty: 0,
        source: 'paid_media',
        synced_at: new Date().toISOString(),
        site: SITE,
      })
    }
  }
  const aggregated = Array.from(aggMap.values())

  console.log(`  정규화 후: ${normalized.length}행`)
  console.log(`  (date×channel×service) 집계 후: ${aggregated.length}행`)

  if (unmappedChannels.size > 0) {
    console.warn(`\n  ⚠️ 매핑 안 된 매체값:`)
    for (const ch of unmappedChannels) console.warn(`     - "${ch}"`)
  }

  // 월별 합계 검증
  const monthly = new Map<string, { spend: number; conv: number }>()
  for (const r of aggregated) {
    const m = r.date.slice(0, 7)
    const cur = monthly.get(m) ?? { spend: 0, conv: 0 }
    cur.spend += r.spend
    cur.conv += r.conversions
    monthly.set(m, cur)
  }
  console.log(`\n  📈 월별 합계 (검증):`)
  for (const [m, v] of [...monthly.entries()].sort()) {
    console.log(`     ${m}: 광고비 ${v.spend.toLocaleString()}원 / 전환(DB) ${v.conv}건`)
  }

  if (DRY_RUN) {
    console.log(`\n  ✅ DRY RUN — DB write 생략 (${aggregated.length}행)`)
    return
  }

  // UPSERT
  const { error } = await supabase
    .from('ad_metrics')
    .upsert(aggregated, { onConflict: 'site,date,channel,service', ignoreDuplicates: false })

  if (error) throw new Error(`upsert 실패: ${error.message}`)
  console.log(`\n  ✅ ad_metrics UPSERT 완료: ${aggregated.length}행 (site='${SITE}')`)
}

// ─────────────────────────────────────────────
// 2) 외부디비 탭 처리 (db_purchase)
// ─────────────────────────────────────────────
async function importExternalDb(): Promise<void> {
  console.log('\n📊 [2/2] 외부디비 탭 import 시작')

  const res = await fetch(SHEET_URL_EXTERNAL_DB!, { cache: 'no-store', redirect: 'follow' })
  if (!res.ok) throw new Error(`fetch 실패: HTTP ${res.status}`)
  const csv = await res.text()

  const rawRows = parseCsv(csv)
  console.log(`  CSV 파싱: ${rawRows.length}행`)

  type DbRow = {
    site: string
    date: string
    channel: string
    service: string
    lead_qty: number
    spend: number
    impressions: number
    clicks: number
    conversions: number
    source: string
    synced_at: string
  }

  const rows: DbRow[] = []
  for (const r of rawRows) {
    const date = normalizeDate(r['날짜'] || '')
    const sheetSource = (r['출처'] || '').trim()
    if (!date || !sheetSource) continue

    // 출처 → channel_code 매핑 (예: '토스 스프레드' / '토스 프리미엄')
    // db_purchase 매체는 시트값 그대로 (별도 alias 불필요)
    const channel = sheetSource

    rows.push({
      site: SITE,
      date,
      channel,
      service: '',  // 외부디비는 service 분류 없음
      lead_qty: parseNum(r['매입수량'] || ''),
      spend: parseNum(r['총매입비'] || ''),
      impressions: 0,
      clicks: 0,
      conversions: 0,
      source: 'db_purchase',
      synced_at: new Date().toISOString(),
    })
  }

  // 월별 검증
  const monthly = new Map<string, { qty: number; cost: number }>()
  for (const r of rows) {
    const m = r.date.slice(0, 7)
    const cur = monthly.get(m) ?? { qty: 0, cost: 0 }
    cur.qty += r.lead_qty
    cur.cost += r.spend
    monthly.set(m, cur)
  }
  console.log(`\n  📈 월별 합계 (검증):`)
  for (const [m, v] of [...monthly.entries()].sort()) {
    console.log(`     ${m}: 매입수량 ${v.qty}건 / 매입비 ${v.cost.toLocaleString()}원`)
  }

  if (DRY_RUN) {
    console.log(`\n  ✅ DRY RUN — DB write 생략 (${rows.length}행)`)
    return
  }

  const { error } = await supabase
    .from('ad_metrics')
    .upsert(rows, { onConflict: 'site,date,channel,service', ignoreDuplicates: false })

  if (error) throw new Error(`upsert 실패: ${error.message}`)
  console.log(`\n  ✅ ad_metrics UPSERT 완료: ${rows.length}행 (site='${SITE}')`)
}

// ─────────────────────────────────────────────
// 메인
// ─────────────────────────────────────────────
async function main() {
  console.log('━'.repeat(60))
  console.log('우리편 시트 → ozlab ad_metrics 일괄 마이그레이션')
  console.log(`모드: ${DRY_RUN ? '🧪 DRY RUN' : '🚀 PROD WRITE'}  /  site='${SITE}'`)
  console.log('━'.repeat(60))

  await importServiceClassified()
  await importExternalDb()

  console.log('\n━'.repeat(30))
  console.log('✅ 완료')
  console.log('━'.repeat(30))

  console.log(`
다음 단계 :
  1. /admin/dashboard/paid-media 에서 4월/5월 데이터 표시 확인
  2. 시트 합계와 비교 :
     - 4월 페이드 광고비 22,963,780 / 전환 513건
     - 4월 외부DB 매입 517건 / 15,510,000원
     - 5월 페이드 광고비 285,991 / 전환 7건
     - 5월 외부DB 매입 272건 / 8,160,000원
`)
}

main().catch((err) => {
  console.error('\n❌ 실패:', err)
  process.exit(1)
})
