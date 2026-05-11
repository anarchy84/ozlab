// ─────────────────────────────────────────────
// /admin/settings/consultation-policy — 상담 DB 정책 관리
// ─────────────────────────────────────────────
import { redirect } from 'next/navigation'
import { requireAdminProfile } from '@/lib/admin/auth-helpers'
import { getConsultationPolicySettings } from '@/lib/consultation-policy-server'
import ConsultationPolicyManager from './ConsultationPolicyManager'

export const dynamic = 'force-dynamic'

export default async function ConsultationPolicyPage() {
  const profile = await requireAdminProfile()
  const allowed = ['super_admin', 'admin', 'marketing', 'tm_lead']
  if (!allowed.includes(profile.role)) {
    redirect('/admin?error=forbidden')
  }

  const settings = await getConsultationPolicySettings()

  return <ConsultationPolicyManager initialSettings={settings} />
}
