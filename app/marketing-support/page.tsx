import type { Metadata } from 'next'
import { MarketingSupportLanding } from '@/components/sections/MarketingSupportLanding'
import { PublicPageFrame } from '@/components/sections/PublicPageFrame'

export const metadata: Metadata = {
  title: '사업자 마케팅지원',
  description:
    'N커넥트페이 단말기 신청·교체 고객을 위한 5월 한정 플레이스 마케팅 무료 지원 이벤트를 확인하세요.',
  alternates: { canonical: 'https://ozlabpay.kr/marketing-support' },
}

export default function MarketingSupportPage() {
  return (
    <PublicPageFrame>
      <MarketingSupportLanding />
    </PublicPageFrame>
  )
}
