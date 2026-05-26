import type { Metadata } from 'next'
import { BlocksProvider } from '@/components/editable/BlocksProvider'
import { PublicPageFrame } from '@/components/sections/PublicPageFrame'
import { ServiceLanding } from '@/components/sections/ServiceLanding'
import { JsonLd } from '@/components/seo/JsonLd'
import { blocksMapToRecord } from '@/lib/content-blocks'
import { getBlocksForPage } from '@/lib/content-blocks-server'
import { getLandingSlotsForPage } from '@/lib/landing-sections-server'
import { serviceFaqsForBlocks, servicePages } from '@/lib/service-pages'
import { landingFaqsForSlots } from '@/lib/landing-sections'
import { breadcrumbJsonLd, faqJsonLd, publicMetadata, serviceJsonLd } from '@/lib/seo'

export const revalidate = 0

export const metadata: Metadata = publicMetadata({
  title: '애플페이 포스기 · 애플페이 결제 단말기 상담',
  description:
    '애플페이포스기, 애플페이결제단말기 도입 전 NFC 단말기 호환 여부, POS 매출 반영, 네이버페이 동시 결제 구성을 확인하세요.',
  path: '/apple-pay-pos',
  keywords: [
    '애플페이포스기',
    '애플페이결제단말기',
    '애플페이 포스기',
    '애플페이 결제 단말기',
    'NFC 카드 단말기',
    '간편결제 단말기',
  ],
})

export default async function ApplePayPosPage() {
  const [blocksMap, landingSlots] = await Promise.all([
    getBlocksForPage('/apple-pay-pos'),
    getLandingSlotsForPage('/apple-pay-pos'),
  ])
  const blocks = blocksMapToRecord(blocksMap)
  const data = servicePages.applePayPos
  const faqs = [
    ...serviceFaqsForBlocks(data, 'applePayPos', blocks),
    ...landingFaqsForSlots(landingSlots),
  ]

  return (
    <PublicPageFrame>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: '홈', path: '/' },
            { name: '애플페이 POS', path: '/apple-pay-pos' },
          ]),
          serviceJsonLd({
            name: '애플페이 포스기 · 애플페이 결제 단말기 상담',
            description: data.hero.description,
            path: '/apple-pay-pos',
            serviceType: 'Apple Pay POS and NFC Payment Terminal Consultation',
            keywords: [
              '애플페이포스기',
              '애플페이결제단말기',
              '애플페이 포스기',
              '애플페이 결제 단말기',
              'NFC 단말기',
              '간편결제 단말기',
            ],
            audience: '애플페이와 간편결제 도입을 검토하는 매장 운영자',
            offerCatalog: data.catalog.cards.map((card) => ({
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
          pageKey="applePayPos"
          pagePath="/apple-pay-pos"
          landingSlots={landingSlots}
        />
      </BlocksProvider>
    </PublicPageFrame>
  )
}
