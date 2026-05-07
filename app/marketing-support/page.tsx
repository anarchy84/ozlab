import type { Metadata } from 'next'
import { MarketingSupportLanding } from '@/components/sections/MarketingSupportLanding'
import { PublicPageFrame } from '@/components/sections/PublicPageFrame'
import { BlocksProvider } from '@/components/editable/BlocksProvider'
import { getBlocksForPage } from '@/lib/content-blocks-server'
import { blocksMapToRecord } from '@/lib/content-blocks'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbJsonLd, publicMetadata, serviceJsonLd } from '@/lib/seo'

export const revalidate = 0

export const metadata: Metadata = publicMetadata({
  title: '사업자 마케팅지원',
  description:
    'N커넥트페이 단말기 신청·교체 고객을 위한 5월 한정 플레이스 마케팅 무료 지원 이벤트를 확인하세요.',
  path: '/marketing-support',
  keywords: ['플레이스 마케팅', '플레이스 최적화', 'N커넥트 단말기', '블로그리뷰 지원', '매장 마케팅'],
})

export default async function MarketingSupportPage() {
  const blocksMap = await getBlocksForPage('/marketing-support')
  const blocks = blocksMapToRecord(blocksMap)
  return (
    <PublicPageFrame>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: '홈', path: '/' },
            { name: '사업자 마케팅지원', path: '/marketing-support' },
          ]),
          serviceJsonLd({
            name: 'N커넥트 플레이스 마케팅 무료 지원',
            description:
              'N커넥트페이 단말기 신청·교체 고객에게 플레이스 최적화 세팅, 유료광고비, 블로그리뷰 10건을 지원합니다.',
            path: '/marketing-support',
            serviceType: 'Local Place Marketing Support',
          }),
          {
            '@context': 'https://schema.org',
            '@type': 'Offer',
            name: '5월 한정 플레이스 마케팅 무료 지원',
            url: 'https://ozlabpay.kr/marketing-support',
            eligibleCustomerType: 'N커넥트페이 단말기 신청·교체 고객',
            itemOffered: {
              '@type': 'Service',
              name: '플레이스 최적화 세팅 + 유료광고비 + 블로그리뷰 10건',
            },
          },
        ]}
      />
      <BlocksProvider blocks={blocks}>
        <MarketingSupportLanding />
      </BlocksProvider>
    </PublicPageFrame>
  )
}
