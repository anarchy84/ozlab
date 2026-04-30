// ─────────────────────────────────────────────
// /api/admin/product-categories — 상품 카테고리 마스터
// 권한 :
//   GET  : 모든 admin
//   POST : super_admin / admin / marketer
// ─────────────────────────────────────────────
import { createAdminClient } from '@/lib/supabase/admin'
import { guardApi } from '@/lib/admin/auth-helpers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const guard = await guardApi()
  if (!guard.ok) return guard.response

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('product_categories')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const guard = await guardApi(['super_admin', 'admin', 'marketer'])
  if (!guard.ok) return guard.response

  const body = await request.json()
  if (!body.code || !body.label) {
    return NextResponse.json(
      { error: 'code / label 은 필수입니다.' },
      { status: 400 }
    )
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('product_categories')
    .insert({
      code: String(body.code).trim(),
      label: String(body.label).trim(),
      sort_order: body.sort_order ?? 0,
      is_active: body.is_active !== false,
      note: body.note ?? null,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: '같은 code 의 카테고리가 이미 있습니다.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
