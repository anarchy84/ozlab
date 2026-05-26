// ─────────────────────────────────────────────
// /api/admin/products/bulk — 상품 대량 업로드 (CSV 기반)
//
// 권한 : super_admin / admin / marketer
//
// 흐름 :
//   1) 클라이언트에서 CSV 파싱 → rows 배열로 POST
//   2) dry_run=true 면 DB 변경 X, 행별 검증 결과만 반환 (미리보기)
//   3) 사용자 확인 후 dry_run=false 로 재호출 → 실제 upsert
//
// 동작 :
//   - code 기준 upsert (있으면 update, 없으면 insert)
//   - 모르는 카테고리는 product_categories 에 자동 INSERT (auto_create_category)
//   - 행별 결과 + 요약 반환
// ─────────────────────────────────────────────

import { createAdminClient } from '@/lib/supabase/admin'
import { guardApi } from '@/lib/admin/auth-helpers'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const MAX_ROWS = 1000

interface InputRow {
  code?: string
  label?: string
  category?: string
  vendor?: string | null
  default_amount?: string | number | null
  default_commission?: string | number | null
  customer_price?: string | number | null
  device_cost?: string | number | null
  default_period?: string | null
  is_subscription?: string | boolean | number | null
  default_monthly?: string | number | null
  sort_order?: string | number | null
  note?: string | null
  // 한글 헤더 (담당자가 채우는 양식)
  '상품 이름'?: string
  '상품이름'?: string
  '이름'?: string
  '분류'?: string
  '카테고리'?: string
  '공급 회사'?: string
  '공급회사'?: string
  '본사'?: string
  '회사'?: string
  '고객 가격'?: string | number
  '고객가격'?: string | number
  '가격'?: string | number
  '우리 수당'?: string | number
  '우리수당'?: string | number
  '수당'?: string | number
  '기기 값'?: string | number
  '기기값'?: string | number
  '기기 매입가'?: string | number
  '약정 기간'?: string
  '약정기간'?: string
  '약정'?: string
  '월 정기 결제'?: string
  '월정기결제'?: string
  '월결제'?: string
  '메모'?: string
  '비고'?: string
}

// 한글 분류값 → 영문 category code 매핑
const KO_CATEGORY: Record<string, string> = {
  '인터넷': 'internet',
  'cctv': 'cctv',
  'CCTV': 'cctv',
  '키오스크': 'kiosk',
  '테이블오더': 'tableorder',
  '테오': 'tableorder',
  '단말기': 'pos',
  'POS': 'pos',
  '기타': 'etc',
}

// 한글 약정 → 영문 default_period 매핑
const KO_PERIOD: Record<string, string> = {
  '1년': '12개월',
  '2년': '24개월',
  '3년': '36개월',
  '4년': '48개월',
  '없음': '없음',
  '': '',
}

// 행에서 컬럼 값 가져오기 — 영문/한글 동의어 모두 시도
function pick(r: InputRow, ...keys: string[]): unknown {
  for (const k of keys) {
    const v = (r as Record<string, unknown>)[k]
    if (v !== null && v !== undefined && v !== '') return v
  }
  return undefined
}

// label 에서 자동 code 생성 (한글 양식엔 code 컬럼 없음)
function makeCodeFromLabel(label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[가-힣]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (slug.length >= 3) return slug
  // 한글만 있는 경우 → 타임스탬프 기반
  return 'p-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6)
}

interface BulkBody {
  rows: InputRow[]
  dry_run?: boolean
  auto_create_category?: boolean
}

interface RowResult {
  row_idx: number          // CSV 기준 (헤더 제외, 1-based)
  code: string
  label: string
  category: string
  action: 'insert' | 'update' | 'skip' | 'error'
  message?: string
  new_category?: boolean
}

const PERIOD_ALLOWED = ['', '없음', '12개월', '24개월', '36개월', '48개월']

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(String(v).replace(/[, ]/g, ''))
  return Number.isFinite(n) ? n : null
}

function toBool(v: unknown): boolean {
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v !== 0
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase()
    return s === 'true' || s === '1' || s === 'y' || s === 'yes' || s === 'o'
  }
  return false
}

function cleanStr(v: unknown, max = 200): string {
  if (v === null || v === undefined) return ''
  return String(v).trim().slice(0, max)
}

export async function POST(req: NextRequest) {
  const guard = await guardApi(['super_admin', 'admin', 'marketer'])
  if (!guard.ok) return guard.response

  let body: BulkBody
  try {
    body = (await req.json()) as BulkBody
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 })
  }

  const rows = Array.isArray(body.rows) ? body.rows : []
  const dryRun = body.dry_run !== false   // 기본 true (안전)
  const autoCreateCategory = body.auto_create_category !== false

  if (rows.length === 0) {
    return NextResponse.json({ error: '업로드할 행이 없습니다.' }, { status: 400 })
  }
  if (rows.length > MAX_ROWS) {
    return NextResponse.json(
      { error: `한 번에 최대 ${MAX_ROWS}건까지만 업로드 가능합니다.` },
      { status: 400 }
    )
  }

  const admin = createAdminClient()

  // 기존 product code 셋 (update vs insert 판별용)
  const { data: existingProducts, error: pErr } = await admin
    .from('products')
    .select('code')
  if (pErr) {
    return NextResponse.json({ error: pErr.message }, { status: 500 })
  }
  const existingCodes = new Set((existingProducts ?? []).map((p) => p.code))

  // 기존 카테고리 셋 (자동 생성 판별용)
  const { data: existingCats } = await admin
    .from('product_categories')
    .select('code')
  const existingCatCodes = new Set((existingCats ?? []).map((c) => c.code))

  // 신규로 생기게 될 카테고리 (한 번만 INSERT)
  const newCategoriesInBatch = new Set<string>()

  const results: RowResult[] = []
  const productsToInsert: Array<Record<string, unknown>> = []
  const productsToUpdate: Array<{ code: string; data: Record<string, unknown> }> = []

  rows.forEach((r, i) => {
    const idx = i + 1
    // 영문/한글 동의어 모두 인식
    const label = cleanStr(pick(r, 'label', '상품 이름', '상품이름', '이름'), 200)
    let code = cleanStr(pick(r, 'code'), 60)
    // code 비어있으면 label 에서 자동 생성
    if (!code && label) code = makeCodeFromLabel(label)

    // category — 한글이면 영문 코드로 변환
    const categoryRaw = cleanStr(pick(r, 'category', '분류', '카테고리'), 60)
    const category = KO_CATEGORY[categoryRaw] ?? categoryRaw.toLowerCase()

    // 검증
    if (!code) {
      results.push({ row_idx: idx, code, label, category, action: 'error', message: '상품 코드 또는 상품 이름이 비어 있음' })
      return
    }
    if (!label) {
      results.push({ row_idx: idx, code, label, category, action: 'error', message: '상품 이름이 비어 있음' })
      return
    }
    if (!category) {
      results.push({ row_idx: idx, code, label, category, action: 'error', message: '분류(카테고리)가 비어 있음' })
      return
    }
    // 약정 — 한글이면 영문 매핑
    const periodRaw = cleanStr(pick(r, 'default_period', '약정 기간', '약정기간', '약정'), 20)
    const period = KO_PERIOD[periodRaw] ?? periodRaw
    if (period && !PERIOD_ALLOWED.includes(period)) {
      results.push({
        row_idx: idx, code, label, category,
        action: 'error',
        message: `약정 기간은 ${PERIOD_ALLOWED.filter(Boolean).join('/')} 중 하나`,
      })
      return
    }

    // 카테고리 처리
    let willCreateCategory = false
    if (!existingCatCodes.has(category) && !newCategoriesInBatch.has(category)) {
      if (!autoCreateCategory) {
        results.push({
          row_idx: idx, code, label, category,
          action: 'error',
          message: `카테고리 "${category}" 가 등록되지 않음`,
        })
        return
      }
      newCategoriesInBatch.add(category)
      willCreateCategory = true
    }

    // 액션 결정
    const action: 'insert' | 'update' = existingCodes.has(code) ? 'update' : 'insert'

    const vendorVal       = cleanStr(pick(r, 'vendor', '공급 회사', '공급회사', '본사', '회사'), 40) || null
    const customerPriceVal = toNumber(pick(r, 'customer_price', '고객 가격', '고객가격', '가격'))
    const commissionVal    = toNumber(pick(r, 'default_commission', '우리 수당', '우리수당', '수당'))
    const deviceCostVal    = toNumber(pick(r, 'device_cost', '기기 값', '기기값', '기기 매입가'))
    const noteVal          = cleanStr(pick(r, 'note', '메모', '비고'), 500) || null
    const isSubVal         = toBool(pick(r, 'is_subscription', '월 정기 결제', '월정기결제', '월결제'))
    const defaultMonthly   = toNumber(pick(r, 'default_monthly'))
    // 월 정기 결제이면 customer_price 를 default_monthly 로도 자동 세팅
    const finalMonthly     = defaultMonthly ?? (isSubVal ? customerPriceVal : null)

    const payload: Record<string, unknown> = {
      code,
      label,
      category,
      vendor: vendorVal,
      default_amount: toNumber(r.default_amount),
      default_commission: commissionVal,
      customer_price: customerPriceVal,
      device_cost: deviceCostVal,
      default_period: period || null,
      is_subscription: isSubVal,
      default_monthly: finalMonthly,
      sort_order: toNumber(r.sort_order) ?? 0,
      note: noteVal,
    }

    if (action === 'insert') {
      productsToInsert.push({
        ...payload,
        is_active: true,
        created_by: guard.profile.user_id,
      })
    } else {
      productsToUpdate.push({ code, data: payload })
    }

    results.push({
      row_idx: idx, code, label, category, action,
      ...(willCreateCategory ? { new_category: true } : {}),
    })
  })

  const summary = {
    total: rows.length,
    insert: results.filter((r) => r.action === 'insert').length,
    update: results.filter((r) => r.action === 'update').length,
    error: results.filter((r) => r.action === 'error').length,
    new_categories: [...newCategoriesInBatch],
  }

  // dry_run 이면 검증 결과만 반환
  if (dryRun) {
    return NextResponse.json({ dry_run: true, results, summary })
  }

  // 실제 저장 — 에러가 한 건이라도 있으면 전체 거부 (안전)
  if (summary.error > 0) {
    return NextResponse.json(
      { error: '에러가 있는 행이 포함되어 있습니다. dry_run 으로 확인 후 다시 시도하세요.', results, summary },
      { status: 400 }
    )
  }

  // 1) 신규 카테고리 INSERT
  if (newCategoriesInBatch.size > 0) {
    const catRows = [...newCategoriesInBatch].map((c) => ({
      code: c,
      label: c,           // 일단 code 와 동일 — 어드민에서 수정 가능
      sort_order: 999,
      is_active: true,
    }))
    const { error: catErr } = await admin
      .from('product_categories')
      .insert(catRows)
    if (catErr) {
      return NextResponse.json(
        { error: `카테고리 자동 생성 실패: ${catErr.message}` },
        { status: 500 }
      )
    }
  }

  // 2) products INSERT (대량)
  if (productsToInsert.length > 0) {
    const { error: insErr } = await admin
      .from('products')
      .insert(productsToInsert)
    if (insErr) {
      return NextResponse.json(
        { error: `상품 INSERT 실패: ${insErr.message}` },
        { status: 500 }
      )
    }
  }

  // 3) products UPDATE — 행별 (Supabase 는 bulk update 제한적)
  for (const u of productsToUpdate) {
    const { error: updErr } = await admin
      .from('products')
      .update(u.data)
      .eq('code', u.code)
    if (updErr) {
      return NextResponse.json(
        { error: `상품 UPDATE 실패 (code=${u.code}): ${updErr.message}`, results, summary },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({ success: true, results, summary })
}
