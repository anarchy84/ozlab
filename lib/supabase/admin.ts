// ─────────────────────────────────────────────
// Supabase Admin (Service Role) 클라이언트
//
// ⚠️ 절대 클라이언트(브라우저) 코드에 import 하지 말 것.
//    이 키는 RLS 우회 가능 — 외부 노출 시 모든 데이터 노출 위험.
//
// 사용처 :
//   - app/api/admin/users/invite/route.ts → 사용자 초대 (auth.admin.inviteUserByEmail)
//   - app/api/admin/users/[id]/route.ts   → 사용자 영구 삭제 (auth.admin.deleteUser)
// ─────────────────────────────────────────────

import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'

// Database generated types 가 아직 없어서 any 스키마. Phase B 에서 supabase gen types 후 교체.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedAdminClient: SupabaseClient<any, 'public', any> | null = null

/**
 * Service Role 권한의 Supabase 클라이언트.
 * 환경변수 SUPABASE_SERVICE_ROLE_KEY 필요 (Vercel + .env.local).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createAdminClient(): SupabaseClient<any, 'public', any> {
  if (cachedAdminClient) return cachedAdminClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL 환경변수가 설정되지 않았습니다.')
  }
  if (!serviceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다. ' +
      'Vercel Project Settings → Environment Variables 에서 추가하세요.',
    )
  }

  cachedAdminClient = createSupabaseClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
  return cachedAdminClient
}
