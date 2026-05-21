import { pickTextOrUndef, type ContentBlock } from '@/lib/content-blocks'

export const MARKETING_SUPPORT_FAQ_ITEMS = [
  {
    q: '플레이스 마케팅 무료 지원은 누가 받을 수 있나요?',
    a: '이벤트 기간 내 N커넥트페이 단말기를 신청하거나 교체한 고객님을 대상으로 지원합니다. 매장 상황과 신청 조건은 상담 시 확인합니다.',
  },
  {
    q: '플레이스 최적화 세팅에는 무엇이 포함되나요?',
    a: '매장 기본 정보, 메뉴, 사진, 키워드, 리뷰 동선처럼 네이버 플레이스에서 고객이 비교하는 주요 항목을 점검하고 정리합니다.',
  },
  {
    q: '플레이스 유료광고비 지원은 어떻게 적용되나요?',
    a: '이벤트 조건에 해당하는 매장에 한해 초기 노출을 돕는 방식으로 지원됩니다. 지원 금액과 방식은 신청 시점의 프로모션 기준에 따라 안내합니다.',
  },
  {
    q: '블로그리뷰 10건 지원도 같이 받을 수 있나요?',
    a: '이벤트 대상 고객님께는 플레이스 최적화 세팅, 유료광고비 지원, 블로그리뷰 10건 지원을 함께 안내합니다.',
  },
]

export function marketingSupportFaqsForBlocks(blocks: Record<string, ContentBlock>) {
  return MARKETING_SUPPORT_FAQ_ITEMS.map((item, index) => ({
    q: pickTextOrUndef(blocks, `marketing.faq.items.${index}.q`) ?? item.q,
    a: pickTextOrUndef(blocks, `marketing.faq.items.${index}.a`) ?? item.a,
  }))
}
