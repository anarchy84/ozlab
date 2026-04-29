// ─────────────────────────────────────────────
// /api/admin/users/[id] — 개별 어드민 사용자 편집·삭제
//
// PATCH  : role / display_name / department / note / is_active 변경
// DELETE : auth.users + admin_users 영구 삭제
//
// 가드 :
//   - super_admin 만
//   - 본인 강등 차단 (role super_admin → 다른 role)
//   - 본인 비활성화 차단
//   - 마지막 활성 super_admin 비활성화/강등/삭제 차단
// ─────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { guardApi } from '@/lib/admin/auth-helpers'
import { ADMIN_ROLES } from '@/lib/admin/types'
import type { AdminRole } from '@/lib/admin/types'

export const dynamic = 'force-dynamic'

interface PatchBody {
  role?: AdminRole
  display_name?: string | null
  department?: string | null
  note?: string | null
  is_active?: boolean
}

// ----- 마지막 활성 super_admin 인지 체크 (가드용) -----
async function isLastActiveSuperAdmin(targetUserId: string): Promise<boolean> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('role', 'super_admin')
    .eq('is_active', true)

  if (error) {
    console.error('[isLastActiveSuperAdmin]', error)
    return false
  }
  if (!data || data.length === 0) return false
  return data.length === 1 && data[0].user_id === targetUserId
}

// ----- PATCH -----
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const guard = await guardApi(['super_admin'])
  if (!guard.ok) return guard.response
  const { profile } = guard

  const targetId = params.id
  let body: PatchBody
  try {
    body = (await req.json()) as PatchBody
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  // 본인 강등 차단
  if (
    targetId === profile.user_id &&
    body.role !== undefined &&
    body.role !== 'super_admin'
  ) {
    return NextResponse.json(
      { error: '본인을 강등할 수 없습니다.' },
      { status: 400 },
    )
  }

  // 본인 비활성화 차단
  if (targetId === profile.user_id && body.is_active === false) {
    return NextResponse.json(
      { error: '본인을 비활성화할 수 없습니다.' },
      { status: 400 },
    )
  }

  // 마지막 super_admin 보호
  const willDemote = body.role !== undefined && body.role !== 'super_admin'
  const willDeactivate = body.is_active === false
  if ((willDemote || willDeactivate) && (await isLastActiveSuperAdmin(targetId))) {
    return NextResponse.json(
      {
        error: '마지막 활성 super_admin 이라 변경할 수 없습니다.',
        hint: '먼저 다른 super_admin 을 추가하세요.',
      },
      { status: 400 },
    )
  }

  // role 검증
  if (body.role !== undefined && !ADMIN_ROLES.includes(body.role)) {
    return NextResponse.json(
      { error: `유효하지 않은 role: ${body.role}` },
      { status: 400 },
    )
  }

  // 화이트리스트
  const update: Record<string, unknown> = {}
  if (body.role !== undefined) update.role = body.role
  if (body.display_name !== undefined) update.display_name = body.display_name
  if (body.department !== undefined) update.department = body.department
  if (body.note !== undefined) update.note = body.note
  if (body.is_active !== undefined) update.is_active = body.is_active

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: '변경할 필드가 없습니다.' },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('admin_users')
    .update(update)
    .eq('user_id', targetId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, user: data })
}

// ----- DELETE -----
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const guard = await guardApi(['super_admin'])
  if (!guard.ok) return guard.response
  const { profile } = guard

  const targetId = params.id

  if (targetId === profile.user_id) {
    return NextResponse.json(
      { error: '본인을 삭제할 수 없습니다.' },
      { status: 400 },
    )
  }
  if (await isLastActiveSuperAdmin(targetId)) {
    return NextResponse.json(
      { error: '마지막 활성 super_admin 이라 삭제할 수 없습니다.' },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()

  // 1) consultations.counselor_id 자동 NULL 처리는 ON DELETE SET NULL 로 자동
  // 2) auth.users DELETE → admin_users CASCADE 로 자동 삭제
  const { error } = await supabase.auth.admin.deleteUser(targetId)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
