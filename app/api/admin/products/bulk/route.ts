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
  default_amount?: string | number | null
  default_period?: string | null
  is_subscription?: string | boolean | number | null
  default_monthly?: string | number | null
  sort_order?: string | number | null
  note?: string | null
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
    const code = cleanStr(r.code, 60)
    const label = cleanStr(r.label, 200)
    const category = cleanStr(r.category, 60)

    // 검증
    if (!code) {
      results.push({ row_idx: idx, code, label, category, action: 'error', message: 'code 누락' })
      return
    }
    if (!label) {
      results.push({ row_idx: idx, code, label, category, action: 'error', message: 'label 누락' })
      return
    }
    if (!category) {
      results.push({ row_idx: idx, code, label, category, action: 'error', message: 'category 누락' })
      return
    }
    const period = cleanStr(r.default_period, 20)
    if (period && !PERIOD_ALLOWED.includes(period)) {
      results.push({
        row_idx: idx, code, label, category,
        action: 'error',
        message: `default_period 는 ${PERIOD_ALLOWED.filter(Boolean).join('/')} 중 하나`,
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

    const payload: Record<string, unknown> = {
      code,
      label,
      category,
      default_amount: toNumber(r.default_amount),
      default_period: period || null,
      is_subscription: toBool(r.is_subscription),
      default_monthly: toNumber(r.default_monthly),
      sort_order: toNumber(r.sort_order) ?? 0,
      note: cleanStr(r.note, 500) || null,
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
