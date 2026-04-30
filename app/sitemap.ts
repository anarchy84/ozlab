// ─────────────────────────────────────────────
// /sitemap.xml — Next.js 14 표준 sitemap
//
// 동적 :
//   - 홈 / 블로그 목록 / 블로그 글 (모든 published)
// ─────────────────────────────────────────────
import type { MetadataRoute } from 'next'
import { getAllPostSlugs } from '@/lib/posts'

const SITE_URL = 'https://ozlabpay.kr'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await getAllPostSlugs()
  const now = new Date()

  return [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    ...slugs.map((slug) => ({
      url: `${SITE_URL}/blog/${slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ]
}
