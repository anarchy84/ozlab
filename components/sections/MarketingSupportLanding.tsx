'use client'

import Link from 'next/link'
import { Icon } from '@/components/icons'

const benefits = [
  {
    no: '지원 1',
    title: '플레이스 최적화 세팅',
    desc: '매장 기본 정보, 메뉴, 사진, 키워드, 리뷰 동선까지 손님이 찾기 쉬운 구조로 정리합니다.',
  },
  {
    no: '지원 2',
    title: '플레이스 유료광고비 지원',
    desc: '초반 노출을 빠르게 만들 수 있도록 이벤트 기간 내 플레이스 광고비를 함께 지원합니다.',
  },
  {
    no: '지원 3',
    title: '블로그리뷰 10건 지원',
    desc: '검색에서 오래 남는 리뷰 콘텐츠까지 함께 쌓아, 플레이스 최적화 효과를 키웁니다.',
  },
]

const proofPoints = [
  { label: '지원 혜택', value: '3종' },
  { label: '블로그리뷰', value: '10건' },
  { label: '지원 기간', value: '5월 한 달' },
]

export function MarketingSupportLanding() {
  return (
    <div className="bg-white text-ink-900">
      <section className="relative overflow-hidden bg-surface-dark py-section-tight text-white">
        <div className="pointer-events-none absolute right-[-12%] top-[-35%] h-[620px] w-[620px] rounded-full bg-naver-green/20 blur-[130px]" />
        <div className="pointer-events-none absolute bottom-[-32%] left-[-15%] h-[460px] w-[460px] rounded-full bg-white/10 blur-[110px]" />
        <div className="container-oz relative">
          <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <span className="eyebrow-dark">N connect · 5월 한정 혜택</span>
              <h1 className="mt-6 text-display text-white break-keep">
                플레이스 최적화,
                <br />
                <mark className="hl-solid">무료로 지원</mark>
                합니다.
              </h1>
              <p className="mt-6 max-w-[760px] text-2xl font-extrabold leading-snug text-white break-keep">
                N커넥트 신청하신 회원님들께
                <br />
                &apos;플레이스 마케팅&apos;을 무료로 지원해드립니다.
              </p>
              <p className="mt-5 max-w-[700px] text-lg-fluid text-white/65 break-keep">
                플레이스 최적화. 하고 안하고 매출 차이 최소 3배 이상 난다는거
                다 알고 계시죠?
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/#apply" className="btn btn-primary lg">
                  N커넥트 신청하기
                  <Icon.Arrow s={18} />
                </Link>
                <Link href="#event-benefits" className="btn btn-ghost lg border-white/20 text-white hover:bg-white/10">
                  지원 혜택 보기
                </Link>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-6 shadow-lg backdrop-blur md:p-8">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-naver-neon">
                Place Marketing Event
              </p>
              <h2 className="mt-4 text-h2 text-white break-keep">
                그 어디에도 없던 혜택,
                <br />
                지금 N커넥트 단말기 신청, 교체하시고
                <br />
                플레이스 최적화 서비스를 받아보세요.
              </h2>
              <div className="mt-7 grid gap-3">
                {proofPoints.map((point) => (
                  <div
                    key={point.label}
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.05] px-4 py-3"
                  >
                    <span className="text-sm font-bold text-white/65">{point.label}</span>
                    <strong className="text-xl font-extrabold text-white">{point.value}</strong>
                  </div>
                ))}
              </div>
              <div className="mt-7 rounded-lg bg-white p-5 text-ink-900">
                <p className="text-xs font-extrabold text-naver-deep">지원대상</p>
                <p className="mt-2 text-lg font-extrabold leading-snug break-keep">
                  이벤트 기간 내 N커넥트페이 단말기 신청, 교체하신 모든 고객님들
                </p>
                <p className="mt-4 text-xs font-extrabold text-naver-deep">지원기간</p>
                <p className="mt-2 text-lg font-extrabold">5월 한 달간</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="event-benefits" className="py-section">
        <div className="container-oz">
          <div className="mb-12 max-w-[780px]">
            <span className="eyebrow">EVENT BENEFITS · 무료 지원 내용</span>
            <h2 className="mt-4 text-h1 text-ink-900 break-keep">
              단말기만 바꿔도,
              <br />
              플레이스 마케팅까지 같이 갑니다.
            </h2>
            <p className="mt-4 text-lg-fluid text-ink-500 break-keep">
              매장 검색 노출, 리뷰 콘텐츠, 초기 광고비까지. 사장님이 바로 체감할 수 있는
              세 가지 지원을 한 번에 묶었습니다.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {benefits.map((benefit) => (
              <article
                key={benefit.no}
                className="rounded-xl border border-ink-150 bg-white p-7 shadow-sm transition-all hover:-translate-y-0.5 hover:border-naver-green/40 hover:shadow-md"
              >
                <p className="text-sm font-extrabold text-naver-deep">{benefit.no}</p>
                <h3 className="mt-5 text-h3 text-ink-900 break-keep">{benefit.title}</h3>
                <p className="mt-4 text-[15px] leading-relaxed text-ink-500 break-keep">
                  {benefit.desc}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink-50 py-section-tight">
        <div className="container-oz">
          <div className="grid gap-6 lg:grid-cols-[1fr_0.7fr] lg:items-stretch">
            <div className="rounded-xl bg-surface-dark p-8 text-white md:p-10">
              <span className="eyebrow-dark">WHY PLACE OPTIMIZATION</span>
              <h2 className="mt-4 text-h1 text-white break-keep">
                플레이스는 이제
                <br />
                매장 매출의 첫 관문입니다.
              </h2>
              <p className="mt-5 max-w-[720px] text-lg-fluid text-white/65 break-keep">
                같은 상권, 같은 메뉴여도 손님은 먼저 검색하고 비교합니다. 플레이스가
                정리되어 있는 매장과 그렇지 않은 매장은 시작점부터 다릅니다.
              </p>
            </div>
            <div className="rounded-xl border border-ink-150 bg-white p-8 shadow-sm md:p-10">
              <p className="text-xs font-extrabold tracking-[0.18em] text-naver-deep">EVENT SUMMARY</p>
              <dl className="mt-6 space-y-5">
                <div>
                  <dt className="text-sm font-bold text-ink-400">지원대상</dt>
                  <dd className="mt-1 text-lg font-extrabold text-ink-900 break-keep">
                    이벤트 기간 내 N커넥트페이 단말기 신청, 교체하신 모든 고객님들
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-bold text-ink-400">지원기간</dt>
                  <dd className="mt-1 text-lg font-extrabold text-ink-900">5월 한 달간</dd>
                </div>
                <div>
                  <dt className="text-sm font-bold text-ink-400">지원내용</dt>
                  <dd className="mt-1 text-lg font-extrabold text-ink-900 break-keep">
                    플레이스 최적화 세팅 + 유료광고비 + 블로그리뷰 10건
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>

      <section className="py-section-tight">
        <div className="container-oz">
          <div className="rounded-xl border border-ink-150 bg-gradient-to-br from-white to-naver-tint p-8 shadow-sm md:p-12">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-xs font-extrabold tracking-[0.18em] text-naver-deep">LIMITED OFFER</p>
                <h2 className="mt-4 text-h1 text-ink-900 break-keep">
                  N커넥트 신청하고,
                  <br />
                  플레이스 최적화까지 챙기세요.
                </h2>
                <p className="mt-4 max-w-[720px] text-lg-fluid text-ink-500 break-keep">
                  5월 이벤트 기간 내 신청·교체 고객님께만 제공되는 혜택입니다.
                  상담 신청 후 매장 상황에 맞는 지원 항목을 안내해드립니다.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 lg:justify-end">
                <Link href="/#apply" className="btn btn-primary lg">
                  지금 신청하기
                  <Icon.Arrow s={18} />
                </Link>
                <Link href="tel:1588-0000" className="btn btn-ghost lg">
                  전화 상담
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
