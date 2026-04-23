// ─────────────────────────────────────────────
// 인라인 편집 — 텍스트 블록 래퍼
//
// 사용 예시 :
//   <EditableText
//     blockKey="home.hero.slide1.title"
//     as="h1"
//     fallback="사장님 편의 유일한 파트너"
//     pagePath="/"
//     className="text-4xl font-bold"
//   />
//
// 원칙 :
//   - as (h1/h2/p) 는 개발자가 결정 → 마케터 못 바꿈 → SEO 유지
//   - fallback 은 DB 에 블록 없을 때 보여줄 문구 (하드코딩 방지 아님, 초기값)
//   - admin 이면 ✏️ 오버레이 노출
//
// 데이터 소스 :
//   - 이 컴포넌트는 "클라이언트 컴포넌트" 지만
//     실제 값은 부모(SSR 서버 컴포넌트)가 getBlock/pickText 로 조회해 prop 으로 내려주는 것을 권장
//   - prop value 가 undefined 면 fallback 사용
// ─────────────────────────────────────────────

'use client'

import React from 'react'
import { EditOverlay } from './EditOverlay'
import type { TextValue } from '@/lib/content-blocks'

type TextTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div'

interface EditableTextProps {
  /** DB block_key (도트 표기법) */
  blockKey: string
  /** SEO 태그 — 개발자가 고정 */
  as?: TextTag
  /** DB 에 없을 때 또는 초기값 */
  fallback: string
  /** 부모 SSR 서버 컴포넌트가 조회해서 내려준 값 */
  value?: string
  /** revalidate 대상 페이지 경로 */
  pagePath?: string
  /** Tailwind 등 추가 클래스 */
  className?: string
}

// block-level 태그 목록 — 이들은 래퍼를 div 로 감싸야 원래 레이아웃이 유지됨
// span 안에 block 을 넣으면 mt·mx·max-w 등 block 레이아웃이 깨짐
const BLOCK_TAGS: readonly TextTag[] = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div'] as const

export function EditableText({
  blockKey,
  as: Tag = 'p',
  fallback,
  value,
  pagePath,
  className = '',
}: EditableTextProps) {
  const currentText = value ?? fallback

  // Tag 가 block 요소면 wrapper 도 div 로 (block 레이아웃 보존)
  // span 이면 wrapper 도 span 으로 (텍스트 흐름 유지)
  const wrapperAs: 'div' | 'span' = BLOCK_TAGS.includes(Tag) ? 'div' : 'span'

  return (
    <EditOverlay
      as={wrapperAs}
      session={{
        blockKey,
        blockType:    'text',
        currentValue: { text: currentText } satisfies TextValue,
        semanticTag:  Tag,
        pagePath:     pagePath ?? null,
      }}
    >
      <Tag className={className}>{currentText}</Tag>
    </EditOverlay>
  )
}
