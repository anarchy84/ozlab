// ─────────────────────────────────────────────
// 어드민 권한 헬퍼 (UI · 클라이언트 사이드)
//
// 서버 사이드 권한 체크는 RLS + API route 가드에서 함.
// 이 파일은 UI 라벨·뱃지·버튼 disable 등 "표시" 결정용.
// ─────────────────────────────────────────────

import type { AdminRole } from './types'

// ----- 한글 라벨 -----
export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: '최고관리자',
  admin: '운영자',
  counselor: '상담사',
  marketer: '마케터',
  viewer: '뷰어',
}

// ----- 뱃지 색상 (Tailwind class) -----
export const ROLE_BADGE_CLASSES: Record<AdminRole, string> = {
  super_admin: 'bg-purple-100 text-purple-800 border-purple-200',
  admin: 'bg-blue-100 text-blue-800 border-blue-200',
  counselor: 'bg-green-100 text-green-800 border-green-200',
  marketer: 'bg-amber-100 text-amber-800 border-amber-200',
  viewer: 'bg-ink-100 text-ink-700 border-ink-200',
}

// ----- 이모지 (헤더·목록에서 시각적 구분) -----
export const ROLE_EMOJI: Record<AdminRole, string> = {
  super_admin: '👑',
  admin: '🛠',
  counselor: '👤',
  marketer: '📊',
  viewer: '👁',
}

// ----- 권한 체크 (UI 분기용) -----

export function isSuperAdmin(role: AdminRole | null | undefined): boolean {
  return role === 'super_admin'
}

export function isAdminOrAbove(role: AdminRole | null | undefined): boolean {
  return role === 'super_admin' || role === 'admin'
}

export function canManageUsers(role: AdminRole | null | undefined): boolean {
  return isSuperAdmin(role)
}

export function canManageStatuses(role: AdminRole | null | undefined): boolean {
  return isSuperAdmin(role)
}

export function canManageBlocklist(role: AdminRole | null | undefined): boolean {
  return isAdminOrAbove(role)
}

export function canEditConsultation(
  role: AdminRole | null | undefined,
  counselorId: string | null | undefined,
  myUserId: string | null | undefined,
): boolean {
  if (!role) return false
  // super_admin / admin / marketer 는 전체 편집 가능
  if (role === 'super_admin' || role === 'admin') return true
  // counselor 는 본인 배정 건만
  if (role === 'counselor') return counselorId === myUserId
  // marketer / viewer 는 편집 불가
  return false
}

// ----- 초대 가능 role 목록 (super_admin은 별도 워크플로우) -----
export const INVITABLE_ROLES: AdminRole[] = ['admin', 'counselor', 'marketer', 'viewer']
