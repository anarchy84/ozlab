// ─────────────────────────────────────────────
// /api/admin/consultation-options/[id]
//   상담 옵션 마스터 — 개별 수정/삭제.
//
// 권한 :
//   PATCH  : super_admin / admin (값/순서/활성 토글)
//   DELETE : super_admin / admin (hard delete — 단 사용 중 데이터는 자유 텍스트로 남아있음)
//
// 주의 :
//   field_key 는 PATCH 로 변경 불가 (의미가 바뀌면 새로 생성).
// ─────────────────────────────────────────────
import { createAdminClient } from '@/lib/supabase/admin'
import { guardApi } from '@/lib/admin/auth-helpers'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await guardApi(['super_admin', 'admin'])
  if (!guard.ok) return guard.response

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: '본문 형식이 잘못되었습니다.' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}
  if (typeof body.value === 'string') {
    const trimmed = body.value.trim()
    if (!trimmed) {
      return NextResponse.json({ error: '옵션 값은 비울 수 없습니다.' }, { status: 400 })
    }
    if (trimmed.length > 80) {
      return NextResponse.json(
        { error: '옵션 값은 80자 이내로 입력하세요.' },
        { status: 400 }
      )
    }
    update.value = trimmed
  }
  if (typeof body.sort_order === 'number') update.sort_order = body.sort_order
  if (typeof body.is_active === 'boolean') update.is_active = body.is_active

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: '업데이트할 필드가 없습니다.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('consultation_field_options')
    .update(update)
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: '같은 필드에 동일한 옵션이 이미 존재합니다.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await guardApi(['super_admin', 'admin'])
  if (!guard.ok) return guard.response

  const admin = createAdminClient()
  const { error } = await admin
    .from('consultation_field_options')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
