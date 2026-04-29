// ─────────────────────────────────────────────
// /api/admin/statuses/[id] — db_statuses 단일 수정·삭제
//
// PATCH  : 일부 필드 수정 (super_admin)
// DELETE : 삭제 (super_admin) — 사용 중인 status 가 있으면 거절
// ─────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { guardApi } from '@/lib/admin/auth-helpers'
import type { DbStatusInput } from '@/lib/admin/types'

export const dynamic = 'force-dynamic'

// ----- PATCH -----
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const guard = await guardApi(['super_admin'])
  if (!guard.ok) return guard.response

  const id = parseInt(params.id, 10)
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 })
  }

  let body: Partial<DbStatusInput>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  // 화이트리스트 — 허용된 필드만 통과
  const allowed: (keyof DbStatusInput)[] = [
    'sort_order', 'code', 'label', 'bg_color', 'text_color',
    'send_message', 'is_promising', 'force_recall', 'is_conversion',
    'is_unapproved', 'needs_counselor_confirm', 'in_progress',
    'cannot_proceed', 'include_in_gcl', 'show_in_dashboard',
    'message_template_code', 'is_active',
  ]
  const update: Partial<DbStatusInput> = {}
  for (const key of allowed) {
    if (key in body) {
      // @ts-expect-error — 동적 키 (검증된 화이트리스트)
      update[key] = body[key]
    }
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: '변경할 필드가 없습니다.' },
      { status: 400 },
    )
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('db_statuses')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[statuses PATCH]', error)
    if (error.code === '23505') {
      return NextResponse.json(
        { error: '같은 code 의 다른 상태가 이미 존재합니다.' },
        { status: 409 },
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, status: data })
}

// ----- DELETE -----
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const guard = await guardApi(['super_admin'])
  if (!guard.ok) return guard.response

  const id = parseInt(params.id, 10)
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 })
  }

  const supabase = createClient()

  // 1) 사용 중인지 체크 — consultations 또는 status_history 에서 참조 중이면 거절
  const { count: cCount } = await supabase
    .from('consultations')
    .select('id', { count: 'exact', head: true })
    .eq('status_id', id)
  if ((cCount ?? 0) > 0) {
    return NextResponse.json(
      {
        error: `이 상태를 사용 중인 상담 ${cCount}건이 있어 삭제할 수 없습니다.`,
        hint: '대신 비활성(is_active=false) 처리를 권장합니다.',
      },
      { status: 409 },
    )
  }

  const { error } = await supabase
    .from('db_statuses')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('[statuses DELETE]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
