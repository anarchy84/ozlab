// ─────────────────────────────────────────────
// /admin/settings/consultation-options
//   상담 입력 5개 필드(업종/지역/단말기/약정/통화시간) 드롭다운 옵션 관리.
//
// 권한 : super_admin / admin
//
// 신입사원이 직접 옵션을 추가/숨김/순서변경할 수 있도록 인라인 편집 UI 제공.
// ─────────────────────────────────────────────
import { requireAdminOrAbove } from '@/lib/admin/auth-helpers'
import { loadAllConsultationOptions } from '@/lib/consultation-options-server'
import { ConsultationOptionsManager } from './OptionsManager'

export const dynamic = 'force-dynamic'

export default async function ConsultationOptionsPage() {
  const profile = await requireAdminOrAbove()
  const options = await loadAllConsultationOptions()

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-ink-100">상담 옵션 관리</h1>
        <p className="text-sm text-ink-500 mt-1">
          상담 신청 폼과 상담 상세 모달에서 사용되는 드롭다운 옵션을 관리합니다.
          여기서 추가하면 랜딩 페이지·CTA 위자드·어드민 모달에 즉시 반영됩니다.
        </p>
      </header>

      <section className="rounded border border-ink-700 bg-surface-darkSoft p-4 text-sm text-ink-500">
        <h2 className="font-semibold text-ink-100 mb-2">사용 가이드</h2>
        <ul className="space-y-1 list-disc pl-5">
          <li>옵션 입력 후 <strong>Enter</strong> 또는 <strong>+ 추가</strong> 버튼으로 등록됩니다.</li>
          <li><strong>순서</strong>는 작은 숫자가 위로 올라옵니다 (10·20·30 단위 추천).</li>
          <li>옵션을 잠시 숨기고 싶다면 <strong>활성</strong> 체크를 끄세요. 과거 데이터는 그대로 유지됩니다.</li>
          <li><strong>삭제</strong>는 옵션 마스터에서만 제거되며, 이미 저장된 상담 데이터는 자유 텍스트로 남아 있습니다.</li>
          <li>옵션에 없는 값이 필요한 고객은 모달의 <strong>직접입력</strong>으로 처리됩니다.</li>
        </ul>
      </section>

      <ConsultationOptionsManager initialOptions={options} currentUserRole={profile.role} />
    </div>
  )
}
