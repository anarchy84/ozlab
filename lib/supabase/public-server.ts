import 'server-only'

import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'

// 공개 페이지 SSR/ISR 전용 Supabase 클라이언트.
// lib/supabase/server.ts 는 cookies() 를 읽기 때문에 public landing render 를
// 동적/no-store 로 밀기 쉽다. 여기서는 인증 세션이 필요 없는 공개 데이터만
// anon key 로 읽어서 Next/Vercel 캐시가 정상 작동하게 한다.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedPublicClient: SupabaseClient<any, 'public', any> | null = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createPublicServerClient(): SupabaseClient<any, 'public', any> {
  if (cachedPublicClient) return cachedPublicClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL 환경변수가 설정되지 않았습니다.')
  }
  if (!anonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY 환경변수가 설정되지 않았습니다.')
  }

  cachedPublicClient = createSupabaseClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })
  return cachedPublicClient
}
