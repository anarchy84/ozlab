// ─────────────────────────────────────────────
// /admin/content — 콘텐츠 글 관리 (server)
// ─────────────────────────────────────────────
import { requireAdminProfile } from '@/lib/admin/auth-helpers'
import ContentManager from './ContentManager'

export const dynamic = 'force-dynamic'

export default async function AdminContentPage() {
  const profile = await requireAdminProfile()
  return <ContentManager myRole={profile.role} myName={profile.display_name ?? profile.email} />
}
