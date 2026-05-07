import type { Metadata } from 'next'
import type { ContentPost } from '@/lib/posts'

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ozlabpay.kr').replace(/\/$/, '')
export const SITE_NAME = '오즈랩페이'
export const SITE_DESCRIPTION =
  'POS + 카드 단말기 0원, 네이버페이 연동, 리뷰 자동화, 플레이스 마케팅까지 매장 운영을 한 번에 연결합니다.'
export const SITE_PHONE = '1588-0000'

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
}: {
  name: string
  description: string
  path: string
  serviceType: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name,
    description,
    serviceType,
    provider: { '@id': absoluteUrl('/#organization') },
    areaServed: 'KR',
    url: absoluteUrl(path),
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
