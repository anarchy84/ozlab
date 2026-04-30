// ─────────────────────────────────────────────
// /admin/settings/products — 상품 카탈로그 관리
// 권한 : super_admin / admin / marketer
// ─────────────────────────────────────────────
import { redirect } from 'next/navigation'
import { requireAdminProfile } from '@/lib/admin/auth-helpers'
import ProductsManager from './ProductsManager'

export const dynamic = 'force-dynamic'

export default async function AdminProductsPage() {
  const profile = await requireAdminProfile()
  if (
    profile.role !== 'super_admin' &&
    profile.role !== 'admin' &&
    profile.role !== 'marketer'
  ) {
    redirect('/admin?error=forbidden')
  }
  return <ProductsManager myRole={profile.role} />
}
