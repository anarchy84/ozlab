import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
import type { Metadata } from 'next'
import { PublicPageFrame } from '@/components/sections/PublicPageFrame'
import { getCategoryLabel, getPostBySlug, listPublishedPosts } from '@/lib/posts'
import { renderMarkdown } from '@/lib/markdown'
import { JsonLd } from '@/components/seo/JsonLd'
import { absoluteUrl, articleJsonLd, breadcrumbJsonLd, postCanonicalPath } from '@/lib/seo'

export const revalidate = 600

interface Params {
  params: { slug: string }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const post = await getPostBySlug(params.slug)
  if (!post) return { title: '글을 찾을 수 없습니다' }
  const canonicalPath = postCanonicalPath(post)
  const url = absoluteUrl(canonicalPath)
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
      ...(post.cover_image && { images: [absoluteUrl(post.cover_image)] }),
    },
    twitter: {
      card: 'summary_large_image',
      title: post.meta_title ?? post.title,
      description: post.meta_description ?? post.excerpt ?? undefined,
      ...(post.cover_image && { images: [absoluteUrl(post.cover_image)] }),
    },
  }
}

const FORMAT_KST = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

function ArrowIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default async function TipPostPage({ params }: Params) {
  const post = await getPostBySlug(params.slug)
  if (!post) notFound()
  if (post.category === 'blog') permanentRedirect(postCanonicalPath(post))

  const allInCategory = await listPublishedPosts(post.category)
  const related = allInCategory.filter((p) => p.id !== post.id).slice(0, 3)
  const html = post.body_html && post.body_html.trim().length > 0
    ? post.body_html
    : renderMarkdown(post.body_md)

  return (
    <PublicPageFrame>
      <div className="bg-white text-ink-900">
        <JsonLd
          data={[
            breadcrumbJsonLd([
              { name: '홈', path: '/' },
              { name: '꿀팁', path: '/tips' },
              { name: post.title, path: `/tips/${post.slug}` },
            ]),
            articleJsonLd(post),
          ]}
        />

        <header className="bg-surface-dark py-12 text-white">
          <div className="container-oz mx-auto max-w-3xl">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Link href="/tips" className="text-naver-neon hover:underline">
                ← 꿀팁 목록
              </Link>
              <span className="text-ink-500">·</span>
              <span className="rounded bg-naver-green/20 px-2 py-0.5 text-xs font-bold text-naver-neon">
                {getCategoryLabel(post.category)}
              </span>
            </div>
            <h1 className="mt-4 text-h1 font-extrabold break-keep">{post.title}</h1>
            {post.excerpt && (
              <p className="mt-4 text-lg-fluid text-ink-300 break-keep">{post.excerpt}</p>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-ink-400">
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

        <main className="container-oz mx-auto max-w-3xl py-12">
          {/*
            content-prose는 에디터 출력 HTML을 반응형 본문으로 렌더한다.
            - 에디터에서 '가운데/오른쪽/양쪽' 정렬한 element 만 attribute selector 가 매칭됨
            - 미설정 element 는 기본 왼쪽 정렬 유지 → 자동 가운데/우정렬 X
            - 이미지는 사용자 지정 width를 보존하되 PC/MO 모두 max-width로 넘침 방지
          */}
          <article
            className="content-prose max-w-none
              [&_p[style*='text-align:_center']]:text-center
              [&_p[style*='text-align:_right']]:text-right
              [&_p[style*='text-align:_justify']]:text-justify
              [&_h2[style*='text-align:_center']]:text-center
              [&_h2[style*='text-align:_right']]:text-right
              [&_h2[style*='text-align:_justify']]:text-justify
              [&_h3[style*='text-align:_center']]:text-center
              [&_h3[style*='text-align:_right']]:text-right
              [&_h3[style*='text-align:_justify']]:text-justify
              [&_img]:h-auto [&_img]:max-w-full"
            dangerouslySetInnerHTML={{ __html: html }}
          />

          {post.tags.length > 0 && (
            <div className="mt-10 flex flex-wrap gap-2 border-t border-ink-150 pt-6">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded bg-ink-100 px-2 py-1 text-xs text-ink-600"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-12 rounded-lg bg-surface-dark p-8 text-center text-white">
            <h2 className="mb-3 text-h3 font-bold">지금 단말기 0원으로 시작해 보세요</h2>
            <p className="mb-5 text-sm text-ink-300 break-keep">
              약정 없음. 영업일 24시간 안에 담당 매니저가 연락드립니다.
            </p>
            <Link href="/#apply" className="btn btn-primary">
              상담 신청하기
              <ArrowIcon />
            </Link>
          </div>

          {related.length > 0 && (
            <section className="mt-16">
              <h2 className="mb-6 text-h3 font-bold">함께 보면 좋은 꿀팁</h2>
              <ul className="grid gap-4 md:grid-cols-3">
                {related.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-lg border border-ink-150 p-4 transition-colors hover:border-naver-green/50"
                  >
                    <Link href={postCanonicalPath(item)}>
                      <span className="text-xs text-ink-500">
                        {getCategoryLabel(item.category)}
                      </span>
                      <h3 className="mt-2 line-clamp-3 text-base font-bold text-ink-900 break-keep">
                        {item.title}
                      </h3>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </main>
      </div>
    </PublicPageFrame>
  )
}
