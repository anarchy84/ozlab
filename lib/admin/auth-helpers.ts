// ─────────────────────────────────────────────
// 어드민 서버사이드 권한 체크 헬퍼
//
// 사용처 :
//   - app/admin/(shell)/layout.tsx   → 어드민 진입 게이트
//   - app/admin/(shell)/.../page.tsx → 페이지별 role 체크
//   - app/api/admin/.../route.ts     → API 가드
//
// 흐름 :
//   1) Supabase auth 쿠키로 user 조회
//   2) admin_users 테이블에서 role 조회
//   3) role 없거나 비활성 → 어드민 진입 거부
// ─────────────────────────────────────────────

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { MyAdminProfile, AdminRole } from './types'

/**
 * 본인 admin profile 조회 (없으면 null).
 * RPC get_my_admin_profile() 호출 — admin_users + auth.users JOIN.
 */
export async function getMyAdminProfile(): Promise<MyAdminProfile | null> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .rpc('get_my_admin_profile')

  if (error) {
    console.error('[getMyAdminProfile]', error)
    return null
  }

  if (!data || (Array.isArray(data) && data.length === 0)) return null

  // RPC 반환은 Table 타입이라 array. 첫 행만 반환
  const row = Array.isArray(data) ? data[0] : data
  return row as MyAdminProfile
}

/**
 * 어드민 진입 게이트.
 * 비로그인 → /admin/login
 * 로그인했지만 admin_users 미등록 → /admin/login?error=no_access
 */
export async function requireAdminProfile(): Promise<MyAdminProfile> {
  const profile = await getMyAdminProfile()
  if (!profile) {
    redirect('/admin/login?error=no_access')
  }
  return profile
}

/**
 * super_admin 전용 페이지 게이트.
 * super_admin 아니면 /admin 으로 redirect (404 대신 친절한 안내).
 */
export async function requireSuperAdmin(): Promise<MyAdminProfile> {
  const profile = await requireAdminProfile()
  if (profile.role !== 'super_admin') {
    redirect('/admin?error=forbidden')
  }
  return profile
}

/**
 * admin 이상 전용.
 */
export async function requireAdminOrAbove(): Promise<MyAdminProfile> {
  const profile = await requireAdminProfile()
  if (profile.role !== 'super_admin' && profile.role !== 'admin') {
    redirect('/admin?error=forbidden')
  }
  return profile
}

/**
 * API route 가드 — JSON 응답으로 401/403 처리.
 * 사용 예 :
 *   const guard = await guardApi(['super_admin'])
 *   if (!guard.ok) return guard.response
 *   const { profile } = guard
 */
type GuardOk = { ok: true; profile: MyAdminProfile }
type GuardFail = { ok: false; response: Response }

export async function guardApi(allowedRoles?: AdminRole[]): Promise<GuardOk | GuardFail> {
  const profile = await getMyAdminProfile()
  if (!profile) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }),
    }
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: 'forbidden', required: allowedRoles }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      }),
    }
  }

  return { ok: true, profile }
}
