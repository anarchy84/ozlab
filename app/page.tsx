// ─────────────────────────────────────────────
// 오즈랩페이 홈 — 서버 컴포넌트
//
// 역할 :
//   - SSR 시점에 Supabase 에서 "/" 페이지의 content_blocks 전부 조회
//   - Map → Record 변환 후 HomeClient 로 props 전달
//   - 편집 엔진(EditableText/Link/MediaSlot)은 전부 클라 컴포넌트이므로
//     실제 렌더링은 HomeClient 가 담당
//
// P6 에서 추가 예정 :
//   - generateMetadata 동적 (OG 이미지 블록 반영)
//   - sitemap.xml / robots.txt
// ─────────────────────────────────────────────

import type { Metadata } from 'next'
import { getBlocksForPage } from '@/lib/content-blocks-server'
import { blocksMapToRecord } from '@/lib/content-blocks'
import { fetchCtasByPlacement } from '@/lib/cta-server'
import { landingFaqsForSlots } from '@/lib/landing-sections'
import { getLandingSlotsForPage } from '@/lib/landing-sections-server'
import HomeClient from './(home)/HomeClient'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbJsonLd, faqJsonLd, publicMetadata, SITE_DESCRIPTION } from '@/lib/seo'
import { homeFaqsForBlocks } from '@/lib/home-faqs'
import { mergePageMetadata } from '@/lib/admin/page-seo'

export const revalidate = 300

// 홈 페이지 — root layout generateMetadata 결과 + page_seo DB 머지
export async function generateMetadata(): Promise<Metadata> {
  return mergePageMetadata('/', publicMetadata({
    title: '네이버 카드 단말기 · 네이버 POS기',
    description: SITE_DESCRIPTION,
    path: '/',
    keywords: [
      '네이버 카드 단말기',
      '네이버 카드 결제기',
      '네이버포스기',
      '네이버포스',
      '네이버 POS',
      '포스기',
      '포스단말기',
      '결제포스기',
      '애플페이포스기',
      '애플페이결제단말기',
    ],
  }))
}

export default async function HomePage() {
  // 병렬로 콘텐츠 블록 + CTA 마스터 + 랜딩 슬롯 조회
  const [blocksMap, ctasByPlacement, landingSlots] = await Promise.all([
    getBlocksForPage('/'),
    fetchCtasByPlacement(),
    getLandingSlotsForPage('/'),
  ])
  const blocks = blocksMapToRecord(blocksMap)

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([{ name: '홈', path: '/' }]),
          faqJsonLd([...homeFaqsForBlocks(blocks), ...landingFaqsForSlots(landingSlots)]),
        ]}
      />
      <HomeClient
        blocks={blocks}
        ctasByPlacement={ctasByPlacement}
        landingSlots={landingSlots}
      />
    </>
  )
}
