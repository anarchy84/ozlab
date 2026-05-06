import type { Metadata } from 'next'
import { PublicPageFrame } from '@/components/sections/PublicPageFrame'
import { ServiceLanding } from '@/components/sections/ServiceLanding'
import { BlocksProvider } from '@/components/editable/BlocksProvider'
import { servicePages } from '@/lib/service-pages'
import { getBlocksForPage } from '@/lib/content-blocks-server'
import { blocksMapToRecord } from '@/lib/content-blocks'

export const revalidate = 0

export const metadata: Metadata = {
  title: '사업자 인터넷',
  description:
    'SKT, KT, LG U+ 사업자 인터넷 요금과 설치 조건을 비교하고 매장에 맞는 회선 구성을 상담받으세요.',
  alternates: { canonical: 'https://ozlabpay.kr/internet' },
}

export default async function InternetPage() {
  const blocksMap = await getBlocksForPage('/internet')
  const blocks = blocksMapToRecord(blocksMap)
  return (
    <PublicPageFrame>
      <BlocksProvider blocks={blocks}>
        <ServiceLanding
          data={servicePages.internet}
          pageKey="internet"
          pagePath="/internet"
        />
      </BlocksProvider>
    </PublicPageFrame>
  )
}
