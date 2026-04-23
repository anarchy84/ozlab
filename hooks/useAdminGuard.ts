// ─────────────────────────────────────────────
// 인라인 편집 — 클라이언트 admin 여부 훅
//
// 역할 :
//   - 현재 로그인 사용자 및 admin 여부를 반환
//   - 원래는 이 훅 내부에서 supabase.auth.getUser() 를 직접 호출했지만
//     EditOverlay 하나당 한 번씩 호출되면서 NavigatorLock 경쟁이 발생해
//     "Lock was released because another request stole it" 에러가 뜸
//
// 변경 (2026-04-21) :
//   - 실제 Supabase 호출은 <AdminGuardProvider> 에서 앱당 1회만 수행
//   - 이 훅은 Context 값을 읽기만 하는 얇은 래퍼로 변경
//   - 시그니처(AdminGuardState) 는 그대로 유지 → EditOverlay/EditorModal/HomeClient
//     코드 변경 없이 자동으로 Lock 경쟁 해소
//
// 사용처 :
//   - EditableText / EditableImage / EditableLink 래퍼에서
//     "편집 오버레이 보여줄지 말지" 판단
//   - Header 관리자 메뉴 표시 여부
//
// 주의 :
//   - 이 훅은 "UI 힌트"용이지 진짜 권한 체크는 아님.
//     실제 쓰기 권한은 RLS + 서버 API auth.getUser() 로 보장됨.
// ─────────────────────────────────────────────

'use client'

import {
  useAdminGuardContext,
  type AdminGuardState,
} from '@/components/editable/AdminGuardProvider'

export type { AdminGuardState }

export function useAdminGuard(): AdminGuardState {
  return useAdminGuardContext()
}
