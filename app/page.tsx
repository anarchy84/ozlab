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
import { fetchCtasByPlacement } from '@/lib/cta-server'
import HomeClient from './(home)/HomeClient'

export const revalidate = 0

export default async function HomePage() {
  // 병렬로 콘텐츠 블록 + CTA 마스터 조회
  const [blocksMap, ctasByPlacement] = await Promise.all([
    getBlocksForPage('/'),
    fetchCtasByPlacement(),
  ])
  const blocks = blocksMapToRecord(blocksMap)

  return <HomeClient blocks={blocks} ctasByPlacement={ctasByPlacement} />
}
