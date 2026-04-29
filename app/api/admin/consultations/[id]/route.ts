// ─────────────────────────────────────────────
// /api/admin/consultations/[id] — 상담 1건 상태 변경 + 이력 기록
//
// PATCH body :
//   { status_id?: number, status?: string, internal_memo?: string,
//     assignee_note?: string, counselor_id?: string | null,
//     is_favorite?: boolean, is_blacklisted?: boolean }
//
// 인증 :
//   - has_admin_access 통과 (lib/admin/auth-helpers guardApi)
//   - RLS 가 한 번 더 검증
//
// 사이드 이펙트 :
//   - status_id 변경 시 db_statuses 코드 lookup → status (text) 동기화
//   - status_id 변경 시 consultation_status_history INSERT (감사 로그)
//   - status='contacted' 로 바꿀 때 contacted_at 기록 (BC)
//   - status='done'      로 바꿀 때 done_at      기록 (BC)
// ─────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { guardApi } from '@/lib/admin/auth-helpers'

export const dynamic = 'force-dynamic'

interface PatchBody {
  status_id?: number
  status?: string
  internal_memo?: string | null
  assignee_note?: string | null
  counselor_id?: string | null
  is_favorite?: boolean
  is_blacklisted?: boolean
  memo_for_history?: string  // 상태 변경 이력에 같이 저장할 메모
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const guard = await guardApi()
  if (!guard.ok) return guard.response
  const { profile } = guard

  let body: PatchBody
  try {
    body = (await req.json()) as PatchBody
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  const supabase = createClient()

  // ----- 업데이트 필드 조립 -----
  const update: Record<string, unknown> = {}

  // status_id 변경 시 db_statuses 에서 code 가져와 status (text) 도 같이 갱신
  let newStatusCode: string | null = null
  if (body.status_id !== undefined) {
    const { data: st, error: stErr } = await supabase
      .from('db_statuses')
      .select('code')
      .eq('id', body.status_id)
      .single()
    if (stErr || !st) {
      return NextResponse.json(
        { error: '유효하지 않은 status_id' },
        { status: 400 },
      )
    }
    newStatusCode = st.code
    update.status_id = body.status_id
    update.status = st.code
  }

  // status (text) 직접 변경 (구 호환)
  if (body.status !== undefined && body.status_id === undefined) {
    update.status = body.status
    newStatusCode = body.status
  }

  // BC: contacted/done 시 timestamp 자동
  if (newStatusCode === 'contacted') {
    update.contacted_at = new Date().toISOString()
  }
  if (newStatusCode === 'done') {
    update.done_at = new Date().toISOString()
  }
  if (newStatusCode === 'new') {
    update.contacted_at = null
    update.done_at = null
  }

  if (body.internal_memo !== undefined) update.internal_memo = body.internal_memo
  if (body.assignee_note !== undefined) update.assignee_note = body.assignee_note
  if (body.counselor_id !== undefined) {
    update.counselor_id = body.counselor_id
    update.assigned_at = body.counselor_id ? new Date().toISOString() : null
  }
  if (body.is_favorite !== undefined) update.is_favorite = body.is_favorite
  if (body.is_blacklisted !== undefined) update.is_blacklisted = body.is_blacklisted

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: '변경할 필드가 없습니다.' },
      { status: 400 },
    )
  }

  // ----- 업데이트 -----
  const { data, error } = await supabase
    .from('consultations')
    .update(update)
    .eq('id', params.id)
    .select(
      'id, status, status_id, contacted_at, done_at, assignee_note, internal_memo, counselor_id, is_favorite, is_blacklisted',
    )
    .single()

  if (error) {
    console.error('[consultations patch]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  // ----- status 변경 시 이력 INSERT -----
  if (body.status_id !== undefined) {
    const { error: hErr } = await supabase
      .from('consultation_status_history')
      .insert({
        consultation_id: params.id,
        status_id: body.status_id,
        changed_by: profile.user_id,
        memo: body.memo_for_history ?? null,
      })
    if (hErr) {
      // 이력 실패는 본 작업 성공 응답에 경고로 (소프트 에러)
      console.warn('[consultations status_history]', hErr)
    }
  }

  return NextResponse.json({ success: true, consultation: data })
}
