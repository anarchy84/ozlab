// ─────────────────────────────────────────────
// HomeClient — 홈 페이지 전체 섹션 조립 (클라이언트)
//
// 왜 클라이언트 분리 :
//   - 편집 엔진(EditableText/EditableLink/MediaSlot) 이 모두 'use client'
//   - 서버에서 받은 blocks 맵을 props 로 내려주고, 섹션들은 각자 렌더
//   - page.tsx 는 서버 컴포넌트로 유지 (Supabase SSR 쿼리)
//
// 섹션 순서 (P5 기준) :
//   PromoStrip → Nav → Hero → Painpoints → Showcase → Features
//   → ReviewAutomation → PlacePlus → Mechanism → Pricing
//   → Promotion → Testimonials → FAQ → ApplyForm → Footer
//   → FloatingCTA (플로팅)
// ─────────────────────────────────────────────
'use client'

import type { ContentBlock } from '@/lib/content-blocks'
import type { CtaButton, CtaPlacement } from '@/lib/admin/types'
import type { LandingSlotsByKey } from '@/lib/landing-sections'

import { PromoStrip } from '@/components/sections/PromoStrip'
import { Nav } from '@/components/sections/Nav'
import { Hero } from '@/components/sections/Hero'
import { Painpoints } from '@/components/sections/Painpoints'
import { Showcase } from '@/components/sections/Showcase'
import { Features } from '@/components/sections/Features'
import { ReviewAutomation } from '@/components/sections/ReviewAutomation'
import { PlacePlus } from '@/components/sections/PlacePlus'
import { Mechanism } from '@/components/sections/Mechanism'
import { Pricing } from '@/components/sections/Pricing'
import { Promotion } from '@/components/sections/Promotion'
import { Testimonials } from '@/components/sections/Testimonials'
import { FAQ } from '@/components/sections/FAQ'
import { ApplyForm } from '@/components/sections/ApplyForm'
import { Footer } from '@/components/sections/Footer'
import { FloatingCTA } from '@/components/sections/FloatingCTA'
import { CtaTriggerHost } from '@/components/cta/CtaTriggerHost'
import { LandingSlot } from '@/components/landing/LandingSlot'

interface Props {
  blocks: Record<string, ContentBlock>
  ctasByPlacement: Partial<Record<CtaPlacement, CtaButton[]>>
  landingSlots: LandingSlotsByKey
}

export default function HomeClient({ blocks, ctasByPlacement, landingSlots }: Props) {
  // 자동 트리거 CTA (modal_form/floating_button/sticky_bar/toast) 모두 평탄화
  const allCtas = Object.values(ctasByPlacement).flat().filter(Boolean) as CtaButton[]
  const renderLandingSlot = (slotKey: string, label: string) => (
    <LandingSlot
      pagePath="/"
      slotKey={slotKey}
      label={label}
      items={landingSlots[slotKey]}
    />
  )

  return (
    <>
      <PromoStrip blocks={blocks} />
      <Nav blocks={blocks} ctas={ctasByPlacement.nav} />
      <Hero blocks={blocks} ctas={ctasByPlacement.hero} />
      {renderLandingSlot('home.after_hero', '홈 히어로 아래')}
      <Painpoints blocks={blocks} />
      {renderLandingSlot('home.after_painpoints', '불편 포인트 아래')}
      <Showcase blocks={blocks} ctas={ctasByPlacement.showcase} />
      {renderLandingSlot('home.after_showcase', '쇼케이스 아래')}
      <Features blocks={blocks} />
      {renderLandingSlot('home.after_features', '핵심 기능 아래')}
      <ReviewAutomation blocks={blocks} />
      {renderLandingSlot('home.after_review', '리뷰 자동화 아래')}
      <PlacePlus blocks={blocks} />
      {renderLandingSlot('home.after_placeplus', '플레이스+ 아래')}
      <Mechanism blocks={blocks} />
      {renderLandingSlot('home.after_mechanism', '작동 방식 아래')}
      <Pricing blocks={blocks} />
      {renderLandingSlot('home.after_pricing', '가격 안내 아래')}
      <Promotion blocks={blocks} ctas={ctasByPlacement.promotion} />
      {renderLandingSlot('home.after_promotion', '프로모션 아래')}
      <Testimonials blocks={blocks} />
      {renderLandingSlot('home.after_testimonials', '고객 후기 아래')}
      <FAQ blocks={blocks} />
      {renderLandingSlot('home.before_apply', 'FAQ 아래 · 상담폼 위')}
      <ApplyForm blocks={blocks} />
      <Footer blocks={blocks} ctas={ctasByPlacement.footer} />
      <FloatingCTA blocks={blocks} ctas={ctasByPlacement.floating} />
      {/* Phase 2B: cta_type 자동 트리거 (modal_form / floating_button / sticky_bar / toast) */}
      <CtaTriggerHost ctas={allCtas} pathname="/" />
    </>
  )
}
