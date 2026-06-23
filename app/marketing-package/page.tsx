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
import { absoluteUrl, breadcrumbJsonLd, faqJsonLd, publicMetadata, serviceJsonLd } from '@/lib/seo'
import { mergePageMetadata } from '@/lib/admin/page-seo'

export const revalidate = 0

const PAGE_PATH = '/marketing-package'

export async function generateMetadata(): Promise<Metadata> {
  const base = publicMetadata({
    title: '매장 온라인 노출·운영 패키지 — 월 9.9만원부터',
    description:
      '플레이스·블로그·인스타그램·유튜브·틱톡·카카오까지, 매장에 필요한 온라인 노출 채널을 한 번에 세팅하고 매달 운영해 드립니다. 자체 10만 팔로워 채널 네트워크 노출 + 월 성과 리포트. Lite 9.9만 / Standard 20만 / Pro 39만.',
    path: PAGE_PATH,
    keywords: [
      '매장 마케팅',
      '자영업자 마케팅',
      '플레이스 마케팅',
      '네이버 플레이스 예약',
      '인스타 릴스 대행',
      '틱톡 쇼츠 대행',
      '블로그 SEO',
      '체험단 모집',
      '카카오톡 채널',
      '오즈랩페이',
    ],
  })
  return mergePageMetadata(PAGE_PATH, base)
}

export default async function MarketingPackagePage() {
  const [blocksMap, landingSlots] = await Promise.all([
    getBlocksForPage(PAGE_PATH),
    getLandingSlotsForPage(PAGE_PATH),
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
            { name: '매장 온라인 노출·운영 패키지', path: PAGE_PATH },
          ]),
          serviceJsonLd({
            name: '매장 온라인 노출·운영 패키지',
            description:
              '플레이스·블로그·인스타그램·유튜브·틱톡·카카오 채널을 한 번에 세팅하고 매달 운영하는 소상공인 마케팅 패키지. 자체 10만 팔로워 채널 네트워크 노출과 월 성과 리포트를 제공합니다.',
            path: PAGE_PATH,
            serviceType: 'Local Store Online Marketing Operation',
            keywords: ['플레이스 마케팅', '인스타 릴스 대행', '틱톡 쇼츠', '블로그 SEO', '체험단 모집', '카카오 단골 마케팅'],
            audience: '매장을 운영하는 소상공인 사장님',
            offerCatalog: [
              { name: 'Lite', description: '월 99,000원 · 시작하는 매장을 위한 기본 노출 운영' },
              { name: 'Standard', description: '월 200,000원 · 가장 많이 선택하는 멀티채널 운영' },
              { name: 'Pro', description: '월 390,000원 · 전담 매니저 + 본격 성장 운영' },
            ],
          }),
          {
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: '매장 온라인 노출·운영 패키지',
            url: absoluteUrl(PAGE_PATH),
            offers: [
              { '@type': 'Offer', name: 'Lite', price: '99000', priceCurrency: 'KRW' },
              { '@type': 'Offer', name: 'Standard', price: '200000', priceCurrency: 'KRW' },
              { '@type': 'Offer', name: 'Pro', price: '390000', priceCurrency: 'KRW' },
            ],
          },
          faqJsonLd(faqs),
        ]}
      />
      <BlocksProvider blocks={blocks}>
        <MarketingPackageLanding landingSlots={landingSlots} />
      </BlocksProvider>
    </PublicPageFrame>
  )
}
