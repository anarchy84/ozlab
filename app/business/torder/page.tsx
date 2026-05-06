import type { Metadata } from 'next'
import { PublicPageFrame } from '@/components/sections/PublicPageFrame'
import { ServiceLanding } from '@/components/sections/ServiceLanding'
import { servicePages } from '@/lib/service-pages'

export const metadata: Metadata = {
  title: '테이블오더',
  description:
    '키오스크, 테이블오더, QR오더를 매장 동선과 POS 연동에 맞춰 설계하고 설치 상담까지 연결합니다.',
  alternates: { canonical: 'https://ozlabpay.kr/business/torder' },
}

export default function TableOrderPage() {
  return (
    <PublicPageFrame>
      <ServiceLanding data={servicePages.tableOrder} />
    </PublicPageFrame>
  )
}
