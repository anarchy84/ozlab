// ─────────────────────────────────────────────
// DynamicCTA — cta_buttons 마스터에서 가져온 CTA 렌더 + 클릭 트래킹
//
// Phase 2B :
//   - cta_type === 'inline_anchor' (기본) : 기존 동작 — a 태그, #apply 스크롤
//   - cta_type !== 'inline_anchor'        : 클릭 시 모달 폼 (CtaModalForm)
//                                            예) 'modal_form' 인 hero 버튼
//   - inline_form / floating_button / sticky_bar / toast 는
//     CtaTriggerHost 가 자동 노출함 — DynamicCTA 는 클릭형 트리거만 처리
//
// fallback :
//   - cta_buttons 비어있거나 DB 오류 시 fallback 사용 (사이트 안 깨짐)
// ─────────────────────────────────────────────
'use client'

import { useState } from 'react'
import type { CtaButton } from '@/lib/admin/types'
import { captureCtaClick } from '@/lib/cta-attribution'
import { CtaModalForm } from './CtaModalForm'

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
  const [modalOpen, setModalOpen] = useState(false)

  // 라벨/href/target 결정 (DB 우선, 없으면 fallback)
  const label = cta?.label ?? fallback?.label ?? '신청하기'
  const href = cta?.target_href ?? fallback?.href ?? '#apply'
  const blank = cta?.target_blank ?? fallback?.target === '_blank'

  // 스타일 — DB style 우선, 없으면 className 그대로
  const styleClass = cta ? STYLE_CLASS[cta.style] ?? '' : ''
  const finalClass = [styleClass, className].filter(Boolean).join(' ')

  // Phase 2B: 모달 트리거 타입 — 클릭 시 모달 띄우고 anchor 동작 차단
  const isModalTrigger =
    !!cta &&
    (cta.cta_type === 'modal_form' || cta.cta_type === 'floating_button')

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (cta) {
      captureCtaClick({
        id: cta.id,
        utm_source: cta.utm_source,
        utm_medium: cta.utm_medium,
        utm_campaign: cta.utm_campaign,
        utm_content: cta.utm_content,
      })
    }
    if (isModalTrigger) {
      e.preventDefault()
      setModalOpen(true)
    }
    // 그 외엔 default 동작 (anchor 스크롤 / 외부 링크 navigate)
  }

  return (
    <>
      <a
        href={isModalTrigger ? '#' : href}
        target={blank && !isModalTrigger ? '_blank' : '_self'}
        rel={blank && !isModalTrigger ? 'noopener noreferrer' : undefined}
        onClick={handleClick}
        className={finalClass}
        data-cta-placement={placement}
        data-cta-id={cta?.id}
        data-cta-type={cta?.cta_type}
      >
        {children ?? label}
      </a>
      {isModalTrigger && cta && modalOpen && (
        <CtaModalForm cta={cta} onClose={() => setModalOpen(false)} />
      )}
    </>
  )
}
