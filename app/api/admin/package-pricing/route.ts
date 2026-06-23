// ─────────────────────────────────────────────
// /api/admin/package-pricing
//   마케팅 패키지 견적 — 항목 목록/생성 + 설정 수정
//
// 권한 :
//   GET   : 모든 admin (비활성 포함 전체)
//   POST  : super_admin / admin (항목 추가)
//   PATCH : super_admin / admin (설정 수정 — 단일 행 upsert)
// ─────────────────────────────────────────────
import { createAdminClient } from '@/lib/supabase/admin'
import { guardApi } from '@/lib/admin/auth-helpers'
import { NextRequest, NextResponse } from 'next/server'

const SETTINGS_ID = 'marketing-package'

function asGroup(v: unknown): 'initial' | 'monthly' | null {
  return v === 'initial' || v === 'monthly' ? v : null
}

function asNonNegInt(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) return null
  return Math.round(v)
}

export async function GET() {
  const guard = await guardApi()
  if (!guard.ok) return guard.response

  const admin = createAdminClient()
  const [itemsRes, settingsRes] = await Promise.all([
    admin
      .from('package_pricing_items')
      .select('*')
      .order('item_group', { ascending: true })
      .order('sort_order', { ascending: true }),
    admin.from('package_pricing_settings').select('*').eq('id', SETTINGS_ID).maybeSingle(),
  ])
  if (itemsRes.error) return NextResponse.json({ error: itemsRes.error.message }, { status: 500 })
  return NextResponse.json({ items: itemsRes.data ?? [], settings: settingsRes.data ?? null })
}

export async function POST(request: NextRequest) {
  const guard = await guardApi(['super_admin', 'admin'])
  if (!guard.ok) return guard.response

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: '본문 형식이 잘못되었습니다.' }, { status: 400 })
  }

  const itemGroup = asGroup(body.item_group)
  if (!itemGroup) {
    return NextResponse.json({ error: '구분(item_group)은 initial / monthly 만 가능합니다.' }, { status: 400 })
  }
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) return NextResponse.json({ error: '항목 이름을 입력하세요.' }, { status: 400 })
  if (name.length > 120) return NextResponse.json({ error: '항목 이름은 120자 이내로 입력하세요.' }, { status: 400 })

  const monthlyPrice = asNonNegInt(body.monthly_price) ?? 0
  const yearlyPrice =
    body.yearly_price === null || body.yearly_price === undefined ? null : asNonNegInt(body.yearly_price)
  if (body.yearly_price !== null && body.yearly_price !== undefined && yearlyPrice === null) {
    return NextResponse.json({ error: '연 단가는 0 이상의 숫자여야 합니다.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('package_pricing_items')
    .insert({
      item_group: itemGroup,
      name,
      description: typeof body.description === 'string' ? body.description.trim().slice(0, 200) : null,
      monthly_price: monthlyPrice,
      yearly_price: itemGroup === 'initial' ? null : yearlyPrice,
      sort_order: asNonNegInt(body.sort_order) ?? 0,
      is_active: body.is_active !== false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const guard = await guardApi(['super_admin', 'admin'])
  if (!guard.ok) return guard.response

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: '본문 형식이 잘못되었습니다.' }, { status: 400 })
  }

  const update: Record<string, unknown> = { id: SETTINGS_ID }
  if (body.package_monthly !== undefined) {
    const v = asNonNegInt(body.package_monthly)
    if (v === null) return NextResponse.json({ error: '월 패키지가는 0 이상의 숫자여야 합니다.' }, { status: 400 })
    update.package_monthly = v
  }
  if (body.package_yearly !== undefined) {
    const v = asNonNegInt(body.package_yearly)
    if (v === null) return NextResponse.json({ error: '연 패키지가는 0 이상의 숫자여야 합니다.' }, { status: 400 })
    update.package_yearly = v
  }
  if (typeof body.badge_label === 'string') update.badge_label = body.badge_label.trim().slice(0, 120)
  if (typeof body.cta_label === 'string') update.cta_label = body.cta_label.trim().slice(0, 120)
  if (typeof body.yearly_note === 'string') update.yearly_note = body.yearly_note.trim().slice(0, 200)
  if (body.regular_total_override !== undefined) {
    if (body.regular_total_override === null || body.regular_total_override === '') {
      update.regular_total_override = null
    } else {
      const v = asNonNegInt(body.regular_total_override)
      if (v === null) return NextResponse.json({ error: '정상가는 0 이상의 숫자이거나 비워두세요.' }, { status: 400 })
      update.regular_total_override = v
    }
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('package_pricing_settings')
    .upsert(update, { onConflict: 'id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
