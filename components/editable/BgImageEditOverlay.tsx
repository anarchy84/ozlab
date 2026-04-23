// ─────────────────────────────────────────────
// 인라인 편집 — backgroundImage 전용 오버레이 (Phase E Step 6)
//
// 왜 필요한가 :
//   - /packages/[slug] · /products/[slug] 상세 히어로 영역은
//     <div style={{ backgroundImage: 'url(...)' }}> 로 렌더되고 있어
//     MediaSlot(<img>) 으로 교체하면 기존 그라디언트·오버레이·레이아웃이 깨짐.
//   - 그래서 backgroundImage div 는 그대로 두고,
//     그 내부에 absolute 로 ✏️ 버튼만 띄우는 얇은 client island 를 주입.
//
// 사용 예 (server component 안에서) :
//   <div
//     className="relative h-[480px]"
//     style={{ backgroundImage: `url(${pkg.hero_image})` }}
//   >
//     <BgImageEditOverlay
//       blockKey={`packages.${pkg.id}.hero_image`}
//       currentUrl={pkg.hero_image}
//       alt={pkg.title}
//       pagePath={`/packages/${pkg.slug}`}
//       saveTarget={{
//         api:          '/api/admin/packages/image',
//         method:       'PATCH',
//         extraPayload: { packageId: pkg.id, column: 'hero_image' },
//       }}
//       uploadPathPrefix={`packages/${pkg.slug}/hero`}
//     />
//     ...
//   </div>
//
// 동작 :
//   - admin 아니면 아예 null 반환 → SSR HTML 크기에 영향 없음
//   - admin 이면 hover 시 ✏️ 뜨는 버튼 + 점선 outline 노출
//   - 클릭 → EditorProvider.openEditor(session) 호출 → EditorModal 뜸
//   - 저장되면 saveTarget.api 로 PATCH → revalidatePath → 페이지 리프레시
// ─────────────────────────────────────────────

'use client'

import React from 'react'
import { useAdminGuard } from '@/hooks/useAdminGuard'
import { useEditor, type SaveTarget } from './EditorProvider'

interface BgImageEditOverlayProps {
  /** 편집 세션 식별용 key (가짜여도 됨 — saveTarget 쓰면 content_blocks 엔 저장 안 함) */
  blockKey:         string
  /** 현재 URL — 모달에 before 로 보여줌 */
  currentUrl:       string | null | undefined
  /** 대체 텍스트 (모달 alt 필드 초깃값) */
  alt?:             string
  /** revalidate 대상 경로 */
  pagePath?:        string
  /** 저장 타겟 — packages/products 테이블 직접 업데이트 */
  saveTarget:       SaveTarget
  /** storage 업로드 경로 prefix (예: `packages/cafe-business/hero`) */
  uploadPathPrefix: string
  /** 오버레이 위치 (기본 top-right) */
  position?:        'top-right' | 'top-left'
}

export function BgImageEditOverlay({
  blockKey,
  currentUrl,
  alt,
  pagePath,
  saveTarget,
  uploadPathPrefix,
  position = 'top-right',
}: BgImageEditOverlayProps) {
  const { isAdmin }   = useAdminGuard()
  const { openEditor } = useEditor()

  // admin 아니면 아무것도 안 그림 → 방문자 화면엔 영향 없음
  if (!isAdmin) return null

  const posClass =
    position === 'top-right'
      ? 'top-3 right-3'
      : 'top-3 left-3'

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        openEditor({
          blockKey,
          blockType:    'image',
          currentValue: { url: currentUrl ?? '', alt: alt ?? '' },
          semanticTag:  'img',
          pagePath:     pagePath ?? null,
          saveTarget,
          uploadPathPrefix,
        })
      }}
      aria-label={`${blockKey} 편집`}
      className={`
        absolute ${posClass} z-30
        bg-[#1A1A2E]/90 text-white text-xs md:text-sm
        rounded-md shadow-lg backdrop-blur-sm
        px-3 py-1.5
        flex items-center gap-1.5
        hover:bg-[#E94560]
        transition-colors duration-150
        ring-2 ring-white/30
      `}
    >
      <span aria-hidden="true">✏️</span>
      <span className="hidden sm:inline">이미지 교체</span>
    </button>
  )
}
