'use client'

import Link from 'next/link'
import { Icon } from '@/components/icons'
import type { ServiceLandingData } from '@/lib/service-pages'

interface Props {
  data: ServiceLandingData
}

function SectionHeader({
  eyebrow,
  title,
  description,
  align = 'center',
  tone = 'light',
}: {
  eyebrow: string
  title: string
  description?: string
  align?: 'center' | 'left'
  tone?: 'light' | 'dark'
}) {
  return (
    <div
      className={`mb-10 md:mb-14 ${
        align === 'center' ? 'mx-auto max-w-[760px] text-center' : 'max-w-[720px]'
      }`}
    >
      <span className={tone === 'dark' ? 'eyebrow-dark' : 'eyebrow'}>{eyebrow}</span>
      <h2 className={`mt-4 text-h1 break-keep ${tone === 'dark' ? 'text-white' : 'text-ink-900'}`}>
        {title}
      </h2>
      {description && (
        <p className={`mt-4 text-lg-fluid break-keep ${tone === 'dark' ? 'text-white/65' : 'text-ink-500'}`}>
          {description}
        </p>
      )}
    </div>
  )
}

function ServiceCard({
  card,
  index,
}: {
  card: ServiceLandingData['intro']['cards'][number]
  index: number
}) {
  return (
    <article className="group relative h-full rounded-lg border border-ink-150 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-naver-green/40 hover:shadow-md md:p-7">
      <div className="mb-5 flex items-center justify-between gap-4">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-naver-soft text-sm font-extrabold text-naver-deep">
          {card.meta ?? String(index + 1).padStart(2, '0')}
        </span>
        <span className="text-naver-deep opacity-70 transition-opacity group-hover:opacity-100">
          {index % 3 === 0 ? <Icon.Shield s={22} /> : index % 3 === 1 ? <Icon.Card s={22} /> : <Icon.Chart s={22} />}
        </span>
      </div>
      <h3 className="text-h3 text-ink-900 break-keep">{card.title}</h3>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-500 break-keep">{card.desc}</p>
      {card.bullets && (
        <ul className="mt-5 space-y-2.5">
          {card.bullets.map((bullet) => (
            <li key={bullet} className="flex items-start gap-2 text-sm text-ink-600 break-keep">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-naver-soft text-naver-deep">
                <Icon.Check s={13} />
              </span>
              {bullet}
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

export function ServiceLanding({ data }: Props) {
  const introGrid =
    data.intro.cards.length >= 4 ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'
  const catalogGrid =
    data.catalog.cards.length >= 4 ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'

  return (
    <div className="bg-white text-ink-900">
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-white to-naver-tint/70 py-section-tight">
        <div className="pointer-events-none absolute right-[-12%] top-[-18%] h-[520px] w-[520px] rounded-full bg-naver-green/15 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-[-28%] left-[-14%] h-[420px] w-[420px] rounded-full bg-ink-900/5 blur-[100px]" />

        <div className="container-oz relative grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <span className="eyebrow">{data.eyebrow}</span>
            <h1 className="mt-5 text-display text-ink-900 break-keep">
              {data.hero.line1}
              <br />
              <mark className="hl-green">{data.hero.highlight}</mark>
              <br />
              {data.hero.line3}
            </h1>
            <p className="mt-6 max-w-[580px] text-lg-fluid text-ink-600 break-keep">
              {data.hero.description}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="#consult" className="btn btn-primary lg">
                {data.primaryCta}
                <Icon.Arrow s={18} />
              </Link>
              <Link href={data.secondaryHref ?? '/#apply'} className="btn btn-ghost lg">
                {data.secondaryCta}
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-xl bg-surface-dark p-5 text-white shadow-lg md:p-7">
              <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-naver-neon">
                    Ozlab Service Desk
                  </p>
                  <p className="mt-1 text-sm text-white/60">견적 · 설치 · 운영 점검</p>
                </div>
                <span className="rounded-full bg-naver-green px-3 py-1 text-xs font-bold text-white">
                  LIVE
                </span>
              </div>

              <div className="grid gap-3">
                {data.stats.map((stat, index) => (
                  <div
                    key={stat.label}
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3"
                  >
                    <span className="text-sm text-white/70">{stat.label}</span>
                    <span className="text-xl font-extrabold text-white">{stat.value}</span>
                    <span className="text-naver-neon">
                      {index === 0 ? <Icon.Search s={18} /> : index === 1 ? <Icon.Shield s={18} /> : <Icon.Check s={18} />}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-lg bg-white p-5 text-ink-900">
                <p className="text-sm font-bold">상담 체크리스트</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {data.consultChips.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-pill bg-naver-soft px-3 py-1.5 text-xs font-semibold text-naver-deep"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-section">
        <div className="container-oz">
          <SectionHeader
            eyebrow={data.intro.eyebrow}
            title={data.intro.title}
            description={data.intro.description}
          />
          <div className={`grid gap-5 ${introGrid}`}>
            {data.intro.cards.map((card, index) => (
              <ServiceCard key={card.title} card={card} index={index} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink-50 py-section">
        <div className="container-oz">
          <SectionHeader
            eyebrow={data.catalog.eyebrow}
            title={data.catalog.title}
            description={data.catalog.description}
            align="left"
          />
          <div className={`grid gap-5 ${catalogGrid}`}>
            {data.catalog.cards.map((card, index) => (
              <ServiceCard key={card.title} card={card} index={index} />
            ))}
          </div>
        </div>
      </section>

      <section className="py-section">
        <div className="container-oz">
          <SectionHeader
            eyebrow={data.proof.eyebrow}
            title={data.proof.title}
            description={data.proof.description}
          />
          <div className="mx-auto grid max-w-[920px] gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data.proof.cards.map((metric) => (
              <div
                key={metric.label}
                className="rounded-lg border border-ink-150 bg-white p-6 text-center shadow-sm"
              >
                <p className="text-3xl font-extrabold text-ink-900">{metric.value}</p>
                <p className="mt-2 text-sm text-ink-500 break-keep">{metric.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-surface-dark py-section text-white">
        <div className="container-oz">
          <SectionHeader
            eyebrow={data.guide.eyebrow}
            title={data.guide.title}
            description={data.guide.description}
            tone="dark"
          />
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {data.guide.cards.map((card, index) => (
              <article
                key={card.title}
                className="rounded-lg border border-white/10 bg-white/[0.04] p-6 backdrop-blur"
              >
                <span className="text-sm font-extrabold text-naver-neon">
                  {card.meta ?? String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-4 text-xl font-bold text-white break-keep">{card.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/65 break-keep">{card.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-section">
        <div className="container-oz grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <span className="eyebrow">Ozlab Flow</span>
            <h2 className="mt-4 text-h1 text-ink-900 break-keep">
              가격표보다 먼저,
              <br />
              매장 상황을 봅니다.
            </h2>
            <p className="mt-4 text-lg-fluid text-ink-500 break-keep">
              같은 상품도 업종, 동선, 기존 장비, 약정 상태에 따라 답이 달라집니다.
              오즈랩 방식으로 설치 후 운영까지 이어지게 정리합니다.
            </p>
          </div>
          <div className="space-y-4">
            {data.process.map((item, index) => (
              <article key={item.title} className="flex gap-4 rounded-lg border border-ink-150 bg-white p-5 shadow-sm">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-naver-green text-sm font-extrabold text-white">
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-lg font-bold text-ink-900 break-keep">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-500 break-keep">{item.desc}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink-50 py-section">
        <div className="container-oz">
          <SectionHeader eyebrow="FAQ" title="자주 묻는 질문" />
          <div className="mx-auto max-w-[860px] divide-y divide-ink-150 rounded-xl border border-ink-150 bg-white shadow-sm">
            {data.faqs.map((faq) => (
              <details key={faq.q} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 p-6 text-left text-base font-bold text-ink-900 break-keep [&::-webkit-details-marker]:hidden">
                  {faq.q}
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-600 transition-all group-open:rotate-45 group-open:bg-naver-green group-open:text-white">
                    <Icon.Plus s={18} />
                  </span>
                </summary>
                <p className="px-6 pb-6 text-[15px] leading-relaxed text-ink-500 break-keep">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id="consult" className="bg-surface-dark py-section text-white">
        <div className="container-oz">
          <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] p-8 md:p-12">
            <div className="pointer-events-none absolute right-[-12%] top-[-80%] h-[420px] w-[420px] rounded-full bg-naver-green/20 blur-[90px]" />
            <div className="relative grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <span className="eyebrow-dark">무료 상담</span>
                <h2 className="mt-4 text-h1 text-white break-keep">
                  우리 매장에 맞는
                  <br />
                  구성을 받아보세요.
                </h2>
                <p className="mt-4 max-w-[620px] text-lg-fluid text-white/65 break-keep">
                  필요한 장비만 고르고, 설치 일정과 비용까지 한 번에 정리해드립니다.
                </p>
              </div>
              <Link href="/#apply" className="btn btn-primary lg">
                상담 신청하기
                <Icon.Arrow s={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
