// ─────────────────────────────────────────────
// /admin/settings/product-sync — 상품표 시트 sync 설정·실행
// ─────────────────────────────────────────────
import { redirect } from 'next/navigation'
import { requireAdminProfile } from '@/lib/admin/auth-helpers'
import ProductSyncManager from './ProductSyncManager'

export const dynamic = 'force-dynamic'

export default async function ProductSyncPage() {
  const profile = await requireAdminProfile()
  const allowed = ['super_admin', 'admin', 'marketer', 'marketing']
  if (!allowed.includes(profile.role)) {
    redirect('/admin?error=forbidden')
  }
  return <ProductSyncManager />
}
