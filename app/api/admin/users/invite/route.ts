// ─────────────────────────────────────────────
// /api/admin/users/invite — 신규 어드민 사용자 즉시 생성
//
// 권한 : super_admin 만
//
// 흐름 (이메일 인증 없이 즉시 활성) :
//   1) supabase.auth.admin.createUser({ email, password, email_confirm: true })
//      → 이메일 발송 X, 즉시 활성 계정 생성
//   2) admin_users 에 INSERT
//   3) 응답에 임시 비밀번호 + 로그인 URL 포함
//      → 슈퍼어드민이 슬랙/카톡으로 직접 전달
//
// 왜 이 방식인가 :
//   기존 inviteUserByEmail() 은 Supabase 기본 SMTP 의존.
//   한국 도메인 차단·rate limit 으로 발송 실패 빈번.
//   직접 비밀번호 발급이 가장 안정적 + 빠름.
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
  password?: string             // 슈퍼어드민이 지정 — 비우면 자동 생성
}

// 안전한 임시 비밀번호 자동 생성 (12자, 영대소문자+숫자+특수)
function generatePassword(len = 12): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghijkmnpqrstuvwxyz'
  const digit = '23456789'
  const special = '!@#$%'
  const all = upper + lower + digit + special
  let out =
    upper[Math.floor(Math.random() * upper.length)] +
    lower[Math.floor(Math.random() * lower.length)] +
    digit[Math.floor(Math.random() * digit.length)] +
    special[Math.floor(Math.random() * special.length)]
  for (let i = out.length; i < len; i++) {
    out += all[Math.floor(Math.random() * all.length)]
  }
  // 셔플
  return out.split('').sort(() => Math.random() - 0.5).join('')
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

  // 비밀번호 — 입력값 우선, 없으면 자동 생성
  const password = (body.password?.trim() && body.password.trim().length >= 8)
    ? body.password.trim()
    : generatePassword(12)

  const supabase = createAdminClient()

  // ----- 1) 이메일 인증 없이 즉시 활성 사용자 생성 -----
  const { data: created, error: createError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,                    // 핵심 — 이메일 발송·확인 우회
      user_metadata: {
        role: body.role,
        display_name: body.display_name?.trim() ?? null,
        department: body.department?.trim() ?? null,
      },
    })

  if (createError) {
    console.error('[invite createUser]', createError)
    if (
      createError.message?.toLowerCase().includes('already') ||
      createError.message?.toLowerCase().includes('registered') ||
      (createError as { code?: string }).code === 'email_exists'
    ) {
      return NextResponse.json(
        { error: '이미 가입된 이메일입니다. 사용자 목록에서 권한을 변경하거나 비활성화 후 재등록하세요.' },
        { status: 409 },
      )
    }
    return NextResponse.json({ error: createError.message }, { status: 500 })
  }

  const userId = created?.user?.id
  if (!userId) {
    return NextResponse.json(
      { error: '계정 생성 응답에 user_id 없음' },
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

  const loginUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ozlabpay.kr'}/admin/login`

  return NextResponse.json({
    success: true,
    user_id: userId,
    email,
    role: body.role,
    password,                  // 슈퍼어드민이 직접 전달용 — 응답에서만 노출, DB 에 저장 X
    login_url: loginUrl,
    message: `계정 생성 완료. 아래 비밀번호를 슬랙·카톡으로 직접 전달하세요.`,
  })
}
