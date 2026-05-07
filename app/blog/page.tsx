// ─────────────────────────────────────────────
// /blog — 블로그 목록 (SEO 최적화 SSR)
// ─────────────────────────────────────────────
import Link from 'next/link'
import type { Metadata } from 'next'
import { listPublishedPosts, getCategoryLabel } from '@/lib/posts'
import { BlocksProvider } from '@/components/editable/BlocksProvider'
import { EditableText } from '@/components/editable/EditableText'
import { getBlocksForPage } from '@/lib/content-blocks-server'
import { blocksMapToRecord, pickTextOrUndef } from '@/lib/content-blocks'
import { PublicPageFrame } from '@/components/sections/PublicPageFrame'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbJsonLd, collectionPageJsonLd, publicMetadata } from '@/lib/seo'

export const revalidate = 0

const PAGE_DESCRIPTION =
  '자영업자·매장 운영자를 위한 결제·POS·플레이스 광고·리뷰 자동화 가이드. 오즈랩페이가 직접 정리한 실전 노하우.'

export const metadata: Metadata = publicMetadata({
  title: '블로그',
  description: PAGE_DESCRIPTION,
  path: '/blog',
  keywords: ['오즈랩페이 블로그', '자영업자 POS', '플레이스 광고', '리뷰 자동화'],
})

const FORMAT_KST = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

export default async function BlogListPage() {
  const [posts, blocksMap] = await Promise.all([
    listPublishedPosts('blog'),
    getBlocksForPage('/blog'),
  ])
  const blocks = blocksMapToRecord(blocksMap)

  return (
    <PublicPageFrame>
    <JsonLd
      data={[
        breadcrumbJsonLd([
          { name: '홈', path: '/' },
          { name: '블로그', path: '/blog' },
        ]),
        collectionPageJsonLd({
          name: '오즈랩페이 블로그',
          description: PAGE_DESCRIPTION,
          path: '/blog',
          posts,
        }),
      ]}
    />
    <BlocksProvider blocks={blocks}>
    <div className="bg-white text-ink-900 min-h-screen">
      <header className="bg-surface-dark text-white py-16">
        <div className="container-oz">
          <Link href="/" className="text-naver-neon text-sm hover:underline">
            ← 오즈랩페이 홈
          </Link>
          <EditableText
            as="h1"
            blockKey="blog.hero.title"
            fallback="오즈랩페이 블로그"
            value={pickTextOrUndef(blocks, 'blog.hero.title')}
            pagePath="/blog"
            className="text-h1 font-extrabold mt-4"
          />
          <EditableText
            as="p"
            blockKey="blog.hero.description"
            fallback="자영업자·매장 운영자를 위한 결제·POS·플레이스 광고·리뷰 자동화 실전 가이드"
            value={pickTextOrUndef(blocks, 'blog.hero.description')}
            pagePath="/blog"
            className="text-ink-300 mt-3 text-lg-fluid break-keep"
          />
        </div>
      </header>

      <main className="container-oz py-12">
        {posts.length === 0 ? (
          <div className="text-center py-20 text-ink-400">
            아직 게시된 글이 없습니다.
          </div>
        ) : (
          <ul className="grid md:grid-cols-2 gap-6">
            {posts.map((p) => (
              <li
                key={p.id}
                className="border border-ink-150 rounded-lg p-6 hover:border-naver-green/50 hover:shadow-md transition-all bg-white"
              >
                <Link href={`/blog/${p.slug}`} className="block">
                  <div className="flex items-center gap-2 text-xs text-ink-500 mb-2">
                    <span className="px-2 py-0.5 rounded bg-naver-soft text-naver-deep font-medium">
                      {getCategoryLabel(p.category)}
                    </span>
                    {p.is_pinned && (
                      <span className="text-amber-600">📌 고정</span>
                    )}
                    {p.published_at && (
                      <span>· {FORMAT_KST.format(new Date(p.published_at))}</span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-ink-900 mb-2 break-keep">
                    {p.title}
                  </h2>
                  {p.excerpt && (
                    <p className="text-ink-600 text-sm break-keep line-clamp-3">
                      {p.excerpt}
                    </p>
                  )}
                  {p.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {p.tags.slice(0, 4).map((t) => (
                        <span
                          key={t}
                          className="text-[11px] px-1.5 py-0.5 rounded bg-ink-100 text-ink-600"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}

        {/* CTA */}
        <div className="mt-16 bg-surface-dark text-white rounded-lg p-8 md:p-12 text-center">
          <EditableText
            as="h2"
            blockKey="blog.cta.title"
            fallback="글 읽고 마음에 들었다면"
            value={pickTextOrUndef(blocks, 'blog.cta.title')}
            pagePath="/blog"
            className="text-h2 font-extrabold mb-3"
          />
          <EditableText
            as="p"
            blockKey="blog.cta.description"
            fallback="오즈랩페이 단말기 0원으로 시작해 보세요. 약정 없음."
            value={pickTextOrUndef(blocks, 'blog.cta.description')}
            pagePath="/blog"
            className="text-ink-300 mb-6"
          />
          <Link
            href="/#apply"
            className="inline-block px-6 py-3 bg-naver-green text-white rounded font-bold hover:bg-naver-dark transition-colors"
          >
            <EditableText
              as="span"
              blockKey="blog.cta.button"
              fallback="지금 신청하기 →"
              value={pickTextOrUndef(blocks, 'blog.cta.button')}
              pagePath="/blog"
            />
          </Link>
        </div>
      </main>
    </div>
    </BlocksProvider>
    </PublicPageFrame>
  )
}
