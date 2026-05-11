// ─────────────────────────────────────────────
// /admin/settings/consultation-policy — 상담 DB 정책 관리
// ─────────────────────────────────────────────
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function ConsultationPolicyPage() {
  redirect('/admin/settings/distribution')
}
