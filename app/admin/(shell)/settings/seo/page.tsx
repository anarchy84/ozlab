// ─────────────────────────────────────────────
// /admin/settings/seo — 페이지별 SEO 메타 + OG 이미지 어드민 (super_admin)
// ─────────────────────────────────────────────

import { redirect } from 'next/navigation'
import { requireAdminProfile } from '@/lib/admin/auth-helpers'
import { listPageSeo } from '@/lib/admin/page-seo'
import SeoSettingsClient from './SeoSettingsClient'

export const dynamic = 'force-dynamic'

export default async function SeoSettingsPage() {
  const profile = await requireAdminProfile()
  if (profile.role !== 'super_admin') {
    redirect('/admin?error=permission_denied')
  }

  const pages = await listPageSeo()

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-100 break-keep">페이지 SEO · OG 이미지</h1>
        <p className="mt-1 text-sm text-ink-400 break-keep">
          페이지별로 메타 제목·설명 + OG 이미지(1200×630)를 등록하면 검색·카카오톡·페이스북
          공유 미리보기에 반영됩니다. 비어두면 사이트 기본값 사용.
        </p>
      </div>

      <SeoSettingsClient initialPages={pages} />
    </div>
  )
}
