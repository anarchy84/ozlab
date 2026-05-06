import type { Metadata } from 'next'
import { PublicPageFrame } from '@/components/sections/PublicPageFrame'
import { ServiceLanding } from '@/components/sections/ServiceLanding'
import { servicePages } from '@/lib/service-pages'

export const metadata: Metadata = {
  title: 'CCTV',
  description:
    '매장 크기와 구조에 맞는 CCTV 채널 수, 카메라 종류, 원격 확인 구성을 오즈랩페이 스타일로 상담합니다.',
  alternates: { canonical: 'https://ozlabpay.kr/business/cctv' },
}

export default function CctvPage() {
  return (
    <PublicPageFrame>
      <ServiceLanding data={servicePages.cctv} />
    </PublicPageFrame>
  )
}
