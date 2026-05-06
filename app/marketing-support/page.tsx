import type { Metadata } from 'next'
import { MarketingSupportLanding } from '@/components/sections/MarketingSupportLanding'
import { PublicPageFrame } from '@/components/sections/PublicPageFrame'

export const metadata: Metadata = {
  title: '사업자 마케팅지원',
  description:
    '우리편마케팅의 데이터 마이닝 기반 광고 운영, BlueMoai, SEO/GEO, 19개 운영 상품을 오즈랩페이 안에서 확인하세요.',
  alternates: { canonical: 'https://ozlabpay.kr/marketing-support' },
}

export default function MarketingSupportPage() {
  return (
    <PublicPageFrame>
      <MarketingSupportLanding />
    </PublicPageFrame>
  )
}
