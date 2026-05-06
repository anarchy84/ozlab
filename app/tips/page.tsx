import Link from 'next/link'
import type { Metadata } from 'next'
import { PublicPageFrame } from '@/components/sections/PublicPageFrame'
import { BlocksProvider } from '@/components/editable/BlocksProvider'
import { EditableText } from '@/components/editable/EditableText'
import { getBlocksForPage } from '@/lib/content-blocks-server'
import { blocksMapToRecord, pickTextOrUndef } from '@/lib/content-blocks'
import { getCategoryLabel, listPublishedPosts, type ContentPost } from '@/lib/posts'

export const revalidate = 0

export const metadata: Metadata = {
  title: '꿀팁',
  description:
    '자영업자와 매장 운영자를 위한 오즈랩페이 꿀팁 게시판. POS, 카드 단말기, 리뷰 자동화, 플레이스 마케팅 실전 가이드를 확인하세요.',
  alternates: { canonical: 'https://ozlabpay.kr/tips' },
  openGraph: {
    title: '오즈랩페이 꿀팁 — 매장 운영 실전 가이드',
    description: 'POS·리뷰·플레이스·매장 마케팅 운영 팁을 한곳에 모았습니다.',
    type: 'website',
  },
}

const FORMAT_KST = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const CATEGORY_FILTERS: Array<{ key: 'all' | ContentPost['category']; label: string }> = [
  { key: 'all', label: '전체' },
  { key: 'guide', label: '가이드' },
  { key: 'blog', label: '블로그' },
  { key: 'case_study', label: '사례' },
  { key: 'news', label: '뉴스' },
  { key: 'faq', label: 'FAQ' },
]

function estimateReadMin(post: ContentPost): number {
  const source = post.excerpt || post.body_md || post.body_html || ''
  return Math.max(2, Math.ceil(source.replace(/<[^>]*>/g, '').length / 220))
}

function isKnownCategory(value: string | undefined): value is ContentPost['category'] {
  return CATEGORY_FILTERS.some((item) => item.key === value && item.key !== 'all')
}

function ArrowIcon({ size = 17 }: { size?: number }) {
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

function SearchIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M20 20l-4.5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export default async function TipsPage({
  searchParams,
}: {
  searchParams?: { category?: string }
}) {
  const activeCategory = isKnownCategory(searchParams?.category)
    ? searchParams?.category
    : 'all'
  const [posts, blocksMap] = await Promise.all([
    listPublishedPosts(activeCategory === 'all' ? undefined : activeCategory),
    getBlocksForPage('/tips'),
  ])
  const blocks = blocksMapToRecord(blocksMap)
  const featured = posts[0]
  const rest = featured ? posts.slice(1) : posts

  return (
    <PublicPageFrame>
      <BlocksProvider blocks={blocks}>
      <div className="bg-white text-ink-900">
        <section className="relative overflow-hidden bg-surface-dark py-section-tight text-white">
          <div className="pointer-events-none absolute right-[-12%] top-[-30%] h-[560px] w-[560px] rounded-full bg-naver-green/20 blur-[120px]" />
          <div className="pointer-events-none absolute bottom-[-35%] left-[-16%] h-[420px] w-[420px] rounded-full bg-white/10 blur-[110px]" />
          <div className="container-oz relative">
            <div className="max-w-[760px]">
              <EditableText
                as="span"
                blockKey="tips.hero.eyebrow"
                fallback="사업자 꿀팁"
                value={pickTextOrUndef(blocks, 'tips.hero.eyebrow')}
                pagePath="/tips"
                className="eyebrow-dark"
              />
              <h1 className="mt-5 text-display text-white break-keep">
                <EditableText
                  as="span"
                  blockKey="tips.hero.title.line1"
                  fallback="사장님들이"
                  value={pickTextOrUndef(blocks, 'tips.hero.title.line1')}
                  pagePath="/tips"
                />
                <br />
                <mark className="hl-solid">
                  <EditableText
                    as="span"
                    blockKey="tips.hero.title.highlight"
                    fallback="꼭 알아야 할"
                    value={pickTextOrUndef(blocks, 'tips.hero.title.highlight')}
                    pagePath="/tips"
                  />
                </mark>
                <br />
                <EditableText
                  as="span"
                  blockKey="tips.hero.title.line3"
                  fallback="매장 운영 꿀팁"
                  value={pickTextOrUndef(blocks, 'tips.hero.title.line3')}
                  pagePath="/tips"
                />
              </h1>
              <EditableText
                as="p"
                blockKey="tips.hero.description"
                fallback="결제, 리뷰, 플레이스, 단말기, 매장 마케팅까지. 오즈랩페이가 실제 상담과 운영에서 자주 마주치는 질문을 글로 정리했습니다."
                value={pickTextOrUndef(blocks, 'tips.hero.description')}
                pagePath="/tips"
                className="mt-6 max-w-[620px] text-lg-fluid text-white/65 break-keep"
              />
            </div>
          </div>
        </section>

        <section className="py-section">
          <div className="container-oz">
            <div className="mb-10 flex gap-2 overflow-x-auto pb-1">
              {CATEGORY_FILTERS.map((item) => {
                const href = item.key === 'all' ? '/tips' : `/tips?category=${item.key}`
                const selected = activeCategory === item.key
                return (
                  <Link
                    key={item.key}
                    href={href}
                    className={`shrink-0 rounded-pill px-4 py-2 text-sm font-bold transition-colors ${
                      selected
                        ? 'bg-ink-900 text-white'
                        : 'bg-ink-100 text-ink-600 hover:bg-naver-soft hover:text-naver-deep'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>

            {posts.length === 0 ? (
                <div className="rounded-xl border border-ink-150 bg-ink-50 px-6 py-16 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-naver-soft text-naver-deep">
                  <SearchIcon />
                </div>
                <h2 className="text-h3 text-ink-900">아직 발행된 꿀팁이 없습니다.</h2>
                <p className="mt-3 text-sm text-ink-500 break-keep">
                  어드민의 콘텐츠 관리에서 글을 발행하면 이 게시판에 자동으로 표시됩니다.
                </p>
              </div>
            ) : (
              <>
                {featured && (
                  <Link
                    href={`/tips/${featured.slug}`}
                    className="group grid overflow-hidden rounded-xl border border-ink-150 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-naver-green/40 hover:shadow-md lg:grid-cols-[1fr_0.86fr]"
                  >
                    <div className="p-7 md:p-10">
                      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-ink-500">
                        <span className="rounded-pill bg-naver-soft px-3 py-1 font-bold text-naver-deep">
                          추천 꿀팁
                        </span>
                        <span>{getCategoryLabel(featured.category)}</span>
                        {featured.published_at && (
                          <span>· {FORMAT_KST.format(new Date(featured.published_at))}</span>
                        )}
                        <span>· {estimateReadMin(featured)}분 읽기</span>
                      </div>
                      <h2 className="text-h1 text-ink-900 break-keep transition-colors group-hover:text-naver-deep">
                        {featured.title}
                      </h2>
                      {featured.excerpt && (
                        <p className="mt-4 text-lg-fluid text-ink-500 break-keep">
                          {featured.excerpt}
                        </p>
                      )}
                      <div className="mt-7 inline-flex items-center gap-2 text-sm font-extrabold text-naver-deep">
                        읽어보기
                        <ArrowIcon size={16} />
                      </div>
                    </div>
                    <div className="min-h-[280px] bg-surface-dark p-6 text-white lg:min-h-full">
                      <div className="flex h-full flex-col justify-between rounded-lg border border-white/10 bg-white/[0.04] p-5">
                        <div>
                          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-naver-neon">
                            Ozlab Tip Board
                          </p>
                          <p className="mt-3 text-2xl font-extrabold text-white break-keep">
                            오늘 바로 적용할 수 있는 운영 노트
                          </p>
                        </div>
                        <div className="mt-8 flex flex-wrap gap-2">
                          {(featured.tags.length > 0
                            ? featured.tags
                            : ['POS', '리뷰', '플레이스', '매장마케팅']
                          )
                            .slice(0, 5)
                            .map((tag) => (
                              <span
                                key={tag}
                                className="rounded-pill bg-white/10 px-3 py-1.5 text-xs font-bold text-white/80"
                              >
                                #{tag}
                              </span>
                            ))}
                        </div>
                      </div>
                    </div>
                  </Link>
                )}

                <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {rest.map((post) => (
                    <Link
                      key={post.id}
                      href={`/tips/${post.slug}`}
                      className="group flex min-h-[260px] flex-col rounded-lg border border-ink-150 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-naver-green/40 hover:shadow-md"
                    >
                      <div className="mb-5 flex items-center justify-between gap-3">
                        <span className="rounded-pill bg-ink-100 px-3 py-1 text-xs font-bold text-ink-600">
                          {getCategoryLabel(post.category)}
                        </span>
                        <span className="text-xs text-ink-400">{estimateReadMin(post)}분 읽기</span>
                      </div>
                      <h3 className="text-xl font-bold leading-snug text-ink-900 break-keep transition-colors group-hover:text-naver-deep">
                        {post.title}
                      </h3>
                      {post.excerpt && (
                        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-500 break-keep">
                          {post.excerpt}
                        </p>
                      )}
                      <div className="mt-auto flex items-center justify-between pt-6">
                        <span className="text-xs text-ink-400">
                          {post.published_at
                            ? FORMAT_KST.format(new Date(post.published_at))
                            : '발행일 없음'}
                        </span>
                        <span className="text-naver-deep">
                          <ArrowIcon />
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        <section className="bg-ink-50 py-section-tight">
          <div className="container-oz">
            <div className="rounded-xl bg-surface-dark p-8 text-center text-white md:p-12">
              <EditableText
                as="span"
                blockKey="tips.cta.eyebrow"
                fallback="질문이 더 급하다면"
                value={pickTextOrUndef(blocks, 'tips.cta.eyebrow')}
                pagePath="/tips"
                className="eyebrow-dark"
              />
              <EditableText
                as="h2"
                blockKey="tips.cta.title"
                fallback={'글보다 빠르게,\n매장 상황을 상담받으세요.'}
                value={pickTextOrUndef(blocks, 'tips.cta.title')}
                pagePath="/tips"
                className="mt-4 text-h1 text-white break-keep whitespace-pre-line"
              />
              <EditableText
                as="p"
                blockKey="tips.cta.description"
                fallback="단말기, 리뷰 자동화, 플레이스 노출, 마케팅 지원까지 한 번에 확인해드립니다."
                value={pickTextOrUndef(blocks, 'tips.cta.description')}
                pagePath="/tips"
                className="mx-auto mt-4 max-w-[620px] text-lg-fluid text-white/65 break-keep"
              />
              <Link href="/#apply" className="btn btn-primary lg mt-8">
                <EditableText
                  as="span"
                  blockKey="tips.cta.button"
                  fallback="상담 신청하기"
                  value={pickTextOrUndef(blocks, 'tips.cta.button')}
                  pagePath="/tips"
                />
                <ArrowIcon size={18} />
              </Link>
            </div>
          </div>
        </section>
      </div>
      </BlocksProvider>
    </PublicPageFrame>
  )
}
