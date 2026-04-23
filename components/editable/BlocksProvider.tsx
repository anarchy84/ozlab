// ─────────────────────────────────────────────
// 인라인 편집 — 페이지 블록 컨텍스트
//
// 역할 :
//   - SSR 서버 컴포넌트가 getBlocksForPage 로 조회한 블록 맵을
//     Client 컴포넌트 트리 전체에 컨텍스트로 주입
//   - 각 섹션 컴포넌트( HeroCarousel, TrustMarks 등) 가
//     useBlocks() 훅으로 읽어서 EditableText 에 value 전달
//
// 왜 Context 인가 :
//   - prop drilling 대안. 섹션 내부 map() 반복 깊이가 있어도
//     어디서든 한 줄로 blocks 접근 가능
//   - 상품페이지 · FAQ 페이지 등 다른 페이지에서도 동일 패턴 재사용
//
// 성능 고려 :
//   - blocks 는 SSR 시점에 확정된 후 바뀌지 않는 정적 데이터
//   - Context re-render 이슈 없음 (value 참조 고정)
// ─────────────────────────────────────────────

'use client'

import React, { createContext, useContext, useMemo } from 'react'
import type { ContentBlock } from '@/lib/content-blocks'

// -------------------------------------------------------------
// 컨텍스트 정의
// -------------------------------------------------------------
type BlocksRecord = Record<string, ContentBlock>

const BlocksContext = createContext<BlocksRecord>({})

// -------------------------------------------------------------
// Provider — 페이지 최상단에서 감싸줌
// -------------------------------------------------------------
interface BlocksProviderProps {
  blocks: BlocksRecord
  children: React.ReactNode
}

export function BlocksProvider({ blocks, children }: BlocksProviderProps) {
  // 참조 안정화 — 매 렌더 새 객체 생성 방지
  // 실제로는 blocks 가 SSR 시점 고정이라 useMemo 없어도 문제 없지만
  // dev 에서 HMR 으로 page.tsx 갱신될 때 안전하게
  const value = useMemo(() => blocks, [blocks])

  return (
    <BlocksContext.Provider value={value}>
      {children}
    </BlocksContext.Provider>
  )
}

// -------------------------------------------------------------
// 훅 — 섹션 컴포넌트에서 호출
//
// 사용 예시 :
//   const blocks = useBlocks()
//   <EditableText
//     blockKey="home.trustmarks.title"
//     value={pickTextOrUndef(blocks, 'home.trustmarks.title')}
//     fallback="..."
//   />
// -------------------------------------------------------------
export function useBlocks(): BlocksRecord {
  return useContext(BlocksContext)
}
