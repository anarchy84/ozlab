// ─────────────────────────────────────────────
// /admin/media — 미디어 라이브러리 (server)
// ─────────────────────────────────────────────
import { requireAdminProfile } from '@/lib/admin/auth-helpers'
import MediaLibrary from './MediaLibrary'

export const dynamic = 'force-dynamic'

export default async function AdminMediaPage() {
  const profile = await requireAdminProfile()
  const canWrite =
    profile.role === 'super_admin' ||
    profile.role === 'admin' ||
    profile.role === 'marketer'
  const isSuperAdmin = profile.role === 'super_admin'

  return <MediaLibrary canWrite={canWrite} isSuperAdmin={isSuperAdmin} />
}
