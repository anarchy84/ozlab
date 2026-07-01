import type { Metadata } from 'next'
import type { ContentPost } from '@/lib/posts'
import { SITE_PHONE } from '@/lib/contact'

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.ozlabpay.kr').replace(/\/$/, '')
export const SITE_NAME = '오즈랩페이'
export const SITE_DESCRIPTION =
  '네이버 카드 단말기, 네이버 POS, 포스단말기, 애플페이 결제 단말기 도입부터 리뷰 자동화와 플레이스 마케팅까지 매장 운영을 한 번에 연결합니다.'

// GTM (Google Tag Manager) 컨테이너 ID
//   - env 로 override 가능 (Vercel 에 NEXT_PUBLIC_GTM_ID 등록 권장)
//   - fallback 으로 운영 컨테이너 GTM-N3HSNZPJ 박아둠 (env 누락돼도 안전)
//   - 추후 어드민 사이트 설정에서 동적 편집 기능 만들 때까지 이 패턴 유지
export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID ?? 'GTM-N3HSNZPJ'

export function absoluteUrl(path = '/'): string {
  if (/^https?:\/\//i.test(path)) return path
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

export function pageTitle(title: string): string {
  return title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`
}

export function publicMetadata({
  title,
  description,
  path,
  keywords = [],
  type = 'website',
}: {
  title: string
  description: string
  path: string
  keywords?: string[]
  type?: 'website' | 'article'
}): Metadata {
  const url = absoluteUrl(path)
  return {
    title,
    description,
    keywords,
    alternates: { canonical: url },
    openGraph: {
      type,
      locale: 'ko_KR',
      siteName: SITE_NAME,
      title: pageTitle(title),
      description,
      url,
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle(title),
      description,
    },
  }
}

export function postCanonicalPath(post: Pick<ContentPost, 'category' | 'slug'>): string {
  return post.category === 'blog' ? `/blog/${post.slug}` : `/tips/${post.slug}`
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'LocalBusiness'],
    '@id': absoluteUrl('/#organization'),
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl('/icon-512x512.png'),
    telephone: SITE_PHONE,
    areaServed: 'KR',
    sameAs: [SITE_URL],
    description: SITE_DESCRIPTION,
  }
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': absoluteUrl('/#website'),
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: 'ko-KR',
    publisher: { '@id': absoluteUrl('/#organization') },
    description: SITE_DESCRIPTION,
  }
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}

export function faqJsonLd(faqs: Array<{ q: string; a: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a,
      },
    })),
  }
}

export function serviceJsonLd({
  name,
  description,
  path,
  serviceType,
  keywords,
  audience,
  offerCatalog,
}: {
  name: string
  description: string
  path: string
  serviceType: string
  keywords?: string[]
  audience?: string
  offerCatalog?: Array<{ name: string; description?: string }>
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name,
    description,
    serviceType,
    keywords: keywords?.join(', '),
    provider: { '@id': absoluteUrl('/#organization') },
    areaServed: 'KR',
    url: absoluteUrl(path),
    audience: audience
      ? {
          '@type': 'Audience',
          audienceType: audience,
        }
      : undefined,
    hasOfferCatalog: offerCatalog?.length
      ? {
          '@type': 'OfferCatalog',
          name: `${name} 제공 항목`,
          itemListElement: offerCatalog.map((item, index) => ({
            '@type': 'Offer',
            position: index + 1,
            name: item.name,
            description: item.description,
            itemOffered: {
              '@type': 'Service',
              name: item.name,
              description: item.description,
            },
          })),
        }
      : undefined,
  }
}

export function collectionPageJsonLd({
  name,
  description,
  path,
  posts,
}: {
  name: string
  description: string
  path: string
  posts: ContentPost[]
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    description,
    url: absoluteUrl(path),
    inLanguage: 'ko-KR',
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: posts.map((post, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: absoluteUrl(postCanonicalPath(post)),
        name: post.title,
      })),
    },
  }
}

export function articleJsonLd(post: ContentPost) {
  const path = postCanonicalPath(post)
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.meta_description ?? post.excerpt ?? undefined,
    image: post.cover_image ? [absoluteUrl(post.cover_image)] : undefined,
    author: { '@type': 'Organization', name: post.author_name || SITE_NAME },
    publisher: { '@id': absoluteUrl('/#organization') },
    datePublished: post.published_at ?? post.created_at,
    dateModified: post.updated_at,
    mainEntityOfPage: absoluteUrl(path),
    keywords: post.tags.join(', '),
    inLanguage: 'ko-KR',
  }
}

function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function looksLikeQuestion(text: string): boolean {
  const t = text.trim()
  return /[?？]$/.test(t) || /(인가요|되나요|가능한가요|필요한가요|얼마인가요|어떻게 하나요)$/.test(t)
}

function extractFaqsFromHtml(html: string): Array<{ q: string; a: string }> {
  const headingRe = /<h([23])[^>]*>([\s\S]*?)<\/h\1>/gi
  const matches = Array.from(html.matchAll(headingRe))
  return matches
    .map((match, index) => {
      const question = stripHtmlToText(match[2])
      const start = (match.index ?? 0) + match[0].length
      const end = index + 1 < matches.length ? (matches[index + 1].index ?? html.length) : html.length
      const answer = stripHtmlToText(html.slice(start, end)).slice(0, 700)
      return { q: question, a: answer }
    })
    .filter((item) => looksLikeQuestion(item.q) && item.a.length >= 20)
}

export function faqFromPostJsonLd(post: ContentPost, html: string) {
  if (post.category !== 'faq') return null
  const extracted = extractFaqsFromHtml(html)
  const fallbackAnswer = stripHtmlToText(post.excerpt || html).slice(0, 700)
  const faqs = extracted.length > 0
    ? extracted
    : fallbackAnswer.length >= 20
      ? [{ q: post.title, a: fallbackAnswer }]
      : []
  return faqs.length > 0 ? faqJsonLd(faqs) : null
}
