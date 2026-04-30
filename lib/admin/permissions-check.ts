// ─────────────────────────────────────────────
// 권한 체크 헬퍼 (서버사이드)
//
// 사용 :
//   const can = await hasPermission(profile.role, 'revenue.edit')
//   if (!can) return forbidden()
//
// role → permissions 캐시 (요청 단위 — 매번 DB 조회 부담 감소)
// ─────────────────────────────────────────────

import { createAdminClient } from '@/lib/supabase/admin'
import type { AdminRole, PermissionCode } from './types'

const cache = new Map<AdminRole, Set<PermissionCode>>()

async function loadRolePermissions(role: AdminRole): Promise<Set<PermissionCode>> {
  const cached = cache.get(role)
  if (cached) return cached

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('role_permissions')
    .select('permission_code')
    .eq('role_code', role)

  if (error) {
    console.error('[loadRolePermissions]', error)
    return new Set()
  }

  const set = new Set((data ?? []).map((r: { permission_code: string }) => r.permission_code as PermissionCode))
  cache.set(role, set)
  return set
}

export async function hasPermission(role: AdminRole, perm: PermissionCode): Promise<boolean> {
  // super_admin 은 무조건 통과 (DB 캐시 무시)
  if (role === 'super_admin') return true
  const perms = await loadRolePermissions(role)
  return perms.has(perm)
}

/** 캐시 무효화 — 매트릭스 편집 직후 호출 */
export function invalidatePermissionsCache() {
  cache.clear()
}
