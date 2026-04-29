// ─────────────────────────────────────────────
// /api/admin/users — 어드민 사용자 목록 (super_admin 전용)
//
// admin_users + auth.users JOIN 으로 이메일·최근 로그인 같이 반환.
// ─────────────────────────────────────────────
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { guardApi } from '@/lib/admin/auth-helpers'

export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await guardApi(['super_admin'])
  if (!guard.ok) return guard.response

  // service_role 로 admin_users + auth.users 둘 다 조회
  const supabase = createAdminClient()

  const { data: adminUsers, error: e1 } = await supabase
    .from('admin_users')
    .select('*')
    .order('created_at', { ascending: false })

  if (e1) {
    return NextResponse.json({ error: e1.message }, { status: 500 })
  }

  // auth.users 에서 email + last_sign_in_at 가져오기
  const userIds = (adminUsers ?? []).map((u) => u.user_id)
  const { data: authUsersData, error: e2 } = await supabase.auth.admin.listUsers({
    perPage: 200,
  })
  if (e2) {
    return NextResponse.json({ error: e2.message }, { status: 500 })
  }

  const authMap = new Map(
    (authUsersData?.users ?? []).map((u) => [u.id, u]),
  )

  const merged = (adminUsers ?? []).map((au) => {
    const auth = authMap.get(au.user_id)
    return {
      ...au,
      email: auth?.email ?? null,
      last_sign_in_at: auth?.last_sign_in_at ?? null,
      auth_created_at: auth?.created_at ?? null,
    }
  })

  return NextResponse.json({ users: merged, total: merged.length })
}
