// ─────────────────────────────────────────────
// /admin/settings/blacklist — 블랙리스트 관리
// ─────────────────────────────────────────────
import { requireAdminOrAbove } from '@/lib/admin/auth-helpers'
import BlacklistManager from './BlacklistManager'

export const dynamic = 'force-dynamic'

export default async function BlacklistPage() {
  await requireAdminOrAbove()
  return <BlacklistManager />
}
