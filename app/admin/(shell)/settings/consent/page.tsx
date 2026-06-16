// ─────────────────────────────────────────────
// /admin/settings/consent — 선택 동의 항목 관리 (super_admin / admin)
//
// 구조:
//   - server component 가 권한 체크 + 초기 데이터 fetch
//   - 편집 폼은 클라이언트 컴포넌트 ConsentManager
// ─────────────────────────────────────────────

import { redirect } from 'next/navigation'
import { requireAdminProfile } from '@/lib/admin/auth-helpers'
import { getConsentSettings } from '@/lib/consent-server'
import ConsentManager from './ConsentManager'

export const dynamic = 'force-dynamic'

export default async function ConsentSettingsPage() {
  const profile = await requireAdminProfile()
  if (!['super_admin', 'admin'].includes(profile.role)) {
    redirect('/admin?error=permission_denied')
  }

  const settings = await getConsentSettings()

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-100 break-keep">동의 항목 관리</h1>
        <p className="mt-1 text-sm text-ink-400 break-keep">
          상담 신청 폼의 <b>동의 항목 3종</b>(필수: 개인정보 수집·이용 · 제3자 제공 / 선택: 마케팅 수신)을 관리합니다.
          체크박스 옆 문구와 &lsquo;전문 보기&rsquo;에 뜨는 약관 전문을 직접 수정할 수 있고, 선택 항목은 노출을 켜고 끌 수 있어요.
          폼에서는 &lsquo;전체 동의&rsquo;를 누르면 한 번에 모두 체크됩니다. 저장하면 모든 신청 폼에 반영됩니다. (외부 반영까지 최대 10분)
        </p>
      </div>

      <ConsentManager initial={settings} />
    </div>
  )
}
