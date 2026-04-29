// ─────────────────────────────────────────────
// DynamicCTA — cta_buttons 마스터에서 가져온 CTA 렌더 + 클릭 트래킹
//
// 사용 :
//   <DynamicCTA
//     placement="hero"
//     ctas={ctasByPlacement.hero}     ← 서버에서 fetchCtasByPlacement 로 prop 전달
//     fallback={{ label: '...', href: '#apply' }}
//     className="btn btn-primary"
//   />
//
// 동작 :
//   - ctas 배열에서 첫 번째 활성 CTA 사용 (sort_order 정렬됨)
//   - 클릭 시 captureCtaClick 호출 → sessionStorage 에 utm 저장
//   - href 가 #apply 면 anchor 스크롤 (Next.js Link 안 씀)
//   - 외부 URL 이면 target_blank 적용
//
// fallback :
//   - cta_buttons 비어있거나 DB 오류 시 fallback 사용 (사이트 안 깨짐)
// ─────────────────────────────────────────────
'use client'

import type { CtaButton } from '@/lib/admin/types'
import { captureCtaClick } from '@/lib/cta-attribution'

interface Props {
  /** 페이지 placement — DB 의 cta_buttons.placement 와 매칭 */
  placement: string
  /** 서버에서 fetch 한 해당 placement 의 CTA 배열 */
  ctas?: CtaButton[]
  /** DB 비어있을 때 사용할 기본값 */
  fallback?: {
    label: string
    href?: string
    target?: '_self' | '_blank'
  }
  /** 항상 적용할 추가 className */
  className?: string
  /** 라벨 외에 보여줄 추가 children (예: 화살표 아이콘) */
  children?: React.ReactNode
  /** index 지정 시 ctas[index] 사용 (한 placement 에 여러 CTA 있을 때) */
  index?: number
}

const STYLE_CLASS: Record<string, string> = {
  primary: 'btn btn-primary',
  secondary: 'btn btn-secondary',
  ghost: 'btn btn-ghost',
  outline: 'btn btn-outline',
  floating: 'btn btn-primary',
}

export function DynamicCTA({
  placement,
  ctas,
  fallback,
  className,
  children,
  index = 0,
}: Props) {
  const cta = ctas && ctas.length > index ? ctas[index] : null

  // 라벨/href/target 결정 (DB 우선, 없으면 fallback)
  const label = cta?.label ?? fallback?.label ?? '신청하기'
  const href = cta?.target_href ?? fallback?.href ?? '#apply'
  const blank = cta?.target_blank ?? fallback?.target === '_blank'

  // 스타일 — DB style 우선, 없으면 className 그대로
  const styleClass = cta ? STYLE_CLASS[cta.style] ?? '' : ''
  const finalClass = [styleClass, className].filter(Boolean).join(' ')

  function handleClick() {
    if (cta) {
      captureCtaClick({
        id: cta.id,
        utm_source: cta.utm_source,
        utm_medium: cta.utm_medium,
        utm_campaign: cta.utm_campaign,
        utm_content: cta.utm_content,
      })
    }
    // #apply 같은 anchor 는 default 동작 (스크롤)
    // 외부 URL 도 default 동작 (a 태그 navigate)
  }

  return (
    <a
      href={href}
      target={blank ? '_blank' : '_self'}
      rel={blank ? 'noopener noreferrer' : undefined}
      onClick={handleClick}
      className={finalClass}
      data-cta-placement={placement}
      data-cta-id={cta?.id}
    >
      {children ?? label}
    </a>
  )
}
