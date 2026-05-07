import type { Metadata } from 'next'
import { PublicPageFrame } from '@/components/sections/PublicPageFrame'
import { ServiceLanding } from '@/components/sections/ServiceLanding'
import { BlocksProvider } from '@/components/editable/BlocksProvider'
import { servicePages } from '@/lib/service-pages'
import { getBlocksForPage } from '@/lib/content-blocks-server'
import { blocksMapToRecord } from '@/lib/content-blocks'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbJsonLd, faqJsonLd, publicMetadata, serviceJsonLd } from '@/lib/seo'

export const revalidate = 0

export const metadata: Metadata = publicMetadata({
  title: 'CCTV',
  description:
    '매장 크기와 구조에 맞는 CCTV 채널 수, 카메라 종류, 원격 확인 구성을 오즈랩페이 스타일로 상담합니다.',
  path: '/business/cctv',
  keywords: ['매장 CCTV', '사업장 CCTV', '원격 CCTV', 'CCTV 설치', '무선 CCTV'],
})

export default async function CctvPage() {
  const blocksMap = await getBlocksForPage('/business/cctv')
  const blocks = blocksMapToRecord(blocksMap)
  const data = servicePages.cctv
  return (
    <PublicPageFrame>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: '홈', path: '/' },
            { name: 'CCTV', path: '/business/cctv' },
          ]),
          serviceJsonLd({
            name: '매장 CCTV 설치 상담',
            description: data.hero.description,
            path: '/business/cctv',
            serviceType: 'Business CCTV Installation Consultation',
          }),
          faqJsonLd(data.faqs),
        ]}
      />
      <BlocksProvider blocks={blocks}>
        <ServiceLanding
          data={data}
          pageKey="cctv"
          pagePath="/business/cctv"
        />
      </BlocksProvider>
    </PublicPageFrame>
  )
}
