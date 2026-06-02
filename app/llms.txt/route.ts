import { NextResponse } from 'next/server'
import { listPublishedPosts } from '@/lib/posts'
import { SITE_PHONE } from '@/lib/contact'
import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME, SITE_URL, postCanonicalPath } from '@/lib/seo'

export const revalidate = 600

export async function GET() {
  const posts = await listPublishedPosts()
  const lines = [
    `# ${SITE_NAME}`,
    '',
    `> ${SITE_DESCRIPTION}`,
    '',
    '## Core Pages',
    `- Home: ${SITE_URL}/`,
    `- Naver POS and card terminal: ${absoluteUrl('/naver-pos')}`,
    `- Apple Pay POS terminal: ${absoluteUrl('/apple-pay-pos')}`,
    `- Business internet: ${absoluteUrl('/internet')}`,
    `- Table order: ${absoluteUrl('/business/torder')}`,
    `- CCTV: ${absoluteUrl('/business/cctv')}`,
    `- Place marketing support: ${absoluteUrl('/marketing-support')}`,
    `- Tips: ${absoluteUrl('/tips')}`,
    `- Blog: ${absoluteUrl('/blog')}`,
    '',
    '## What Ozlabpay Offers',
    '- Naver card terminal, Naver POS, POS terminal, and payment POS consultation for local stores',
    '- Apple Pay POS and NFC payment terminal compatibility checks',
    '- Naver Pay connected POS and card terminal consultation',
    '- Review automation and Naver Place marketing support for local stores',
    '- Business internet, table order, kiosk, and CCTV setup consultation',
    '- May event: N connect terminal application or replacement customers receive place optimization, paid place ad support, and 10 blog reviews',
    '',
    '## Fresh Articles',
    ...posts.slice(0, 20).map((post) => `- ${post.title}: ${absoluteUrl(postCanonicalPath(post))}`),
    '',
    '## Contact',
    `- Phone: ${SITE_PHONE}`,
    `- Canonical site: ${SITE_URL}`,
  ]

  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=86400',
    },
  })
}
