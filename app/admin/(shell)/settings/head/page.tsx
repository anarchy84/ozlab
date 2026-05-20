// ─────────────────────────────────────────────
// /admin/settings/head — 사이트 head 영역 동적 편집 (super_admin only)
//
// 구조:
//   - server component 가 권한 체크 + 초기 데이터 fetch
//   - 폼은 클라이언트 컴포넌트 HeadSettingsForm
// ─────────────────────────────────────────────

import { redirect } from 'next/navigation'
import { requireAdminProfile } from '@/lib/admin/auth-helpers'
import { getSiteSettings } from '@/lib/admin/site-settings'
import HeadSettingsForm from './HeadSettingsForm'

export const dynamic = 'force-dynamic'

export default async function HeadSettingsPage() {
  const profile = await requireAdminProfile()
  if (profile.role !== 'super_admin') {
    redirect('/admin?error=permission_denied')
  }

  const settings = await getSiteSettings()

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-100 break-keep">
          사이트 head 편집
        </h1>
        <p className="mt-1 text-sm text-ink-400 break-keep">
          GTM·GA4·픽셀·검색콘솔 토큰 + 자유 HTML. 저장 즉시 모든 퍼블릭 페이지 head 에 반영됩니다.
          어드민(/admin/*) 페이지에는 박히지 않아요.
        </p>
      </div>

      <HeadSettingsForm initial={settings} />
    </div>
  )
}
