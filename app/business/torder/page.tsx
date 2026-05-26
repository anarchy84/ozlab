import type { Metadata } from 'next'
import { PublicPageFrame } from '@/components/sections/PublicPageFrame'
import { ServiceLanding } from '@/components/sections/ServiceLanding'
import { BlocksProvider } from '@/components/editable/BlocksProvider'
import { serviceFaqsForBlocks, servicePages } from '@/lib/service-pages'
import { getBlocksForPage } from '@/lib/content-blocks-server'
import { getLandingSlotsForPage } from '@/lib/landing-sections-server'
import { blocksMapToRecord } from '@/lib/content-blocks'
import { landingFaqsForSlots } from '@/lib/landing-sections'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbJsonLd, faqJsonLd, publicMetadata, serviceJsonLd } from '@/lib/seo'
import { mergePageMetadata } from '@/lib/admin/page-seo'

export const revalidate = 0

export async function generateMetadata(): Promise<Metadata> {
  const base = publicMetadata({
    title: '테이블오더',
    description:
      '키오스크, 테이블오더, QR오더를 매장 동선과 POS 연동에 맞춰 설계하고 설치 상담까지 연결합니다.',
    path: '/business/torder',
    keywords: ['테이블오더', '키오스크', 'QR오더', 'POS 연동', '매장 주문 시스템'],
  })
  return mergePageMetadata('/business/torder', base)
}

export default async function TableOrderPage() {
  const [blocksMap, landingSlots] = await Promise.all([
    getBlocksForPage('/business/torder'),
    getLandingSlotsForPage('/business/torder'),
  ])
  const blocks = blocksMapToRecord(blocksMap)
  const data = servicePages.tableOrder
  const faqs = [
    ...serviceFaqsForBlocks(data, 'tableOrder', blocks),
    ...landingFaqsForSlots(landingSlots),
  ]
  return (
    <PublicPageFrame>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: '홈', path: '/' },
            { name: '테이블오더', path: '/business/torder' },
          ]),
          serviceJsonLd({
            name: '테이블오더·키오스크 도입 상담',
            description: data.hero.description,
            path: '/business/torder',
            serviceType: 'Table Ordering System Consultation',
            keywords: ['테이블오더', '키오스크', 'QR오더', 'POS 연동', '매장 주문 시스템'],
            audience: '식당, 카페, 프랜차이즈, 매장 운영자',
            offerCatalog: data.intro.cards.map((card) => ({
              name: card.title,
              description: card.desc,
            })),
          }),
          faqJsonLd(faqs),
        ]}
      />
      <BlocksProvider blocks={blocks}>
        <ServiceLanding
          data={data}
          pageKey="tableOrder"
          pagePath="/business/torder"
          landingSlots={landingSlots}
        />
      </BlocksProvider>
    </PublicPageFrame>
  )
}
