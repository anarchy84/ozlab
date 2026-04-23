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

interface Props {
  blocks: Record<string, ContentBlock>
}

export default function HomeClient({ blocks }: Props) {
  return (
    <>
      <PromoStrip blocks={blocks} />
      <Nav blocks={blocks} />
      <Hero blocks={blocks} />
      <Painpoints blocks={blocks} />
      <Showcase blocks={blocks} />
      <Features blocks={blocks} />
      <ReviewAutomation blocks={blocks} />
      <PlacePlus blocks={blocks} />
      <Mechanism blocks={blocks} />
      <Pricing blocks={blocks} />
      <Promotion blocks={blocks} />
      <Testimonials blocks={blocks} />
      <FAQ blocks={blocks} />
      <ApplyForm blocks={blocks} />
      <Footer blocks={blocks} />
      <FloatingCTA blocks={blocks} />
    </>
  )
}
