// ─────────────────────────────────────────────
// 인라인 편집 — 링크/버튼 블록 래퍼
//
// 사용 예시 :
//   <EditableLink
//     blockKey="home.hero.cta"
//     fallback={{ label: '상담 신청', href: '/consultation', target: '_self' }}
//     value={heroCta}
//     className="inline-block px-6 py-3 bg-[#E94560] text-white rounded-md"
//     pagePath="/"
//   />
//
// 동작 :
//   - 내부 경로(/로 시작) 는 next/link 사용 (클라이언트 네비게이션)
//   - 외부 URL 은 <a> 직접 사용
//   - target="_blank" 이면 자동으로 rel="noopener noreferrer" 추가 (보안)
// ─────────────────────────────────────────────

'use client'

import React from 'react'
import Link from 'next/link'
import { EditOverlay } from './EditOverlay'
import type { LinkValue } from '@/lib/content-blocks'

interface EditableLinkProps {
  blockKey: string
  fallback: LinkValue
  value?: LinkValue
  pagePath?: string
  className?: string
  /** 자식을 직접 주면 label 대신 사용 (버튼 안 아이콘 등 복잡 UI) */
  children?: React.ReactNode
}

export function EditableLink({
  blockKey,
  fallback,
  value,
  pagePath,
  className = '',
  children,
}: EditableLinkProps) {
  const current: LinkValue = value ?? fallback
  const isExternal = /^https?:\/\//i.test(current.href)
  const content = children ?? current.label

  // 외부 링크
  const externalRel = current.target === '_blank' ? 'noopener noreferrer' : undefined

  return (
    <EditOverlay
      as="span"
      session={{
        blockKey,
        blockType:    'link',
        currentValue: current,
        semanticTag:  'a',
        pagePath:     pagePath ?? null,
      }}
    >
      {isExternal ? (
        <a
          href={current.href}
          target={current.target ?? '_self'}
          rel={externalRel}
          className={className}
        >
          {content}
        </a>
      ) : (
        <Link
          href={current.href || '#'}
          target={current.target ?? '_self'}
          className={className}
        >
          {content}
        </Link>
      )}
    </EditOverlay>
  )
}
