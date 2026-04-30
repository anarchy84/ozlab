// ─────────────────────────────────────────────
// /admin/settings/ad-sync — 광고 시트 sync 설정·실행 (super_admin/marketing/admin)
// ─────────────────────────────────────────────
import { redirect } from 'next/navigation'
import { requireAdminProfile } from '@/lib/admin/auth-helpers'
import AdSyncManager from './AdSyncManager'

export const dynamic = 'force-dynamic'

export default async function AdSyncPage() {
  const profile = await requireAdminProfile()
  const allowed = ['super_admin', 'marketing', 'admin']
  if (!allowed.includes(profile.role)) {
    redirect('/admin?error=forbidden')
  }
  return <AdSyncManager />
}
