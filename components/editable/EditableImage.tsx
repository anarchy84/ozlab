// ─────────────────────────────────────────────
// 인라인 편집 — 이미지 블록 래퍼
//
// 사용 예시 :
//   <EditableImage
//     blockKey="home.hero.slide1.image"
//     fallback={{ url: '/images/hero-1.webp', alt: '히어로 이미지', width: 1200, height: 600 }}
//     value={heroImage}
//     pagePath="/"
//     priority
//   />
//
// 투명 PNG 대응 :
//   - value.fallback_url 이 있으면 <picture> 구조로 WebP + PNG 둘 다 제공
//   - 구형 크롤러나 WebP 비지원 환경에서도 투명 배경 유지
//
// Next Image vs native <img> :
//   - 외부 URL (Supabase Storage) 은 next.config 에 도메인 등록 필요
//   - 여기서는 native <img> 사용 → Supabase 도메인 의존 없이 바로 동작
//   - 성능 최적화는 Sharp 단에서 WebP + 크기 조절로 이미 처리
// ─────────────────────────────────────────────

'use client'

import React from 'react'
import { EditOverlay } from './EditOverlay'
import type { ImageValue } from '@/lib/content-blocks'

interface EditableImageProps {
  blockKey: string
  /** DB 없을 때 사용할 초기 이미지 */
  fallback: ImageValue
  /** SSR 조회 결과 (없으면 fallback) */
  value?: ImageValue
  pagePath?: string
  /** Tailwind 등 클래스 (부모가 레이아웃 제어) */
  className?: string
  /** img 태그에 직접 전달 */
  imgClassName?: string
  /** loading="eager" 대체 — hero 같은 LCP 후보에 사용 */
  priority?: boolean
  /** 반응형 sizes 힌트 (웹표준) */
  sizes?: string
}

export function EditableImage({
  blockKey,
  fallback,
  value,
  pagePath,
  className = '',
  imgClassName = '',
  priority = false,
  sizes,
}: EditableImageProps) {
  const current: ImageValue = value ?? fallback

  const loading = priority ? 'eager' : 'lazy'

  return (
    <EditOverlay
      as="div"
      className={className}
      session={{
        blockKey,
        blockType:    'image',
        currentValue: current,
        semanticTag:  'img',
        pagePath:     pagePath ?? null,
      }}
    >
      {current.fallback_url ? (
        // 투명 PNG : WebP + PNG 병행 제공
        <picture>
          <source srcSet={current.url} type="image/webp" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.fallback_url}
            alt={current.alt ?? ''}
            width={current.width}
            height={current.height}
            loading={loading}
            decoding="async"
            sizes={sizes}
            className={imgClassName}
          />
        </picture>
      ) : (
        // 일반 : WebP 단독
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={current.url}
          alt={current.alt ?? ''}
          width={current.width}
          height={current.height}
          loading={loading}
          decoding="async"
          sizes={sizes}
          className={imgClassName}
        />
      )}
    </EditOverlay>
  )
}
