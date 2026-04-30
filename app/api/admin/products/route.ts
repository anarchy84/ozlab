// ─────────────────────────────────────────────
// /api/admin/products — 상품 카탈로그
// 권한 :
//   GET   : 모든 admin (드롭다운 노출용)
//   POST  : super_admin / admin / marketer
// ─────────────────────────────────────────────

import { createAdminClient } from '@/lib/supabase/admin'
import { guardApi } from '@/lib/admin/auth-helpers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const guard = await guardApi()
  if (!guard.ok) return guard.response

  const { searchParams } = new URL(request.url)
  const activeOnly = searchParams.get('active') === '1'

  const admin = createAdminClient()
  let q = admin
    .from('products')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('label', { ascending: true })
  if (activeOnly) q = q.eq('is_active', true)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const guard = await guardApi(['super_admin', 'admin', 'marketer'])
  if (!guard.ok) return guard.response

  const body = await request.json()

  if (!body.code || !body.label || !body.category) {
    return NextResponse.json(
      { error: 'code / label / category 는 필수입니다.' },
      { status: 400 }
    )
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('products')
    .insert({
      code: String(body.code).trim(),
      label: String(body.label).trim(),
      category: String(body.category).trim(),
      default_amount: body.default_amount ?? null,
      default_period: body.default_period ?? null,
      is_subscription: body.is_subscription === true,
      default_monthly: body.default_monthly ?? null,
      sort_order: body.sort_order ?? 0,
      is_active: body.is_active !== false,
      note: body.note ?? null,
      created_by: guard.profile.user_id,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: '같은 code 의 상품이 이미 있습니다.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
