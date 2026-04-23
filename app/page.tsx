// ─────────────────────────────────────────────
// 오즈랩페이 홈 — 서버 컴포넌트
//
// 역할 :
//   - SSR 시점에 Supabase 에서 "/" 페이지의 content_blocks 전부 조회
//   - Map → Record 변환 후 HomeClient 로 props 전달
//   - 편집 엔진(EditableText/Link/MediaSlot)은 전부 클라 컴포넌트이므로
//     실제 렌더링은 HomeClient 가 담당
//
// P6 에서 추가 예정 :
//   - generateMetadata 동적 (OG 이미지 블록 반영)
//   - sitemap.xml / robots.txt
// ─────────────────────────────────────────────

import { getBlocksForPage } from '@/lib/content-blocks-server'
import { blocksMapToRecord } from '@/lib/content-blocks'
import HomeClient from './(home)/HomeClient'

// 편집 즉시 반영 — 캐시 최소화
// P6 에서 revalidateTag 로 전환 검토 (편집 PATCH 시점에만 무효화)
export const revalidate = 0

export default async function HomePage() {
  // "/" 페이지에 속한 모든 content_blocks 일괄 조회
  const blocksMap = await getBlocksForPage('/')
  const blocks = blocksMapToRecord(blocksMap)

  return <HomeClient blocks={blocks} />
}
