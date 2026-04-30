// ─────────────────────────────────────────────
// /api/admin/product-categories/[id] — 카테고리 수정·삭제
//   삭제 시 해당 카테고리 사용 중인 상품 있으면 차단
// ─────────────────────────────────────────────
import { createAdminClient } from '@/lib/supabase/admin'
import { guardApi } from '@/lib/admin/auth-helpers'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await guardApi(['super_admin', 'admin', 'marketer'])
  if (!guard.ok) return guard.response

  const body = await request.json()
  const update: Record<string, unknown> = {}
  for (const k of ['label', 'sort_order', 'is_active', 'note']) {
    if (body[k] !== undefined) update[k] = body[k]
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: '업데이트할 필드가 없습니다.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('product_categories')
    .update(update)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await guardApi(['super_admin', 'admin'])
  if (!guard.ok) return guard.response

  const admin = createAdminClient()

  // 해당 카테고리 code 사용 중인 상품 확인
  const { data: cat } = await admin
    .from('product_categories')
    .select('code')
    .eq('id', params.id)
    .single()

  if (cat?.code) {
    const { count } = await admin
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('category', cat.code)
    if ((count ?? 0) > 0) {
      return NextResponse.json(
        {
          error: `이 카테고리를 사용 중인 상품 ${count}건이 있습니다. 먼저 상품을 삭제하거나 다른 카테고리로 옮긴 뒤 다시 시도하세요.`,
        },
        { status: 409 }
      )
    }
  }

  const { error } = await admin.from('product_categories').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
