// ─────────────────────────────────────────────
// /admin/settings/distribution — DB 자동배분 정책 + 재분배 (super_admin/마케팅/TM실장)
// ─────────────────────────────────────────────
import { redirect } from 'next/navigation'
import { requireAdminProfile } from '@/lib/admin/auth-helpers'
import DistributionManager from './DistributionManager'

export const dynamic = 'force-dynamic'

export default async function DistributionPage() {
  const profile = await requireAdminProfile()
  const allowed = ['super_admin', 'marketing', 'tm_lead', 'admin']
  if (!allowed.includes(profile.role)) {
    redirect('/admin?error=forbidden')
  }
  return <DistributionManager />
}
