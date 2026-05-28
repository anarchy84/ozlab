// ─────────────────────────────────────────────
// /api/admin/products/sync — 상품표 시트 sync
//
// 흐름 :
//   GET    : 현재 sheet_csv_url + 마지막 sync 결과
//   PATCH  : URL 저장 (body: { sheet_csv_url })
//   POST   : sync 실행 — CSV fetch → 파싱 → bulk upsert
//             body: { dry_run?: boolean }  (default false = 실제 적용)
//
// 표준 헤더 (한글, 누가 봐도 쉽게):
//   상품 이름 / 분류 / 공급사 / 원가 / 우리 수당 / 고객 가격 /
//   약정 기간 / 월 정기 결제 / 월 결제 금액 / 단말기 종류 / 메모
//
// 호환 헤더 (자동 인식):
//   - NIT 양식: 품목명/품목군/공급사/판매가(기본)/제품설명 등
//   - 네이버 렌탈표: 상품구성/구성/단가/렌탈가/일시불/비고
//
// 무시 컬럼:
//   여신협회인증여부/인증일/인증만료일/NO (사용자 결정으로 미사용)
// ─────────────────────────────────────────────

import { createAdminClient } from '@/lib/supabase/admin'
import { guardApi } from '@/lib/admin/auth-helpers'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// ─────────────────────────────────────────────
// GET — 현재 설정 + 마지막 sync 결과
// ─────────────────────────────────────────────
export async function GET() {
  const guard = await guardApi(['super_admin', 'admin', 'marketer', 'marketing'])
  if (!guard.ok) return guard.response

  const admin = createAdminClient()
  const { data: config } = await admin
    .from('product_sync_config')
    .select('*')
    .eq('id', 1)
    .single()

  // 최근 상품 5건 (참고용)
  const { data: recent } = await admin
    .from('products')
    .select('code, label, category, vendor, customer_price, device_cost, updated_at')
    .order('updated_at', { ascending: false })
    .limit(10)

  return NextResponse.json({
    config: config ?? null,
    recent: recent ?? [],
  })
}

// ─────────────────────────────────────────────
// PATCH — URL 저장
// ─────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const guard = await guardApi(['super_admin', 'admin', 'marketer', 'marketing'])
  if (!guard.ok) return guard.response

  const body = await req.json().catch(() => ({}))
  const sheet_csv_url = typeof body?.sheet_csv_url === 'string' ? body.sheet_csv_url : null

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('product_sync_config')
    .update({ sheet_csv_url: sheet_csv_url || null, updated_at: new Date().toISOString() })
    .eq('id', 1)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// ─────────────────────────────────────────────
// Google Sheets URL 자동 변환 (edit → CSV export)
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
// CSV 파서 (RFC 4180 호환)
// ─────────────────────────────────────────────
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/\r/g, '').split('\n')
  if (lines.length < 2) return []
  const headers = parseCsvLine(lines[0]).map((h) => h.trim())
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

// ─────────────────────────────────────────────
// POST — sync 실행
// ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const guard = await guardApi(['super_admin', 'admin', 'marketer', 'marketing'])
  if (!guard.ok) return guard.response

  const body = await req.json().catch(() => ({}))
  const dryRun = body?.dry_run === true

  const admin = createAdminClient()
  const { data: cfg } = await admin
    .from('product_sync_config')
    .select('sheet_csv_url')
    .eq('id', 1)
    .single()

  if (!cfg?.sheet_csv_url) {
    return NextResponse.json(
      { error: '시트 URL이 등록되지 않았습니다. 먼저 URL을 저장하세요.' },
      { status: 400 },
    )
  }

  const url = normalizeGoogleSheetUrl(cfg.sheet_csv_url)

  // CSV fetch
  let csvText: string
  try {
    const res = await fetch(url, { cache: 'no-store', redirect: 'follow' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    csvText = await res.text()
    if (csvText.trim().startsWith('<') || csvText.includes('<html')) {
      throw new Error('시트 공유 권한 미설정. "링크가 있는 모든 사용자 — 뷰어" 로 변경하세요.')
    }
  } catch (e) {
    const message = `fetch 실패: ${e instanceof Error ? e.message : String(e)}`
    await recordResult({ status: 'error', message })
    return NextResponse.json({ error: message }, { status: 500 })
  }

  const rows = parseCsv(csvText)
  if (rows.length === 0) {
    const message = 'CSV 행 0건 — 시트가 비어 있거나 헤더만 있음'
    await recordResult({ status: 'error', message })
    return NextResponse.json({ error: message }, { status: 400 })
  }

  // bulk API 의 InputRow 와 호환 — 한글 헤더 그대로 전달 (bulk 내부에서 매핑)
  // 단, 인증 컬럼은 미리 제거 (NIT 양식에 있음)
  const cleanRows = rows.map((r) => {
    const cleaned = { ...r }
    delete cleaned['여신협회인증여부']
    delete cleaned['인증일']
    delete cleaned['인증만료일']
    delete cleaned['NO']
    return cleaned
  })

  // bulk API 호출 (내부 호출 — fetch 대신 직접 함수 호출이 더 효율적이지만, 일관성 위해 fetch 사용)
  // 단, NextRequest 같은 인증 컨텍스트 전달 어려움 → 직접 bulk 로직을 import 해서 호출하는 게 더 안정적이지만
  //   여기서는 단순성을 위해 raw 데이터로 직접 처리
  // → 더 안전한 방식: bulk 로직을 lib/admin/products-bulk.ts 로 분리. 일단은 fetch 패턴.

  // 직접 fetch 로 bulk POST
  const bulkUrl = new URL('/api/admin/products/bulk', req.url).toString()
  const cookie = req.headers.get('cookie') ?? ''
  const bulkRes = await fetch(bulkUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie,  // 인증 세션 전달
    },
    body: JSON.stringify({
      rows: cleanRows,
      dry_run: dryRun,
      auto_create_category: true,
    }),
  })

  const bulkResult = await bulkRes.json().catch(() => ({}))

  // bulk 결과 요약 — bulk API 는 summary { total, insert, update, error } 반환
  const summary = bulkResult?.summary ?? {}
  const inserted = Number(summary.insert ?? 0)
  const updated  = Number(summary.update ?? 0)
  const errors   = Number(summary.error  ?? 0)

  if (!bulkRes.ok) {
    // bulk 가 400 반환 (에러 행 포함된 경우) — 에러 결과만 기록 후 클라이언트에 그대로 전달
    const message = bulkResult?.error
      ? `bulk 처리 실패: ${bulkResult.error}`
      : `bulk 처리 실패 (status ${bulkRes.status})`
    await recordResult({
      status: 'error',
      message,
      rows_processed: rows.length,
      rows_inserted: inserted,
      rows_updated: updated,
      rows_error: errors,
    })
    return NextResponse.json(
      { error: message, dry_run: dryRun, summary: { rows: rows.length, inserted, updated, errors }, bulkResult },
      { status: bulkRes.status },
    )
  }

  const message = dryRun
    ? `[DRY RUN] ${rows.length}행 검증 완료 (insert ${inserted} / update ${updated} / error ${errors})`
    : `${rows.length}행 동기화 완료 (insert ${inserted} / update ${updated} / error ${errors})`

  // 결과 기록 (dry_run 도 기록 — 사용자가 마지막으로 시도한 상태 보임)
  await recordResult({
    status: errors === 0 ? 'success' : 'error',
    message,
    rows_processed: rows.length,
    rows_inserted: inserted,
    rows_updated: updated,
    rows_error: errors,
  })

  return NextResponse.json({
    success: errors === 0,
    dry_run: dryRun,
    message,
    summary: { rows: rows.length, inserted, updated, errors },
    bulkResult,
  })

  // ─────────────────────────────────────────────
  // 결과 기록 헬퍼 (closure)
  // ─────────────────────────────────────────────
  async function recordResult(r: {
    status: 'success' | 'error'
    message: string
    rows_processed?: number
    rows_inserted?: number
    rows_updated?: number
    rows_error?: number
  }) {
    await admin
      .from('product_sync_config')
      .update({
        last_synced_at: new Date().toISOString(),
        last_status: r.status,
        last_message: r.message,
        rows_processed: r.rows_processed ?? 0,
        rows_inserted: r.rows_inserted ?? 0,
        rows_updated: r.rows_updated ?? 0,
        rows_error: r.rows_error ?? 0,
      })
      .eq('id', 1)
  }
}
