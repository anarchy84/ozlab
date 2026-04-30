// ─────────────────────────────────────────────
// /api/admin/users/[id]/reset-password — 비밀번호 재설정
//   슈퍼어드민이 임시 비밀번호 강제 발급
//   이메일 발송 X — 응답에 비번 포함, 슈퍼어드민이 직접 전달
// ─────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { guardApi } from '@/lib/admin/auth-helpers'

export const dynamic = 'force-dynamic'

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
  return out.split('').sort(() => Math.random() - 0.5).join('')
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await guardApi(['super_admin'])
  if (!guard.ok) return guard.response

  let body: { password?: string } = {}
  try {
    body = (await req.json()) as { password?: string }
  } catch {
    body = {}
  }

  const password =
    body.password?.trim() && body.password.trim().length >= 8
      ? body.password.trim()
      : generatePassword(12)

  const supabase = createAdminClient()

  // 비밀번호 업데이트 + 이메일 confirm 강제 (혹시 미인증 상태면 같이 통과)
  const { data, error } = await supabase.auth.admin.updateUserById(params.id, {
    password,
    email_confirm: true,
  })

  if (error) {
    console.error('[reset-password]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const email = data?.user?.email ?? null
  const loginUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ozlabpay.kr'}/admin/login`

  return NextResponse.json({
    success: true,
    email,
    password,
    login_url: loginUrl,
    message: '비밀번호 재설정 완료. 슬랙·카톡으로 직접 전달하세요.',
  })
}
