// ─────────────────────────────────────────────
// /api/admin/consultations/[id] — 상담 1건 상태 변경
//
// PATCH body : { status?: 'new'|'contacted'|'done'|'rejected', assignee_note?: string }
//
// 인증 :
//   - Supabase auth 쿠키 — 어드민 로그인 사용자만
//   - RLS : authenticated 만 update 통과 (마이그레이션에서 정책 설정됨)
//
// 사이드 이펙트 :
//   - status='contacted' 로 바꿀 때 contacted_at = now() 자동 기록
//   - status='done'      로 바꿀 때 done_at      = now() 자동 기록
// ─────────────────────────────────────────────
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const ALLOWED_STATUS = ['new', 'contacted', 'done', 'rejected'] as const
type Status = (typeof ALLOWED_STATUS)[number]

interface Body {
  status?: Status
  assignee_note?: string
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()

  // 1) 인증 체크 (RLS 가 막아주긴 하지만 명시적 401 응답이 더 깔끔)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // 2) body 파싱
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  // 3) 업데이트 대상 필드 조립
  const update: Record<string, unknown> = {}
  if (body.status !== undefined) {
    if (!ALLOWED_STATUS.includes(body.status)) {
      return NextResponse.json({ error: 'invalid status' }, { status: 400 })
    }
    update.status = body.status
    // 상태 전환 시 timestamp 자동 기록
    if (body.status === 'contacted') update.contacted_at = new Date().toISOString()
    if (body.status === 'done') update.done_at = new Date().toISOString()
    // new 로 되돌릴 때는 timestamp 비움
    if (body.status === 'new') {
      update.contacted_at = null
      update.done_at = null
    }
  }
  if (body.assignee_note !== undefined) {
    if (typeof body.assignee_note === 'string' && body.assignee_note.length <= 2000) {
      update.assignee_note = body.assignee_note
    }
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'no fields to update' }, { status: 400 })
  }

  // 4) Supabase update — RLS가 authenticated 만 통과
  const { data, error } = await supabase
    .from('consultations')
    .update(update)
    .eq('id', params.id)
    .select('id, status, contacted_at, done_at, assignee_note')
    .single()

  if (error) {
    console.error('[consultations patch]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, consultation: data })
}
