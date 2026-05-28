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
  // 한글 헤더 (담당자가 채우는 표준 양식 + 공급사별 변형)
  // === 상품 이름 ===
  '상품 이름'?: string
  '상품이름'?: string
  '이름'?: string
  '상품명'?: string
  '품목명'?: string         // NIT 양식
  '상품구성'?: string        // 네이버 렌탈표
  // === 분류 / 카테고리 ===
  '분류'?: string
  '카테고리'?: string
  '품목군'?: string          // NIT 양식
  '구성'?: string            // 네이버 렌탈표
  // === 공급사 ===
  '공급 회사'?: string
  '공급회사'?: string
  '공급사'?: string          // NIT 양식
  '본사'?: string
  '회사'?: string
  '제조사'?: string
  // === 고객 판매 가격 ===
  '고객 가격'?: string | number
  '고객가격'?: string | number
  '가격'?: string | number
  '판매가'?: string | number
  '판매가격'?: string | number
  '일시불'?: string | number  // 네이버 렌탈표 (단발 결제)
  // === 우리 수당 (마진) ===
  '우리 수당'?: string | number
  '우리수당'?: string | number
  '수당'?: string | number
  '마진'?: string | number
  // === 원가 (부가세 포함, 우리가 사오는 가격) ===
  '기기 값'?: string | number
  '기기값'?: string | number
  '기기 매입가'?: string | number
  '원가'?: string | number
  '단가'?: string | number       // 네이버 렌탈표 (원가, 부가세 포함)
  '렌탈가'?: string | number     // 네이버 렌탈표 (원가, 부가세 포함)
  '매입가'?: string | number
  '판매가\n(기본)'?: string | number  // NIT 양식 (개행 포함)
  '판매가(기본)'?: string | number
  // === 약정 ===
  '약정 기간'?: string
  '약정기간'?: string
  '약정'?: string
  '계약 기간'?: string
  // === 월 정기 결제 ===
  '월 정기 결제'?: string
  '월정기결제'?: string
  '월결제'?: string
  '정기결제'?: string
  '월 결제 금액'?: string | number
  '월결제금액'?: string | number
  // === 메모 / 비고 ===
  '메모'?: string
  '비고'?: string
  '특이사항'?: string
  '제품설명'?: string         // NIT 양식 — note 흡수
  '설명'?: string
  // === 무시할 컬럼 (인증, 일자 등 — 데이터 보관 X) ===
  '여신협회인증여부'?: string  // NIT 양식 (무시)
  '인증일'?: string             // NIT 양식 (무시)
  '인증만료일'?: string         // NIT 양식 (무시)
  'NO'?: string | number        // NIT 양식 (행 번호, 무시)
  // 단말기 + 원가 7단계
  '단말기 종류'?: string
  '단말기종류'?: string
  '원가 1대'?: string | number
  '원가(1대)'?: string | number
  '원가 (1대)'?: string | number
  '원가 5대+'?: string | number
  '원가(5대+)'?: string | number
  '원가 (5대+)'?: string | number
  '원가 10대+'?: string | number
  '원가(10대+)'?: string | number
  '원가 (10대+)'?: string | number
  '원가 20대+'?: string | number
  '원가(20대+)'?: string | number
  '원가 (20대+)'?: string | number
  '원가 30대+'?: string | number
  '원가(30대+)'?: string | number
  '원가 (30대+)'?: string | number
  '원가 50대+'?: string | number
  '원가(50대+)'?: string | number
  '원가 (50대+)'?: string | number
  '원가 100대+'?: string | number
  '원가(100대+)'?: string | number
  '원가 (100대+)'?: string | number
  cost_5plus?: string | number | null
  cost_10plus?: string | number | null
  cost_20plus?: string | number | null
  cost_30plus?: string | number | null
  cost_50plus?: string | number | null
  cost_100plus?: string | number | null
  device_type?: string | null
}

// 한글 분류값 → 영문 category code 매핑
// 오즈랩의 4종 핵심 상품 (인터넷 / POS단말기 / CCTV / 테이블오더-키오스크) +
// 각 상품 옵션·부속 + 공급사별 표현을 통일된 카테고리로 변환
const KO_CATEGORY: Record<string, string> = {
  // === 1. 인터넷 (메인) ===
  '인터넷': 'internet',
  '인터넷가입': 'internet',
  'SKT인터넷': 'internet',
  'KT인터넷': 'internet',
  'LG인터넷': 'internet',
  '광랜': 'internet',
  '500M': 'internet',
  '1기가': 'internet',
  // 인터넷 옵션 (셋탑/WIFI/유심결합 등)
  '추가셋탑': 'internet_option',
  '셋탑': 'internet_option',
  '스탠다드': 'internet_option',
  'ALL': 'internet_option',
  'WIFI 7': 'internet_option',
  'WIFI': 'internet_option',
  '애플셋탑': 'internet_option',
  'OSS인센': 'internet_option',
  // 인터넷 유심 결합 (별도 카테고리 — 인센티브 큼)
  '유심정책': 'internet_usim',
  '유심결합': 'internet_usim',
  '유심정책\n[부가세포함 정책]': 'internet_usim',
  // === 2. POS 단말기 (메인) ===
  '단말기': 'pos',
  '포스기': 'pos',
  '단말기(범용)': 'pos',
  '단말기(특수)': 'pos',
  'POS': 'pos',
  // POS 부속/부가장비
  'POS부가장비': 'pos_accessory',
  '멀티패드': 'pos_accessory',
  '매출전표': 'pos_accessory',
  '케이블': 'pos_accessory',
  '부수기자재': 'pos_accessory',
  '서명패드': 'pos_accessory',
  '커넥트': 'pos_accessory',
  '태블릿': 'pos_accessory',
  '주방용': 'pos_accessory',
  // === 3. CCTV (메인) ===
  'cctv': 'cctv',
  'CCTV': 'cctv',
  // === 4. 테이블오더 / 키오스크 (메인) ===
  '키오스크': 'kiosk',
  '테이블오더': 'tableorder',
  '테오': 'tableorder',
  // === 기타 ===
  '추가상품': 'addon',
  '추가\n상품': 'addon',
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
    // 영문/한글 동의어 모두 인식 — 표준 양식 + NIT + 네이버 렌탈표 헤더
    const label = cleanStr(
      pick(r, 'label', '상품 이름', '상품이름', '이름', '상품명', '품목명', '상품구성'),
      200,
    )
    let code = cleanStr(pick(r, 'code'), 60)
    // code 비어있으면 label 에서 자동 생성
    if (!code && label) code = makeCodeFromLabel(label)

    // category — 한글이면 영문 코드로 변환
    const categoryRaw = cleanStr(
      pick(r, 'category', '분류', '카테고리', '품목군', '구성'),
      60,
    )
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

    const vendorVal       = cleanStr(
      pick(r, 'vendor', '공급 회사', '공급회사', '공급사', '본사', '회사', '제조사'),
      40,
    ) || null
    const deviceTypeVal   = cleanStr(pick(r, 'device_type', '단말기 종류', '단말기종류'), 40) || null
    // 고객 판매 가격 — '일시불' 도 동일 의미 (네이버 렌탈표)
    const customerPriceVal = toNumber(
      pick(r, 'customer_price', '고객 가격', '고객가격', '가격', '판매가', '판매가격', '일시불'),
    )
    const commissionVal    = toNumber(
      pick(r, 'default_commission', '우리 수당', '우리수당', '수당', '마진'),
    )
    // 원가 1대 (= device_cost) — 네이버 렌탈표의 '단가/렌탈가' = 부가세 포함 원가
    //                           NIT 양식의 '판매가(기본)' = 1대 단가
    const deviceCostVal    = toNumber(
      pick(
        r,
        'device_cost', '원가 1대', '원가(1대)', '원가 (1대)',
        '기기 값', '기기값', '기기 매입가',
        '원가', '단가', '렌탈가', '매입가',
        '판매가\n(기본)', '판매가(기본)',
      ),
    )
    const cost5            = toNumber(pick(r, 'cost_5plus',   '원가 5대+',  '원가(5대+)',  '원가 (5대+)',  '판매가\n(5대이상)',  '판매가(5대이상)'))
    const cost10           = toNumber(pick(r, 'cost_10plus',  '원가 10대+', '원가(10대+)', '원가 (10대+)', '판매가\n(10대이상)', '판매가(10대이상)'))
    const cost20           = toNumber(pick(r, 'cost_20plus',  '원가 20대+', '원가(20대+)', '원가 (20대+)', '판매가\n(20대이상)', '판매가(20대이상)'))
    const cost30           = toNumber(pick(r, 'cost_30plus',  '원가 30대+', '원가(30대+)', '원가 (30대+)', '판매가\n(30대이상)', '판매가(30대이상)'))
    const cost50           = toNumber(pick(r, 'cost_50plus',  '원가 50대+', '원가(50대+)', '원가 (50대+)', '판매가\n(50대이상)', '판매가(50대이상)'))
    const cost100          = toNumber(pick(r, 'cost_100plus', '원가 100대+', '원가(100대+)', '원가 (100대+)', '판매가\n(100대이상)', '판매가(100대이상)'))
    // 메모 — 비고/특이사항/제품설명/설명 모두 흡수
    const noteVal          = cleanStr(
      pick(r, 'note', '메모', '비고', '특이사항', '제품설명', '설명'),
      500,
    ) || null
    const isSubVal         = toBool(
      pick(r, 'is_subscription', '월 정기 결제', '월정기결제', '월결제', '정기결제'),
    )
    const defaultMonthly   = toNumber(
      pick(r, 'default_monthly', '월 결제 금액', '월결제금액'),
    )
    const finalMonthly     = defaultMonthly ?? (isSubVal ? customerPriceVal : null)
    // 인증 정보 (여신협회/인증일/만료일) + NO 컬럼은 의도적으로 무시 (사용자 결정)

    const payload: Record<string, unknown> = {
      code,
      label,
      category,
      vendor: vendorVal,
      device_type: deviceTypeVal,
      default_amount: toNumber(r.default_amount),
      default_commission: commissionVal,
      customer_price: customerPriceVal,
      device_cost: deviceCostVal,
      cost_5plus:   cost5,
      cost_10plus:  cost10,
      cost_20plus:  cost20,
      cost_30plus:  cost30,
      cost_50plus:  cost50,
      cost_100plus: cost100,
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
