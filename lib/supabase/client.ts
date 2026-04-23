// ─────────────────────────────────────────────
// 브라우저용 Supabase 클라이언트 (싱글톤)
//
// 싱글톤 이유 (2026-04-21) :
//   - @supabase/ssr 의 createBrowserClient 는 호출할 때마다 신규 인스턴스
//   - 인스턴스마다 자체 NavigatorLock 으로 auth 요청을 직렬화함
//   - 여러 인스턴스가 동시에 getUser() / onAuthStateChange 를 호출하면
//     "Lock ... was released because another request stole it" 런타임 에러
//   - 특히 인라인 편집 EditOverlay 가 페이지에 수십 개 깔릴 때 치명적
//
// 해결 :
//   - 모듈 스코프에 클라이언트 인스턴스를 1회만 생성해 캐싱
//   - 모든 컴포넌트가 같은 인스턴스 공유 → Lock 경쟁 사라짐
//   - HMR 대비 globalThis 에 저장해서 dev 리로드 시 중복 생성 방지
// ─────────────────────────────────────────────

import { createBrowserClient } from '@supabase/ssr'

type SupabaseBrowserClient = ReturnType<typeof createBrowserClient>

// HMR 안전 — dev 모드에서 모듈이 재평가되어도 기존 인스턴스 유지
const globalForSupabase = globalThis as unknown as {
  __supabaseBrowserClient?: SupabaseBrowserClient
}

export function createClient(): SupabaseBrowserClient {
  // 기존 인스턴스 있으면 그대로 반환
  if (globalForSupabase.__supabaseBrowserClient) {
    return globalForSupabase.__supabaseBrowserClient
  }

  // 최초 호출 시 1회만 생성
  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  globalForSupabase.__supabaseBrowserClient = client
  return client
}
