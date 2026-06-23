// ─────────────────────────────────────────────
// /api/admin/package-pricing/[id]
//   마케팅 패키지 견적 항목 — 개별 수정/삭제
//
// 권한 : super_admin / admin
// ─────────────────────────────────────────────
import { createAdminClient } from '@/lib/supabase/admin'
import { guardApi } from '@/lib/admin/auth-helpers'
import { NextRequest, NextResponse } from 'next/server'

function asNonNegInt(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) return null
  return Math.round(v)
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const guard = await guardApi(['super_admin', 'admin'])
  if (!guard.ok) return guard.response

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: '본문 형식이 잘못되었습니다.' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}

  if (body.item_group !== undefined) {
    if (body.item_group !== 'initial' && body.item_group !== 'monthly') {
      return NextResponse.json({ error: '구분은 initial / monthly 만 가능합니다.' }, { status: 400 })
    }
    update.item_group = body.item_group
    // 초기 항목은 연 단가를 갖지 않음
    if (body.item_group === 'initial') update.yearly_price = null
  }

  if (typeof body.name === 'string') {
    const name = body.name.trim()
    if (!name) return NextResponse.json({ error: '항목 이름은 비울 수 없습니다.' }, { status: 400 })
    if (name.length > 120) return NextResponse.json({ error: '항목 이름은 120자 이내로 입력하세요.' }, { status: 400 })
    update.name = name
  }

  if (body.description !== undefined) {
    update.description =
      typeof body.description === 'string' && body.description.trim()
        ? body.description.trim().slice(0, 200)
        : null
  }

  if (body.monthly_price !== undefined) {
    const v = asNonNegInt(body.monthly_price)
    if (v === null) return NextResponse.json({ error: '단가는 0 이상의 숫자여야 합니다.' }, { status: 400 })
    update.monthly_price = v
  }

  if (body.yearly_price !== undefined && update.yearly_price === undefined) {
    if (body.yearly_price === null || body.yearly_price === '') {
      update.yearly_price = null
    } else {
      const v = asNonNegInt(body.yearly_price)
      if (v === null) return NextResponse.json({ error: '연 단가는 0 이상의 숫자이거나 비워두세요.' }, { status: 400 })
      update.yearly_price = v
    }
  }

  if (body.sort_order !== undefined) {
    const v = asNonNegInt(body.sort_order)
    if (v === null) return NextResponse.json({ error: '순서는 0 이상의 숫자여야 합니다.' }, { status: 400 })
    update.sort_order = v
  }

  if (typeof body.is_active === 'boolean') update.is_active = body.is_active

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: '업데이트할 필드가 없습니다.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('package_pricing_items')
    .update(update)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const guard = await guardApi(['super_admin', 'admin'])
  if (!guard.ok) return guard.response

  const admin = createAdminClient()
  const { error } = await admin.from('package_pricing_items').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
