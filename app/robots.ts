// ─────────────────────────────────────────────
// /robots.txt — Next.js 14 표준
// ─────────────────────────────────────────────
import type { MetadataRoute } from 'next'

const SITE_URL = 'https://ozlabpay.kr'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
