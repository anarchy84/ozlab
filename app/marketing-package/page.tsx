import type { Metadata } from 'next'
import { MarketingPackageLanding } from '@/components/sections/MarketingPackageLanding'
import { PublicPageFrame } from '@/components/sections/PublicPageFrame'
import { BlocksProvider } from '@/components/editable/BlocksProvider'
import { getBlocksForPage } from '@/lib/content-blocks-server'
import { landingFaqsForSlots } from '@/lib/landing-sections'
import { getLandingSlotsForPage } from '@/lib/landing-sections-server'
import { blocksMapToRecord } from '@/lib/content-blocks'
import { JsonLd } from '@/components/seo/JsonLd'
import { marketingPackageFaqsForBlocks } from '@/lib/marketing-package-faqs'
import { loadPackagePricing } from '@/lib/marketing-package-pricing-server'
import { absoluteUrl, breadcrumbJsonLd, faqJsonLd, publicMetadata, serviceJsonLd } from '@/lib/seo'
import { mergePageMetadata } from '@/lib/admin/page-seo'

export const revalidate = 0

const PAGE_PATH = '/marketing-package'

export async function generateMetadata(): Promise<Metadata> {
  const base = publicMetadata({
    title: '매장 마케팅 패키지 — 월 12만 5천원',
    description:
      'N페이커넥트 가입 사장님 한정. 정상가 2,005만원짜리 매장 통합 마케팅 패키지(AI 콘텐츠·광고 운영·플레이스 SEO·인플루언서)를 연간 150만원에. 92.5% 할인.',
    path: PAGE_PATH,
    keywords: [
      '매장 마케팅',
      '자영업자 마케팅',
      '플레이스 SEO',
      '네이버 플레이스',
      '인스타 릴스 대행',
      '블로그 SEO',
      'AI 콘텐츠',
      '오즈랩페이',
      'N페이커넥트',
    ],
  })
  return mergePageMetadata(PAGE_PATH, base)
}

export default async function MarketingPackagePage() {
  const [blocksMap, landingSlots, pricing] = await Promise.all([
    getBlocksForPage(PAGE_PATH),
    getLandingSlotsForPage(PAGE_PATH),
    loadPackagePricing(),
  ])
  const blocks = blocksMapToRecord(blocksMap)
  const faqs = [
    ...marketingPackageFaqsForBlocks(blocks),
    ...landingFaqsForSlots(landingSlots),
  ]

  return (
    <PublicPageFrame>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: '홈', path: '/' },
            { name: '매장 마케팅 패키지', path: PAGE_PATH },
          ]),
          serviceJsonLd({
            name: '매장 통합 마케팅 패키지 (월 12만 5천원)',
            description:
              'AI 콘텐츠 제작, 광고 운영, 멀티 채널 관리, 바이럴·인플루언서까지 매장 마케팅에 필요한 12종을 통합 운영하는 연간 패키지입니다.',
            path: PAGE_PATH,
            serviceType: 'Local Store Marketing Package',
            keywords: ['매장 마케팅', '플레이스 SEO', 'AI 콘텐츠', '광고 운영 대행', '인플루언서 마케팅'],
            audience: 'N페이커넥트 가입 또는 매장 운영 사장님',
            offerCatalog: [
              { name: 'AI 콘텐츠 자동 제작', description: '숏폼 영상·로컬 SEO 블로그 월 각 4건' },
              { name: '광고 운영 풀세팅', description: '네이버·메타·플레이스·틱톡 4대 매체 운영·최적화' },
              { name: '멀티 채널 관리', description: '인스타·틱톡·유튜브·플레이스 자동 분배 및 모니터링' },
              { name: '바이럴 + 인플루언서', description: '지역 체험단 상시 모집 + 마이크로 인플루언서 매칭' },
            ],
          }),
          {
            '@context': 'https://schema.org',
            '@type': 'Offer',
            name: '연간 계약 특가 — 92.5% 할인',
            url: absoluteUrl(PAGE_PATH),
            price: '1500000',
            priceCurrency: 'KRW',
            eligibleCustomerType: 'N페이커넥트 가입 사장님 우대 (미가입 매장 동일가 신청 가능)',
            itemOffered: {
              '@type': 'Service',
              name: '매장 통합 마케팅 패키지 12종 (초기 세팅 4종 + 월 정기 8종)',
            },
          },
          faqJsonLd(faqs),
        ]}
      />
      <BlocksProvider blocks={blocks}>
        <MarketingPackageLanding landingSlots={landingSlots} pricing={pricing} />
      </BlocksProvider>
    </PublicPageFrame>
  )
}
