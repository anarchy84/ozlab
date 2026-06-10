// ─────────────────────────────────────────────
// /rss — RSS 2.0 피드 (모든 발행 콘텐츠)
//
// 포함 :
//   - 블로그 (/blog/[slug])
//   - 팁 (가이드/사례/뉴스/FAQ — /tips/[slug])
//
// 정렬 : published_at 내림차순, 최근 50개
//
// 표준 : RSS 2.0 + Atom self-link
//        body_html → <content:encoded> (CDATA)
//        excerpt → <description> (CDATA)
//
// 캐싱 : 30분 CDN 캐시 (revalidate 시간 단위 충돌 회피)
// ─────────────────────────────────────────────

import { listPublishedPosts, type ContentPost, type ContentPostCategory } from '@/lib/posts'
import { SITE_URL } from '@/lib/seo'

export const revalidate = 1800   // 30분
export const dynamic = 'force-static'

const TIP_CATEGORIES: ContentPostCategory[] = ['guide', 'case_study', 'news', 'faq']

// ─────────────────────────────────────────────
// XML 이스케이프 (CDATA 밖)
// ─────────────────────────────────────────────
function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// CDATA 내부에서 `]]>` 가 본문에 있으면 split
function cdataSafe(s: string): string {
  return s.split(']]>').join(']]]]><![CDATA[>')
}

// ─────────────────────────────────────────────
// RFC 822 날짜 (RSS pubDate 표준)
// ─────────────────────────────────────────────
function rfc822(date: Date): string {
  return date.toUTCString()
}

// 카테고리 → URL prefix
function categoryToPath(c: ContentPost['category']): string {
  return c === 'blog' ? 'blog' : 'tips'
}

// ─────────────────────────────────────────────
// RSS XML 생성
// ─────────────────────────────────────────────
function buildRssXml(posts: ContentPost[]): string {
  const now = new Date()
  const lastBuild = posts[0]?.published_at
    ? new Date(posts[0].published_at)
    : now

  const items = posts
    .slice(0, 50)
    .map((post) => {
      const path = categoryToPath(post.category)
      const url = `${SITE_URL}/${path}/${post.slug}`
      const pubDate = rfc822(
        post.published_at ? new Date(post.published_at) : new Date(post.created_at),
      )
      const excerpt = post.excerpt ?? post.meta_description ?? ''
      const body = post.body_html ?? ''

      return `    <item>
      <title><![CDATA[${cdataSafe(post.title)}]]></title>
      <link>${xmlEscape(url)}</link>
      <guid isPermaLink="true">${xmlEscape(url)}</guid>
      <pubDate>${pubDate}</pubDate>
      <author>noreply@ozlabpay.kr (${xmlEscape(post.author_name || 'OZ labPay')})</author>
      <category>${xmlEscape(post.category)}</category>
      ${post.tags?.length ? post.tags.map((t) => `<category>${xmlEscape(t)}</category>`).join('\n      ') : ''}
      <description><![CDATA[${cdataSafe(excerpt)}]]></description>
      ${body ? `<content:encoded><![CDATA[${cdataSafe(body)}]]></content:encoded>` : ''}
      ${post.cover_image ? `<enclosure url="${xmlEscape(post.cover_image)}" type="image/jpeg" />` : ''}
    </item>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>OZ labPay — 블로그 · 가이드</title>
    <link>${xmlEscape(SITE_URL)}</link>
    <description>오즈랩페이의 카드 단말기·인터넷·POS·CCTV·테이블오더 가이드와 사례.</description>
    <language>ko-KR</language>
    <copyright>© ${now.getFullYear()} OZ labPay. All rights reserved.</copyright>
    <managingEditor>noreply@ozlabpay.kr (OZ labPay)</managingEditor>
    <webMaster>noreply@ozlabpay.kr (OZ labPay)</webMaster>
    <lastBuildDate>${rfc822(lastBuild)}</lastBuildDate>
    <pubDate>${rfc822(lastBuild)}</pubDate>
    <generator>Next.js (ozlabpay.kr)</generator>
    <atom:link href="${xmlEscape(SITE_URL)}/rss" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`
}

// ─────────────────────────────────────────────
// GET — RSS XML 응답
// ─────────────────────────────────────────────
export async function GET() {
  // 블로그 + 팁 카테고리 4종 모두 fetch
  const [blogPosts, tipPosts] = await Promise.all([
    listPublishedPosts('blog'),
    listPublishedPosts(TIP_CATEGORIES),
  ])

  // 합치고 published_at 기준 내림차순
  const all = [...blogPosts, ...tipPosts].sort((a, b) => {
    const da = a.published_at ? new Date(a.published_at).getTime() : 0
    const db = b.published_at ? new Date(b.published_at).getTime() : 0
    return db - da
  })

  const xml = buildRssXml(all)

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      // CDN 캐시 30분, 클라이언트 캐시 5분
      'Cache-Control': 'public, max-age=300, s-maxage=1800, stale-while-revalidate=3600',
    },
  })
}
