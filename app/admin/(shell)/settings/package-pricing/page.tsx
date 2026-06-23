// ─────────────────────────────────────────────
// /admin/settings/package-pricing
//   마케팅 패키지 견적(/marketing-package 랜딩) 항목·단가·합계 관리.
//
// 권한 : super_admin / admin
//
// 단가를 입력하면 정상가 합계·절약액·할인율이 자동 계산되어 미리보기됩니다.
// 자동 발행 없음 — 저장 버튼을 눌러야 반영됩니다.
// ─────────────────────────────────────────────
import { requireAdminOrAbove } from '@/lib/admin/auth-helpers'
import { loadAllPackagePricing } from '@/lib/marketing-package-pricing-server'
import { PackagePricingManager } from './PackagePricingManager'

export const dynamic = 'force-dynamic'

export default async function PackagePricingPage() {
  await requireAdminOrAbove()
  const data = await loadAllPackagePricing()

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-ink-100">마케팅 패키지 견적 관리</h1>
        <p className="mt-1 text-sm text-ink-500">
          <code className="text-ink-300">/marketing-package</code> 랜딩의 견적표 항목·단가·합계를 관리합니다.
          저장하면 랜딩에 즉시 반영됩니다.
        </p>
      </header>

      <section className="rounded border border-ink-700 bg-surface-darkSoft p-4 text-sm text-ink-500">
        <h2 className="mb-2 font-semibold text-ink-100">사용 가이드</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>구분</strong> — 초기(1회성)와 월정기 두 그룹으로 나뉩니다. 월정기는 월 단가 + 연 단가를 함께 입력하세요.</li>
          <li><strong>단가</strong> — 숫자만 입력하면 됩니다(콤마·₩ 자동). 비활성 항목은 랜딩에 안 보이지만 데이터는 유지됩니다.</li>
          <li><strong>정상가 합계·절약액·할인율</strong>은 아래 미리보기에서 자동 계산됩니다.</li>
          <li><strong>정상가(수동)</strong>를 비워두면 항목 합계로 자동 계산되고, 값을 넣으면 그 값이 우선합니다.</li>
          <li>순서는 작은 숫자가 위로 올라옵니다 (10·20·30 단위 추천).</li>
        </ul>
      </section>

      <PackagePricingManager initial={data} />
    </div>
  )
}
