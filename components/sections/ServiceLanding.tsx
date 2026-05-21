'use client'

// ─────────────────────────────────────────────
// ServiceLanding — /internet, /business/cctv, /business/torder 공용 LP
//
// Phase 2D : 인라인 편집화
//   - pageKey prop 으로 페이지 식별 (internet/cctv/tableOrder)
//   - blockKey 자동 생성: service.{pageKey}.{section}.{field}
//                          / cards: service.{pageKey}.{section}.cards.{idx}.{field}
//   - useBlocks() 컨텍스트에서 DB 값 읽음 (없으면 servicePages fallback)
// ─────────────────────────────────────────────

import Link from 'next/link'
import { Icon } from '@/components/icons'
import type { ServiceLandingData, ServicePageKey } from '@/lib/service-pages'
import { EditableText } from '@/components/editable/EditableText'
import { useBlocks } from '@/components/editable/BlocksProvider'
import { pickTextOrUndef } from '@/lib/content-blocks'

interface Props {
  data: ServiceLandingData
  /** 페이지 식별자 — blockKey prefix 결정 */
  pageKey: ServicePageKey
  /** 편집 후 revalidate 대상 경로 (예: '/internet') */
  pagePath: string
}

// ─── 섹션 헤더 (eyebrow / title / description) ──
function SectionHeader({
  eyebrow,
  title,
  description,
  align = 'center',
  tone = 'light',
  blockKeyBase,
  pagePath,
}: {
  eyebrow: string
  title: string
  description?: string
  align?: 'center' | 'left'
  tone?: 'light' | 'dark'
  blockKeyBase: string         // 예: 'service.internet.intro'
  pagePath: string
}) {
  const blocks = useBlocks()
  return (
    <div
      className={`mb-10 md:mb-14 ${
        align === 'center' ? 'mx-auto max-w-[760px] text-center' : 'max-w-[720px]'
      }`}
    >
      <EditableText
        as="span"
        blockKey={`${blockKeyBase}.eyebrow`}
        fallback={eyebrow}
        value={pickTextOrUndef(blocks, `${blockKeyBase}.eyebrow`)}
        pagePath={pagePath}
        className={tone === 'dark' ? 'eyebrow-dark' : 'eyebrow'}
      />
      <EditableText
        as="h2"
        blockKey={`${blockKeyBase}.title`}
        fallback={title}
        value={pickTextOrUndef(blocks, `${blockKeyBase}.title`)}
        pagePath={pagePath}
        className={`mt-4 text-h1 break-keep ${tone === 'dark' ? 'text-white' : 'text-ink-900'}`}
      />
      {description !== undefined && (
        <EditableText
          as="p"
          blockKey={`${blockKeyBase}.description`}
          fallback={description}
          value={pickTextOrUndef(blocks, `${blockKeyBase}.description`)}
          pagePath={pagePath}
          className={`mt-4 text-lg-fluid break-keep ${tone === 'dark' ? 'text-white/65' : 'text-ink-500'}`}
        />
      )}
    </div>
  )
}

// ─── 카드 (intro/catalog/guide 공용) ──
function ServiceCard({
  card,
  index,
  blockKeyBase,
  pagePath,
}: {
  card: ServiceLandingData['intro']['cards'][number]
  index: number
  blockKeyBase: string         // 예: 'service.internet.intro.cards.0'
  pagePath: string
}) {
  const blocks = useBlocks()
  const metaText = card.meta ?? String(index + 1).padStart(2, '0')
  return (
    <article className="group relative h-full rounded-lg border border-ink-150 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-naver-green/40 hover:shadow-md md:p-7">
      <div className="mb-5 flex items-center justify-between gap-4">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-naver-soft text-sm font-extrabold text-naver-deep">
          <EditableText
            as="span"
            blockKey={`${blockKeyBase}.meta`}
            fallback={metaText}
            value={pickTextOrUndef(blocks, `${blockKeyBase}.meta`)}
            pagePath={pagePath}
          />
        </span>
        <span className="text-naver-deep opacity-70 transition-opacity group-hover:opacity-100">
          {index % 3 === 0 ? <Icon.Shield s={22} /> : index % 3 === 1 ? <Icon.Card s={22} /> : <Icon.Chart s={22} />}
        </span>
      </div>
      <EditableText
        as="h3"
        blockKey={`${blockKeyBase}.title`}
        fallback={card.title}
        value={pickTextOrUndef(blocks, `${blockKeyBase}.title`)}
        pagePath={pagePath}
        className="text-h3 text-ink-900 break-keep"
      />
      <EditableText
        as="p"
        blockKey={`${blockKeyBase}.desc`}
        fallback={card.desc}
        value={pickTextOrUndef(blocks, `${blockKeyBase}.desc`)}
        pagePath={pagePath}
        className="mt-3 text-[15px] leading-relaxed text-ink-500 break-keep"
      />
      {card.bullets && (
        <ul className="mt-5 space-y-2.5">
          {card.bullets.map((bullet, bi) => (
            <li key={`${blockKeyBase}.bullet.${bi}`} className="flex items-start gap-2 text-sm text-ink-600 break-keep">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-naver-soft text-naver-deep">
                <Icon.Check s={13} />
              </span>
              <EditableText
                as="span"
                blockKey={`${blockKeyBase}.bullets.${bi}`}
                fallback={bullet}
                value={pickTextOrUndef(blocks, `${blockKeyBase}.bullets.${bi}`)}
                pagePath={pagePath}
              />
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

export function ServiceLanding({ data, pageKey, pagePath }: Props) {
  const blocks = useBlocks()
  const introGrid =
    data.intro.cards.length >= 4 ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'
  const catalogGrid =
    data.catalog.cards.length >= 4 ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'

  // blockKey 헬퍼
  const k = (suffix: string) => `service.${pageKey}.${suffix}`

  return (
    <div className="bg-white text-ink-900">
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-white to-naver-tint/70 py-section-tight">
        <div className="pointer-events-none absolute right-[-12%] top-[-18%] h-[520px] w-[520px] rounded-full bg-naver-green/15 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-[-28%] left-[-14%] h-[420px] w-[420px] rounded-full bg-ink-900/5 blur-[100px]" />

        <div className="container-oz relative grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <EditableText
              as="span"
              blockKey={k('eyebrow')}
              fallback={data.eyebrow}
              value={pickTextOrUndef(blocks, k('eyebrow'))}
              pagePath={pagePath}
              className="eyebrow"
            />
            <h1 className="mt-5 text-display text-ink-900 break-keep">
              <EditableText
                as="span"
                blockKey={k('hero.line1')}
                fallback={data.hero.line1}
                value={pickTextOrUndef(blocks, k('hero.line1'))}
                pagePath={pagePath}
              />
              <br />
              <mark className="hl-green">
                <EditableText
                  as="span"
                  blockKey={k('hero.highlight')}
                  fallback={data.hero.highlight}
                  value={pickTextOrUndef(blocks, k('hero.highlight'))}
                  pagePath={pagePath}
                />
              </mark>
              <br />
              <EditableText
                as="span"
                blockKey={k('hero.line3')}
                fallback={data.hero.line3}
                value={pickTextOrUndef(blocks, k('hero.line3'))}
                pagePath={pagePath}
              />
            </h1>
            <EditableText
              as="p"
              blockKey={k('hero.description')}
              fallback={data.hero.description}
              value={pickTextOrUndef(blocks, k('hero.description'))}
              pagePath={pagePath}
              className="mt-6 max-w-[580px] text-lg-fluid text-ink-600 break-keep"
            />
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="#consult" className="btn btn-primary lg">
                <EditableText
                  as="span"
                  blockKey={k('primaryCta')}
                  fallback={data.primaryCta}
                  value={pickTextOrUndef(blocks, k('primaryCta'))}
                  pagePath={pagePath}
                />
                <Icon.Arrow s={18} />
              </Link>
              <Link href={data.secondaryHref ?? '/#apply'} className="btn btn-ghost lg">
                <EditableText
                  as="span"
                  blockKey={k('secondaryCta')}
                  fallback={data.secondaryCta}
                  value={pickTextOrUndef(blocks, k('secondaryCta'))}
                  pagePath={pagePath}
                />
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
                    key={`stat-${index}`}
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3"
                  >
                    <EditableText
                      as="span"
                      blockKey={k(`stats.${index}.label`)}
                      fallback={stat.label}
                      value={pickTextOrUndef(blocks, k(`stats.${index}.label`))}
                      pagePath={pagePath}
                      className="text-sm text-white/70"
                    />
                    <EditableText
                      as="span"
                      blockKey={k(`stats.${index}.value`)}
                      fallback={stat.value}
                      value={pickTextOrUndef(blocks, k(`stats.${index}.value`))}
                      pagePath={pagePath}
                      className="text-xl font-extrabold text-white"
                    />
                    <span className="text-naver-neon">
                      {index === 0 ? <Icon.Search s={18} /> : index === 1 ? <Icon.Shield s={18} /> : <Icon.Check s={18} />}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-lg bg-white p-5 text-ink-900">
                <p className="text-sm font-bold">상담 체크리스트</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {data.consultChips.map((chip, ci) => (
                    <span
                      key={`chip-${ci}`}
                      className="rounded-pill bg-naver-soft px-3 py-1.5 text-xs font-semibold text-naver-deep"
                    >
                      <EditableText
                        as="span"
                        blockKey={k(`consultChips.${ci}`)}
                        fallback={chip}
                        value={pickTextOrUndef(blocks, k(`consultChips.${ci}`))}
                        pagePath={pagePath}
                      />
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* INTRO */}
      <section className="py-section">
        <div className="container-oz">
          <SectionHeader
            eyebrow={data.intro.eyebrow}
            title={data.intro.title}
            description={data.intro.description}
            blockKeyBase={k('intro')}
            pagePath={pagePath}
          />
          <div className={`grid gap-5 ${introGrid}`}>
            {data.intro.cards.map((card, index) => (
              <ServiceCard
                key={`intro-${index}`}
                card={card}
                index={index}
                blockKeyBase={k(`intro.cards.${index}`)}
                pagePath={pagePath}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CATALOG */}
      <section className="bg-ink-50 py-section">
        <div className="container-oz">
          <SectionHeader
            eyebrow={data.catalog.eyebrow}
            title={data.catalog.title}
            description={data.catalog.description}
            align="left"
            blockKeyBase={k('catalog')}
            pagePath={pagePath}
          />
          <div className={`grid gap-5 ${catalogGrid}`}>
            {data.catalog.cards.map((card, index) => (
              <ServiceCard
                key={`catalog-${index}`}
                card={card}
                index={index}
                blockKeyBase={k(`catalog.cards.${index}`)}
                pagePath={pagePath}
              />
            ))}
          </div>
        </div>
      </section>

      {/* PROOF */}
      <section className="py-section">
        <div className="container-oz">
          <SectionHeader
            eyebrow={data.proof.eyebrow}
            title={data.proof.title}
            description={data.proof.description}
            blockKeyBase={k('proof')}
            pagePath={pagePath}
          />
          <div className="mx-auto grid max-w-[920px] gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data.proof.cards.map((metric, mi) => (
              <div
                key={`proof-${mi}`}
                className="rounded-lg border border-ink-150 bg-white p-6 text-center shadow-sm"
              >
                <EditableText
                  as="p"
                  blockKey={k(`proof.cards.${mi}.value`)}
                  fallback={metric.value}
                  value={pickTextOrUndef(blocks, k(`proof.cards.${mi}.value`))}
                  pagePath={pagePath}
                  className="text-3xl font-extrabold text-ink-900"
                />
                <EditableText
                  as="p"
                  blockKey={k(`proof.cards.${mi}.label`)}
                  fallback={metric.label}
                  value={pickTextOrUndef(blocks, k(`proof.cards.${mi}.label`))}
                  pagePath={pagePath}
                  className="mt-2 text-sm text-ink-500 break-keep"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GUIDE */}
      <section className="bg-surface-dark py-section text-white">
        <div className="container-oz">
          <SectionHeader
            eyebrow={data.guide.eyebrow}
            title={data.guide.title}
            description={data.guide.description}
            tone="dark"
            blockKeyBase={k('guide')}
            pagePath={pagePath}
          />
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {data.guide.cards.map((card, index) => (
              <article
                key={`guide-${index}`}
                className="rounded-lg border border-white/10 bg-white/[0.04] p-6 backdrop-blur"
              >
                <EditableText
                  as="span"
                  blockKey={k(`guide.cards.${index}.meta`)}
                  fallback={card.meta ?? String(index + 1).padStart(2, '0')}
                  value={pickTextOrUndef(blocks, k(`guide.cards.${index}.meta`))}
                  pagePath={pagePath}
                  className="text-sm font-extrabold text-naver-neon"
                />
                <EditableText
                  as="h3"
                  blockKey={k(`guide.cards.${index}.title`)}
                  fallback={card.title}
                  value={pickTextOrUndef(blocks, k(`guide.cards.${index}.title`))}
                  pagePath={pagePath}
                  className="mt-4 text-xl font-bold text-white break-keep"
                />
                <EditableText
                  as="p"
                  blockKey={k(`guide.cards.${index}.desc`)}
                  fallback={card.desc}
                  value={pickTextOrUndef(blocks, k(`guide.cards.${index}.desc`))}
                  pagePath={pagePath}
                  className="mt-3 text-sm leading-relaxed text-white/65 break-keep"
                />
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* PROCESS */}
      <section className="py-section">
        <div className="container-oz grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <EditableText
              as="span"
              blockKey={k('process.eyebrow')}
              fallback="Ozlab Flow"
              value={pickTextOrUndef(blocks, k('process.eyebrow'))}
              pagePath={pagePath}
              className="eyebrow"
            />
            <EditableText
              as="h2"
              blockKey={k('process.title')}
              fallback={'가격표보다 먼저,\n매장 상황을 봅니다.'}
              value={pickTextOrUndef(blocks, k('process.title'))}
              pagePath={pagePath}
              className="mt-4 text-h1 text-ink-900 break-keep whitespace-pre-line"
            />
            <EditableText
              as="p"
              blockKey={k('process.description')}
              fallback={'같은 상품도 업종, 동선, 기존 장비, 약정 상태에 따라 답이 달라집니다. 오즈랩 방식으로 설치 후 운영까지 이어지게 정리합니다.'}
              value={pickTextOrUndef(blocks, k('process.description'))}
              pagePath={pagePath}
              className="mt-4 text-lg-fluid text-ink-500 break-keep"
            />
          </div>
          <div className="space-y-4">
            {data.process.map((item, index) => (
              <article key={`process-${index}`} className="flex gap-4 rounded-lg border border-ink-150 bg-white p-5 shadow-sm">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-naver-green text-sm font-extrabold text-white">
                  {index + 1}
                </span>
                <div>
                  <EditableText
                    as="h3"
                    blockKey={k(`process.cards.${index}.title`)}
                    fallback={item.title}
                    value={pickTextOrUndef(blocks, k(`process.cards.${index}.title`))}
                    pagePath={pagePath}
                    className="text-lg font-bold text-ink-900 break-keep"
                  />
                  <EditableText
                    as="p"
                    blockKey={k(`process.cards.${index}.desc`)}
                    fallback={item.desc}
                    value={pickTextOrUndef(blocks, k(`process.cards.${index}.desc`))}
                    pagePath={pagePath}
                    className="mt-1 text-sm leading-relaxed text-ink-500 break-keep"
                  />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-ink-50 py-section">
        <div className="container-oz">
          <SectionHeader
            eyebrow="FAQ"
            title="자주 묻는 질문"
            blockKeyBase={k('faqs')}
            pagePath={pagePath}
          />
          <div className="mx-auto max-w-[860px] divide-y divide-ink-150 rounded-xl border border-ink-150 bg-white shadow-sm">
            {data.faqs.map((faq, fi) => (
              <details key={`faq-${fi}`} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 p-6 text-left text-base font-bold text-ink-900 break-keep [&::-webkit-details-marker]:hidden">
                  <EditableText
                    as="span"
                    blockKey={k(`faqs.items.${fi}.q`)}
                    fallback={faq.q}
                    value={pickTextOrUndef(blocks, k(`faqs.items.${fi}.q`))}
                    pagePath={pagePath}
                  />
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-600 transition-all group-open:rotate-45 group-open:bg-naver-green group-open:text-white">
                    <Icon.Plus s={18} />
                  </span>
                </summary>
                <EditableText
                  as="p"
                  blockKey={k(`faqs.items.${fi}.a`)}
                  fallback={faq.a}
                  value={pickTextOrUndef(blocks, k(`faqs.items.${fi}.a`))}
                  pagePath={pagePath}
                  className="px-6 pb-6 text-[15px] leading-relaxed text-ink-500 break-keep"
                />
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CONSULT */}
      <section id="consult" className="bg-surface-dark py-section text-white">
        <div className="container-oz">
          <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] p-8 md:p-12">
            <div className="pointer-events-none absolute right-[-12%] top-[-80%] h-[420px] w-[420px] rounded-full bg-naver-green/20 blur-[90px]" />
            <div className="relative grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <EditableText
                  as="span"
                  blockKey={k('consult.eyebrow')}
                  fallback="무료 상담"
                  value={pickTextOrUndef(blocks, k('consult.eyebrow'))}
                  pagePath={pagePath}
                  className="eyebrow-dark"
                />
                <EditableText
                  as="h2"
                  blockKey={k('consult.title')}
                  fallback={'우리 매장에 맞는\n구성을 받아보세요.'}
                  value={pickTextOrUndef(blocks, k('consult.title'))}
                  pagePath={pagePath}
                  className="mt-4 text-h1 text-white break-keep whitespace-pre-line"
                />
                <EditableText
                  as="p"
                  blockKey={k('consult.description')}
                  fallback="필요한 장비만 고르고, 설치 일정과 비용까지 한 번에 정리해드립니다."
                  value={pickTextOrUndef(blocks, k('consult.description'))}
                  pagePath={pagePath}
                  className="mt-4 max-w-[620px] text-lg-fluid text-white/65 break-keep"
                />
              </div>
              <Link href="/#apply" className="btn btn-primary lg">
                <EditableText
                  as="span"
                  blockKey={k('consult.cta')}
                  fallback="상담 신청하기"
                  value={pickTextOrUndef(blocks, k('consult.cta'))}
                  pagePath={pagePath}
                />
                <Icon.Arrow s={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
