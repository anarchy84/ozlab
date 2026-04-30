// ─────────────────────────────────────────────
// /blog/[slug] — 블로그 상세 (SSR + 메타 동적 + JSON-LD)
// ─────────────────────────────────────────────
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPostBySlug, listPublishedPosts, getCategoryLabel } from '@/lib/posts'
import { renderMarkdown } from '@/lib/markdown'

export const revalidate = 600

interface Params {
  params: { slug: string }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const post = await getPostBySlug(params.slug)
  if (!post) return { title: '글을 찾을 수 없습니다' }
  const url = `https://ozlabpay.kr/blog/${post.slug}`
  return {
    title: post.meta_title ?? post.title,
    description: post.meta_description ?? post.excerpt ?? undefined,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      title: post.meta_title ?? post.title,
      description: post.meta_description ?? post.excerpt ?? undefined,
      url,
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at,
      authors: [post.author_name],
      tags: post.tags,
      ...(post.cover_image && { images: [post.cover_image] }),
    },
  }
}

const FORMAT_KST = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

export default async function BlogPostPage({ params }: Params) {
  const post = await getPostBySlug(params.slug)
  if (!post) notFound()

  // 관련 글 — 같은 카테고리 최신 3건 (현재 글 제외)
  const allInCategory = await listPublishedPosts(post.category)
  const related = allInCategory.filter((p) => p.id !== post.id).slice(0, 3)

  const html = renderMarkdown(post.body_md)

  // JSON-LD Article 구조화 데이터 (구글 리치 결과)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.meta_description ?? post.excerpt,
    author: { '@type': 'Organization', name: post.author_name },
    publisher: {
      '@type': 'Organization',
      name: '오즈랩페이',
      url: 'https://ozlabpay.kr',
    },
    datePublished: post.published_at,
    dateModified: post.updated_at,
    mainEntityOfPage: `https://ozlabpay.kr/blog/${post.slug}`,
    keywords: post.tags.join(', '),
  }

  return (
    <div className="bg-white text-ink-900 min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="bg-surface-dark text-white py-12">
        <div className="container-oz max-w-3xl mx-auto">
          <div className="flex items-center gap-3 text-sm">
            <Link href="/blog" className="text-naver-neon hover:underline">
              ← 블로그 목록
            </Link>
            <span className="text-ink-500">·</span>
            <span className="px-2 py-0.5 rounded bg-naver-green/20 text-naver-neon text-xs font-medium">
              {getCategoryLabel(post.category)}
            </span>
          </div>
          <h1 className="text-h1 font-extrabold mt-4 break-keep">{post.title}</h1>
          {post.excerpt && (
            <p className="text-ink-300 mt-4 text-lg-fluid break-keep">{post.excerpt}</p>
          )}
          <div className="mt-6 flex items-center gap-3 text-sm text-ink-400">
            <span>{post.author_name}</span>
            <span>·</span>
            {post.published_at && (
              <time dateTime={post.published_at}>
                {FORMAT_KST.format(new Date(post.published_at))}
              </time>
            )}
            <span>·</span>
            <span>{post.view_count.toLocaleString()} views</span>
          </div>
        </div>
      </header>

      <main className="container-oz max-w-3xl mx-auto py-12">
        <article
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {/* 태그 */}
        {post.tags.length > 0 && (
          <div className="mt-10 pt-6 border-t border-ink-150 flex flex-wrap gap-2">
            {post.tags.map((t) => (
              <span
                key={t}
                className="px-2 py-1 text-xs bg-ink-100 text-ink-600 rounded"
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 bg-surface-dark text-white rounded-lg p-8 text-center">
          <h2 className="text-h3 font-bold mb-3">
            지금 단말기 0원으로 시작해 보세요
          </h2>
          <p className="text-ink-300 text-sm mb-5 break-keep">
            약정 없음. 영업일 24시간 안에 담당 매니저가 연락드립니다.
          </p>
          <Link
            href="/#apply"
            className="inline-block px-6 py-3 bg-naver-green text-white rounded font-bold hover:bg-naver-dark transition-colors"
          >
            상담 신청하기 →
          </Link>
        </div>

        {/* 관련 글 */}
        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="text-h3 font-bold mb-6">함께 보면 좋은 글</h2>
            <ul className="grid md:grid-cols-3 gap-4">
              {related.map((p) => (
                <li
                  key={p.id}
                  className="border border-ink-150 rounded-lg p-4 hover:border-naver-green/50 transition-colors"
                >
                  <Link href={`/blog/${p.slug}`}>
                    <span className="text-xs text-ink-500">
                      {getCategoryLabel(p.category)}
                    </span>
                    <h3 className="text-base font-bold mt-2 text-ink-900 break-keep line-clamp-3">
                      {p.title}
                    </h3>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  )
}
