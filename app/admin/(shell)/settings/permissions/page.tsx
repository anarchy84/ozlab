// ─────────────────────────────────────────────
// /admin/settings/permissions — role × permission 매트릭스 (super_admin 전용)
// ─────────────────────────────────────────────
import { requireSuperAdmin } from '@/lib/admin/auth-helpers'
import PermissionsMatrix from './PermissionsMatrix'

export const dynamic = 'force-dynamic'

export default async function AdminPermissionsPage() {
  await requireSuperAdmin()
  return <PermissionsMatrix />
}
