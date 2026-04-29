// ─────────────────────────────────────────────
// /admin/settings/cta — CTA 버튼 관리 (super_admin 전용)
//
// 기능 :
//   - 6개 기본 CTA + 추가 CTA 목록
//   - 인라인 편집 (라벨/href/utm/style/순서)
//   - 활성 토글 / 신규 추가 / 삭제
//   - 각 CTA 의 신청·전환율 같이 표시 (v_cta_performance JOIN)
// ─────────────────────────────────────────────
import { requireSuperAdmin } from '@/lib/admin/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import type { CtaButton, CtaPerformanceRow } from '@/lib/admin/types'
import { CtaManager } from './CtaManager'

export const dynamic = 'force-dynamic'

export default async function CtaPage() {
  await requireSuperAdmin()

  const supabase = createClient()
  const [{ data: ctaData, error: e1 }, { data: perfData }] = await Promise.all([
    supabase.from('cta_buttons').select('*').order('placement').order('sort_order'),
    supabase.from('v_cta_performance').select('*'),
  ])

  const ctas: CtaButton[] = (ctaData as CtaButton[] | null) ?? []
  const perfList = (perfData as CtaPerformanceRow[] | null) ?? []

  // performance map (cta_id → row)
  const perfMap = new Map<number, CtaPerformanceRow>()
  for (const p of perfList) perfMap.set(p.cta_id, p)

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-ink-100">CTA 버튼 관리</h1>
        <p className="text-sm text-ink-400 mt-1">
          홈에 배치되는 모든 CTA 를 동적으로 관리합니다. 클릭 시 utm_campaign 이
          자동 부여되어 상담 신청에 어트리뷰션이 기록됩니다. super_admin 전용.
        </p>
      </header>

      {e1 && (
        <div className="rounded border border-red-800/50 bg-red-900/20 p-3 text-sm text-red-300">
          데이터 불러오기 오류: {e1.message}
        </div>
      )}

      <CtaManager initialCtas={ctas} initialPerfMap={Object.fromEntries(perfMap)} />

      <section className="rounded border border-ink-700 bg-surface-darkSoft p-4 text-sm text-ink-400">
        <h2 className="font-semibold text-ink-200 mb-2">사용 안내</h2>
        <ul className="space-y-1 list-disc pl-5">
          <li>
            <strong className="text-ink-200">placement</strong> = 페이지에서의 위치
            (nav/hero/showcase/promotion/floating/footer 등). 같은 placement 에 여러 CTA 가능.
          </li>
          <li>
            <strong className="text-ink-200">utm_campaign</strong> 은 신청자가 어떤 CTA 로 들어왔는지
            추적하는 키. 같은 캠페인 코드 사용 시 합쳐서 집계됨.
          </li>
          <li>
            <strong className="text-ink-200">target_href</strong> 는 보통 <code>#apply</code>
            (메인 폼). 외부 URL(전화/카톡)도 가능 — 그 경우 어트리뷰션 추적은 안 됨.
          </li>
          <li>
            <strong className="text-ink-200">style</strong> = 시각적 분기. primary/secondary/ghost/outline/floating.
            DynamicCTA 컴포넌트가 이 값을 보고 클래스를 적용.
          </li>
          <li>비활성(is_active=false) CTA 는 페이지에 안 보이지만 어드민 목록엔 남음.</li>
        </ul>
      </section>
    </div>
  )
}
