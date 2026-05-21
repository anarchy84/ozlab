import type { Metadata } from 'next'
import { BlocksProvider } from '@/components/editable/BlocksProvider'
import { PublicPageFrame } from '@/components/sections/PublicPageFrame'
import { ServiceLanding } from '@/components/sections/ServiceLanding'
import { JsonLd } from '@/components/seo/JsonLd'
import { blocksMapToRecord } from '@/lib/content-blocks'
import { getBlocksForPage } from '@/lib/content-blocks-server'
import { serviceFaqsForBlocks, servicePages } from '@/lib/service-pages'
import { breadcrumbJsonLd, faqJsonLd, publicMetadata, serviceJsonLd } from '@/lib/seo'

export const revalidate = 0

export const metadata: Metadata = publicMetadata({
  title: '네이버 카드 단말기 · 네이버 POS기 도입 상담',
  description:
    '네이버 카드 단말기, 네이버 카드 결제기, 네이버포스기, 네이버 POS, 포스단말기, 결제포스기 도입과 교체를 매장 상황에 맞춰 상담합니다.',
  path: '/naver-pos',
  keywords: [
    '네이버 카드 단말기',
    '네이버 카드 결제기',
    '네이버포스기',
    '네이버포스',
    '네이버 POS',
    '네이버 pos',
    '포스기',
    '포스단말기',
    '결제포스',
    '결제포스기',
  ],
})

export default async function NaverPosPage() {
  const blocksMap = await getBlocksForPage('/naver-pos')
  const blocks = blocksMapToRecord(blocksMap)
  const data = servicePages.naverPos
  const faqs = serviceFaqsForBlocks(data, 'naverPos', blocks)

  return (
    <PublicPageFrame>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: '홈', path: '/' },
            { name: '네이버 POS', path: '/naver-pos' },
          ]),
          serviceJsonLd({
            name: '네이버 카드 단말기 · 네이버 POS 도입 상담',
            description: data.hero.description,
            path: '/naver-pos',
            serviceType: 'Naver Pay POS and Card Terminal Consultation',
            keywords: [
              '네이버 카드 단말기',
              '네이버 카드 결제기',
              '네이버포스기',
              '네이버포스',
              '네이버 POS',
              '포스단말기',
              '결제포스기',
            ],
            audience: '네이버페이 결제와 플레이스 마케팅을 함께 운영하려는 매장 운영자',
            offerCatalog: data.catalog.cards.map((card) => ({
              name: card.title,
              description: card.desc,
            })),
          }),
          faqJsonLd(faqs),
        ]}
      />
      <BlocksProvider blocks={blocks}>
        <ServiceLanding data={data} pageKey="naverPos" pagePath="/naver-pos" />
      </BlocksProvider>
    </PublicPageFrame>
  )
}
