// ─────────────────────────────────────────────
// 인라인 편집 블록 — 공용 타입 · 헬퍼 (클라이언트 안전)
//
// 분리 원칙 (2026-04-21) :
//   - 이 파일은 서버/클라이언트 양쪽에서 import 가능해야 함
//   - createClient(next/headers) 같은 서버 전용 모듈 절대 import 금지
//   - DB 조회 함수는 lib/content-blocks-server.ts 로 이관됨
//
// 포함 내용 :
//   - BlockValue / ContentBlock 타입 정의
//   - 캐시 태그 네이밍 헬퍼
//   - pickText / pickImage / pickLink (Map 또는 Record 모두 지원)
//   - blocksMapToRecord (서버 → 클라이언트 직렬화용)
// ─────────────────────────────────────────────

// -------------------------------------------------------------
// 타입 정의 — value 의 형태는 block_type 별로 다름
// -------------------------------------------------------------
export type TextValue  = { text: string }
export type ImageValue = {
  url: string
  alt?: string
  width?: number
  height?: number
  format?: 'webp' | 'png' | 'jpeg' | 'svg' | 'gif'
  // 로고 등 PNG fallback 있는 케이스 (WebP 알파 + PNG 원본 병행)
  fallback_url?: string
}
export type LinkValue  = { label: string; href: string; target?: '_self' | '_blank' }

export type BlockValue = TextValue | ImageValue | LinkValue

export interface ContentBlock {
  block_key: string
  block_type: 'text' | 'image' | 'link'
  value: BlockValue
  semantic_tag: string | null
  page_path: string | null
  note: string | null
  updated_at: string
}

// 캐시 태그 네이밍 규칙 : page_path 기준으로 묶어 일괄 무효화
export const cacheTagFor = (blockKey: string) => `cb:${blockKey}`
export const cacheTagForPage = (pagePath: string) => `cb-page:${pagePath}`

// -------------------------------------------------------------
// 편의 함수 — map/record 에서 값 꺼낼 때 fallback 자동 적용
//
// 왜 두 타입 모두 지원하나 ?
//   - Map 은 서버 컴포넌트 내부에서 순수하게 쓸 때 유용
//   - 서버 → 클라이언트 prop 은 JSON 직렬화만 가능하므로
//     Map 은 넘어가지 않음 → Record(plain object) 로 변환해 넘긴 뒤
//     클라이언트에서는 Record 버전 헬퍼 사용
// -------------------------------------------------------------

// 런타임 판별 — Map 인지 Record(object) 인지
function getBlockFrom(
  source: Map<string, ContentBlock> | Record<string, ContentBlock>,
  key: string
): ContentBlock | undefined {
  if (source instanceof Map) return source.get(key)
  return source[key]
}

export function pickText(
  source: Map<string, ContentBlock> | Record<string, ContentBlock>,
  key: string,
  fallback: string
): string {
  const block = getBlockFrom(source, key)
  if (!block || block.block_type !== 'text') return fallback
  return (block.value as TextValue).text ?? fallback
}

export function pickImage(
  source: Map<string, ContentBlock> | Record<string, ContentBlock>,
  key: string,
  fallback: ImageValue
): ImageValue {
  const block = getBlockFrom(source, key)
  if (!block || block.block_type !== 'image') return fallback
  return block.value as ImageValue
}

export function pickLink(
  source: Map<string, ContentBlock> | Record<string, ContentBlock>,
  key: string,
  fallback: LinkValue
): LinkValue {
  const block = getBlockFrom(source, key)
  if (!block || block.block_type !== 'link') return fallback
  return block.value as LinkValue
}

// -------------------------------------------------------------
// OrUndef 버전 — DB 블록이 없으면 undefined 반환
//
// 왜 필요한가 :
//   - EditableText 컴포넌트는 value 가 undefined 면 fallback 을 쓰고
//     value 가 string 이면 DB 값을 씀
//   - pickText 는 항상 string 을 반환(fallback 필수) → DB 유무 구분 불가
//   - 래퍼에 "DB에 값 있으면 DB, 없으면 컴포넌트 fallback" 을 위임하려면
//     "값 없음" 신호로 undefined 를 돌려줄 수 있어야 함
// -------------------------------------------------------------
export function pickTextOrUndef(
  source: Map<string, ContentBlock> | Record<string, ContentBlock>,
  key: string
): string | undefined {
  const block = getBlockFrom(source, key)
  if (!block || block.block_type !== 'text') return undefined
  return (block.value as TextValue).text
}

export function pickLinkOrUndef(
  source: Map<string, ContentBlock> | Record<string, ContentBlock>,
  key: string
): LinkValue | undefined {
  const block = getBlockFrom(source, key)
  if (!block || block.block_type !== 'link') return undefined
  return block.value as LinkValue
}

// 이미지 블록 — DB 없으면 undefined
// (EditableImage / MediaSlot 같은 래퍼가 value ?? fallback 패턴을 쓸 때 사용)
export function pickImageOrUndef(
  source: Map<string, ContentBlock> | Record<string, ContentBlock>,
  key: string
): ImageValue | undefined {
  const block = getBlockFrom(source, key)
  if (!block || block.block_type !== 'image') return undefined
  const v = block.value as ImageValue
  // DB 에 url 이 비어있으면 "값 없음"으로 간주 → fallback 쪽으로 넘김
  if (!v || !v.url) return undefined
  return v
}

// -------------------------------------------------------------
// 서버 → 클라이언트 직렬화 헬퍼
// -------------------------------------------------------------
export function blocksMapToRecord(
  map: Map<string, ContentBlock>
): Record<string, ContentBlock> {
  return Object.fromEntries(map)
}
