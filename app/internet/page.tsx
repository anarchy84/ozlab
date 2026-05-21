import type { Metadata } from 'next'
import { PublicPageFrame } from '@/components/sections/PublicPageFrame'
import { ServiceLanding } from '@/components/sections/ServiceLanding'
import { BlocksProvider } from '@/components/editable/BlocksProvider'
import { serviceFaqsForBlocks, servicePages } from '@/lib/service-pages'
import { getBlocksForPage } from '@/lib/content-blocks-server'
import { blocksMapToRecord } from '@/lib/content-blocks'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbJsonLd, faqJsonLd, publicMetadata, serviceJsonLd } from '@/lib/seo'

export const revalidate = 0

export const metadata: Metadata = publicMetadata({
  title: '사업자 인터넷',
  description:
    'SKT, KT, LG U+ 사업자 인터넷 요금과 설치 조건을 비교하고 POS, CCTV, 손님 Wi-Fi까지 안정적인 매장 네트워크를 상담받으세요.',
  path: '/internet',
  keywords: ['사업자 인터넷', '매장 인터넷', '고정 IP', 'POS 인터넷', 'CCTV 인터넷'],
})

export default async function InternetPage() {
  const blocksMap = await getBlocksForPage('/internet')
  const blocks = blocksMapToRecord(blocksMap)
  const data = servicePages.internet
  const faqs = serviceFaqsForBlocks(data, 'internet', blocks)
  return (
    <PublicPageFrame>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: '홈', path: '/' },
            { name: '사업자 인터넷', path: '/internet' },
          ]),
          serviceJsonLd({
            name: '사업자 인터넷 상담',
            description: data.hero.description,
            path: '/internet',
            serviceType: 'Business Internet Consultation',
            keywords: ['사업자 인터넷', '매장 인터넷', 'POS 인터넷', 'CCTV 인터넷', '고정 IP'],
            audience: '매장 운영자, 자영업자, 소상공인',
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
          pageKey="internet"
          pagePath="/internet"
        />
      </BlocksProvider>
    </PublicPageFrame>
  )
}
