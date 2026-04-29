// ─────────────────────────────────────────────
// /api/admin/users/invite — 신규 어드민 사용자 이메일 초대
//
// 권한 : super_admin 만
//
// 흐름 :
//   1) Supabase Auth Admin API 의 inviteUserByEmail() 호출
//      → Supabase 가 자동으로 초대 메일 발송
//      → 사용자가 링크 클릭 → 비번 설정 → 자동 로그인
//   2) 동시에 admin_users 에 INSERT (auth.users 에 user 가 만들어진 후)
//      또는 첫 로그인 시 트리거로 자동 INSERT
//      → 본 구현은 invite 단계에서 user_metadata.role 같이 전달해 두고
//        사용자가 비번 설정 후 첫 어드민 진입 시 trigger 가 admin_users INSERT
//
//   ⚠️ 트리거 이슈 :
//      현재는 트리거 안 만들어져 있어서 invite API 가 직접 admin_users INSERT 시도.
//      단, invite 시점에는 auth.users 에 user 가 아직 없을 수 있음 (이메일 검증 전).
//      → invite 응답에서 user_id 받으면 즉시 admin_users INSERT.
//      → 사용자가 비번 미설정/만료된 경우 admin_users 만 남고 로그인 불가 (정상 동작)
// ─────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { guardApi } from '@/lib/admin/auth-helpers'
import { INVITABLE_ROLES } from '@/lib/admin/permissions'
import type { AdminRole } from '@/lib/admin/types'

export const dynamic = 'force-dynamic'

interface InviteBody {
  email: string
  role: AdminRole
  display_name?: string
  department?: string
  note?: string
}

export async function POST(req: NextRequest) {
  const guard = await guardApi(['super_admin'])
  if (!guard.ok) return guard.response

  let body: InviteBody
  try {
    body = (await req.json()) as InviteBody
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  // ----- 검증 -----
  const email = (body.email ?? '').trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: '유효한 이메일을 입력하세요.' },
      { status: 400 },
    )
  }
  if (!INVITABLE_ROLES.includes(body.role)) {
    return NextResponse.json(
      {
        error: `초대 가능한 role 이 아닙니다. (${INVITABLE_ROLES.join(', ')})`,
        hint: 'super_admin 은 별도 워크플로우 — 기존 super_admin 이 직접 추가하세요.',
      },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()

  // ----- 1) Supabase Auth invite -----
  const { data: invited, error: inviteError } =
    await supabase.auth.admin.inviteUserByEmail(email, {
      data: {
        role: body.role,
        display_name: body.display_name?.trim() ?? null,
        department: body.department?.trim() ?? null,
      },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ozlabpay.kr'}/admin`,
    })

  if (inviteError) {
    console.error('[invite]', inviteError)
    // 이미 가입된 경우
    if (inviteError.message?.toLowerCase().includes('already')) {
      return NextResponse.json(
        { error: '이미 가입된 이메일입니다.' },
        { status: 409 },
      )
    }
    return NextResponse.json({ error: inviteError.message }, { status: 500 })
  }

  const userId = invited?.user?.id
  if (!userId) {
    return NextResponse.json(
      { error: 'invite 응답에 user_id 없음 — Supabase 응답 확인 필요' },
      { status: 500 },
    )
  }

  // ----- 2) admin_users INSERT -----
  const { error: insertError } = await supabase.from('admin_users').upsert(
    {
      user_id: userId,
      role: body.role,
      display_name: body.display_name?.trim() ?? null,
      department: body.department?.trim() ?? null,
      note: body.note?.trim() ?? null,
      is_active: true,
    },
    { onConflict: 'user_id' },
  )

  if (insertError) {
    console.error('[invite admin_users]', insertError)
    return NextResponse.json(
      {
        error: 'auth user 는 만들어졌으나 admin_users 등록 실패: ' + insertError.message,
        user_id: userId,
        hint: '수동으로 admin_users 에 INSERT 하세요.',
      },
      { status: 500 },
    )
  }

  return NextResponse.json({
    success: true,
    user_id: userId,
    email,
    role: body.role,
    message: `초대 메일을 ${email} 로 발송했습니다.`,
  })
}
