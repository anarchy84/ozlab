// ─────────────────────────────────────────────
// /sitemap.xml — Next.js 14 표준 sitemap
//
// 동적 :
//   - 홈 / 블로그 목록 / 블로그 글 (모든 published)
// ─────────────────────────────────────────────
import type { MetadataRoute } from 'next'
import { listPublishedPosts, type ContentPostCategory } from '@/lib/posts'
import { SITE_URL } from '@/lib/seo'

const TIP_CATEGORIES: ContentPostCategory[] = ['guide', 'case_study', 'news', 'faq']

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [blogPosts, tipPosts] = await Promise.all([
    listPublishedPosts('blog'),
    listPublishedPosts(TIP_CATEGORIES),
  ])
  const now = new Date()

  return [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/naver-pos`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.95,
    },
    {
      url: `${SITE_URL}/apple-pay-pos`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/tips`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/internet`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/business/torder`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/business/cctv`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/marketing-support`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    ...blogPosts.map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: post.updated_at ? new Date(post.updated_at) : now,
      changeFrequency: 'monthly' as const,
      priority: post.is_pinned ? 0.75 : 0.7,
    })),
    ...tipPosts.map((post) => ({
      url: `${SITE_URL}/tips/${post.slug}`,
      lastModified: post.updated_at ? new Date(post.updated_at) : now,
      changeFrequency: 'monthly' as const,
      priority: post.is_pinned ? 0.75 : 0.7,
    })),
  ]
}
