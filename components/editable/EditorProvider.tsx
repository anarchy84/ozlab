// ─────────────────────────────────────────────
// 인라인 편집 — 전역 편집 상태 컨텍스트
//
// 역할 :
//   - "지금 어떤 블록을 편집 중인가"를 전역으로 관리
//   - EditableText/Image/Link 가 ✏️ 눌렀을 때 이 컨텍스트에 "편집 요청" 띄움
//   - <EditorModal /> 은 이 컨텍스트를 구독해서 단일 모달을 렌더링
//
// 왜 전역인가 :
//   - 모달은 페이지당 1개만 뜸 (동시 편집 방지)
//   - 여러 래퍼가 각자 모달 갖고 있으면 z-index 난장판
//   - 저장 후 router.refresh() 도 여기서 1회만 실행
//
// 사용 :
//   app/layout.tsx 에서 <EditorProvider><body>...</body></EditorProvider>
//
// 주의 :
//   - 비로그인 사용자에게도 렌더링은 되지만, 모달 자체는 admin 만 열 수 있음
//     (EditableX 래퍼에서 useAdminGuard 로 가드)
// ─────────────────────────────────────────────

'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import type { BlockValue } from '@/lib/content-blocks'

// -------------------------------------------------------------
// 편집 세션 타입
// -------------------------------------------------------------
export type BlockType = 'text' | 'image' | 'link'

/**
 * 저장 타겟 — 기본값(undefined)이면 content_blocks 로 저장.
 * packages/products 처럼 고유 테이블 컬럼으로 저장해야 하는 경우에만 지정.
 *
 * 예 : 패키지 히어로 이미지
 *   {
 *     api: '/api/admin/packages/image',
 *     method: 'PATCH',
 *     extraPayload: { packageId, column: 'hero_image' },
 *   }
 *
 * EditorModal 이 저장할 때 :
 *   fetch(saveTarget.api, {
 *     method: saveTarget.method ?? 'PATCH',
 *     body: JSON.stringify({ ...saveTarget.extraPayload, value: draft })
 *   })
 */
export interface SaveTarget {
  /** 저장할 API 엔드포인트 (절대경로) */
  api:           string
  /** HTTP 메서드 (기본 PATCH) */
  method?:       'PATCH' | 'POST' | 'PUT'
  /** 바디에 머지될 추가 필드 (테이블 id, 컬럼명 등) */
  extraPayload?: Record<string, unknown>
}

export interface EditSession {
  blockKey:     string
  blockType:    BlockType
  /** 현재 렌더되는 값 (fallback 포함) — before 비교용 */
  currentValue: BlockValue
  /** SEO 보호용 태그 (예: 'h1') — UI 에선 readonly 로 표시 */
  semanticTag?: string | null
  /** 저장 후 revalidate 대상 경로 */
  pagePath?:    string | null
  /**
   * content_blocks 말고 다른 테이블로 저장할 때만 지정.
   * 이미지 편집이 주 용도.
   */
  saveTarget?:  SaveTarget
  /**
   * 이미지 업로드 시 storage 경로 prefix 오버라이드.
   * 지정 안 하면 blockKey 가 prefix 로 쓰임.
   * packages 처럼 blockKey 가 가짜 식별자일 때 명시적으로 지정.
   */
  uploadPathPrefix?: string
}

interface EditorContextValue {
  /** 편집 중인 세션 (없으면 null) */
  session: EditSession | null
  /** 래퍼가 ✏️ 눌렀을 때 호출 */
  openEditor: (s: EditSession) => void
  /** 모달 닫기 (저장이든 취소든) */
  closeEditor: () => void
}

const EditorContext = createContext<EditorContextValue | null>(null)

// -------------------------------------------------------------
// Provider
// -------------------------------------------------------------
export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<EditSession | null>(null)

  const openEditor = useCallback((s: EditSession) => {
    setSession(s)
  }, [])

  const closeEditor = useCallback(() => {
    setSession(null)
  }, [])

  const value = useMemo<EditorContextValue>(
    () => ({ session, openEditor, closeEditor }),
    [session, openEditor, closeEditor]
  )

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
}

// -------------------------------------------------------------
// Hook
// -------------------------------------------------------------
export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext)
  if (!ctx) {
    // Provider 없이 사용돼도 래퍼가 깨지지 않게 no-op fallback 제공
    // (관리자 아닌 일반 방문자 페이지는 EditorProvider 미주입 가능)
    return {
      session: null,
      openEditor: () => {},
      closeEditor: () => {},
    }
  }
  return ctx
}
