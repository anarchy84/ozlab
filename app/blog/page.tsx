// ─────────────────────────────────────────────
// /blog — 블로그 목록 (SEO 최적화 SSR)
// ─────────────────────────────────────────────
import Link from 'next/link'
import type { Metadata } from 'next'
import { listPublishedPosts, getCategoryLabel } from '@/lib/posts'

export const revalidate = 600 // 10분 ISR

export const metadata: Metadata = {
  title: '블로그',
  description:
    '자영업자·매장 운영자를 위한 결제·POS·플레이스 광고·리뷰 자동화 가이드. 오즈랩페이가 직접 정리한 실전 노하우.',
  alternates: { canonical: 'https://ozlabpay.kr/blog' },
  openGraph: {
    title: '오즈랩페이 블로그 — 자영업 매장 운영 가이드',
    description: '결제·POS·플레이스·리뷰 자동화 실전 가이드.',
    type: 'website',
  },
}

const FORMAT_KST = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

export default async function BlogListPage() {
  const posts = await listPublishedPosts()

  return (
    <div className="bg-white text-ink-900 min-h-screen">
      <header className="bg-surface-dark text-white py-16">
        <div className="container-oz">
          <Link href="/" className="text-naver-neon text-sm hover:underline">
            ← 오즈랩페이 홈
          </Link>
          <h1 className="text-h1 font-extrabold mt-4">오즈랩페이 블로그</h1>
          <p className="text-ink-300 mt-3 text-lg-fluid break-keep">
            자영업자·매장 운영자를 위한 결제·POS·플레이스 광고·리뷰 자동화 실전 가이드
          </p>
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
          <h2 className="text-h2 font-extrabold mb-3">
            글 읽고 마음에 들었다면
          </h2>
          <p className="text-ink-300 mb-6">
            오즈랩페이 단말기 0원으로 시작해 보세요. 약정 없음.
          </p>
          <Link
            href="/#apply"
            className="inline-block px-6 py-3 bg-naver-green text-white rounded font-bold hover:bg-naver-dark transition-colors"
          >
            지금 신청하기 →
          </Link>
        </div>
      </main>
    </div>
  )
}
