// ─────────────────────────────────────────────
// 인라인 편집 — 관리자 권한 체크 전역 컨텍스트
//
// 왜 필요한가 :
//   - 기존 useAdminGuard 훅은 EditOverlay 하나당 한 번씩 호출됐음
//   - 각 훅 인스턴스가 supabase.auth.getUser() + onAuthStateChange() 를
//     독립적으로 구독 → Supabase GoTrueClient 내부의 NavigatorLock 경쟁
//   - EditOverlay 가 많이 뜨는 페이지(ProductDeepDive 등) 에서
//     "Lock was released because another request stole it" 에러 터짐
//
// 해결 :
//   - 앱 전체에서 딱 1번만 auth 체크하는 Provider 를 루트에 두고
//   - 모든 훅은 이 Context 값을 "읽기만" 하도록 변경
//   - 네트워크 호출과 Lock 경쟁이 N번 → 1번으로 축소
//
// 주의 :
//   - 비로그인 방문자에게도 렌더는 되지만 Supabase 호출은 1회뿐이라 오버헤드 거의 0
//   - 실제 쓰기 권한은 서버 RLS + PATCH API 에서 보장됨 (이 가드는 UI 힌트용)
// ─────────────────────────────────────────────

'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export interface AdminGuardState {
  /** 로딩 중 — 초기 렌더 때 깜빡임 방지용 */
  loading: boolean
  /** 로그인 사용자 (없으면 null) */
  user: User | null
  /** 관리자 권한이 있는지 — 현재는 로그인 여부와 동일 */
  isAdmin: boolean
}

// 기본값 — Provider 없이 쓰여도 터지지 않게 안전값
const DEFAULT_STATE: AdminGuardState = {
  loading: true,
  user: null,
  isAdmin: false,
}

const AdminGuardContext = createContext<AdminGuardState>(DEFAULT_STATE)

// -------------------------------------------------------------
// Provider — 앱 루트에 딱 1번만 주입
//   · getUser() 최초 1회
//   · onAuthStateChange() 구독 1개만 유지
// -------------------------------------------------------------
export function AdminGuardProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AdminGuardState>(DEFAULT_STATE)

  useEffect(() => {
    const supabase = createClient()
    let mounted = true

    // 초기 사용자 조회 — 전체 앱에서 단 1회
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!mounted) return
      setState({
        loading: false,
        user,
        isAdmin: !!user,
      })
    })

    // 로그인/로그아웃 이벤트 구독 — 세션 만료 시 자동 반영
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setState({
        loading: false,
        user: session?.user ?? null,
        isAdmin: !!session?.user,
      })
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  return (
    <AdminGuardContext.Provider value={state}>
      {children}
    </AdminGuardContext.Provider>
  )
}

// -------------------------------------------------------------
// Hook — Context 값을 읽기만 함
//   · 기존 useAdminGuard 훅 시그니처 유지용 (별도 파일에서 re-export)
// -------------------------------------------------------------
export function useAdminGuardContext(): AdminGuardState {
  return useContext(AdminGuardContext)
}
