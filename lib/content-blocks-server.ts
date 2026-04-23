// ─────────────────────────────────────────────
// 인라인 편집 블록 — 서버 전용 조회 헬퍼
//
// 분리 배경 (2026-04-21) :
//   - createClient (next/headers 의존) 는 Server Component 전용
//   - 클라이언트 컴포넌트가 같은 파일에서 타입/헬퍼만 import 해도
//     Next.js 가 전체 트리를 클라 번들에 포함시키려다 컴파일 에러 발생
//   - 그래서 "서버 전용 함수" 는 이 파일로 분리하고
//     "공용 타입/헬퍼" 는 lib/content-blocks.ts 에 유지
//
// 이 파일은 Server Component · Route Handler 에서만 import 할 것
// ─────────────────────────────────────────────

import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { ContentBlock, BlockValue } from './content-blocks'

// -------------------------------------------------------------
// 단일 블록 조회
// -------------------------------------------------------------
export async function getBlock<T extends BlockValue = BlockValue>(
  blockKey: string,
  fallback?: T
): Promise<{ value: T | undefined; meta: ContentBlock | null }> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('content_blocks')
    .select('*')
    .eq('block_key', blockKey)
    .maybeSingle()

  if (error || !data) {
    return { value: fallback, meta: null }
  }

  return {
    value: data.value as T,
    meta: data as ContentBlock,
  }
}

// -------------------------------------------------------------
// 페이지 단위 일괄 조회 — 1 쿼리로 해당 페이지 블록 전부
// -------------------------------------------------------------
export async function getBlocksForPage(
  pagePath: string
): Promise<Map<string, ContentBlock>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('content_blocks')
    .select('*')
    .eq('page_path', pagePath)

  const map = new Map<string, ContentBlock>()
  if (error || !data) return map

  for (const row of data) {
    map.set(row.block_key, row as ContentBlock)
  }
  return map
}

// -------------------------------------------------------------
// 다중 블록 조회 (block_key 배열) — 섹션 단위 prefetch
// -------------------------------------------------------------
export async function getBlocks(
  blockKeys: string[]
): Promise<Map<string, ContentBlock>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('content_blocks')
    .select('*')
    .in('block_key', blockKeys)

  const map = new Map<string, ContentBlock>()
  if (error || !data) return map

  for (const row of data) {
    map.set(row.block_key, row as ContentBlock)
  }
  return map
}
