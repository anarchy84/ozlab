import type { LandingModuleContent, LandingSlotItem } from '@/lib/landing-sections'

interface Props {
  item: LandingSlotItem
  showPlaceholders?: boolean
}

const npayGreen = '#03C75A'
const npayDark = '#020806'
const npayDarkSoft = '#07150E'

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value : fallback
}

function lines(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function moduleAttrs(item: LandingSlotItem) {
  return {
    'data-landing-slot': item.slot_key,
    'data-landing-item-id': item.id,
    'data-landing-module': item.item_type,
    'data-landing-variant': item.variant_key,
    'data-landing-experiment': item.experiment_key ?? undefined,
  }
}

function ImageFrame({
  content,
  showPlaceholders,
}: {
  content: LandingModuleContent
  showPlaceholders?: boolean
}) {
  const imageUrl = text(content.imageUrl)
  if (!imageUrl) {
    if (!showPlaceholders) return null
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-dashed border-[#03C75A]/35 bg-[#F2FFF7] px-6 text-center text-sm font-bold text-[#008F3F]">
        이미지를 업로드하거나 URL을 입력하세요.
      </div>
    )
  }

  return (
    <figure>
      <img
        src={imageUrl}
        alt={text(content.imageAlt, '랜딩 섹션 이미지')}
        className="w-full rounded-lg border border-[#03C75A]/15 bg-[#F2FFF7] object-cover shadow-[0_18px_45px_-30px_rgba(3,199,90,0.7)]"
        loading="lazy"
      />
      {text(content.caption) && (
        <figcaption className="mt-3 text-center text-sm text-ink-400">
          {text(content.caption)}
        </figcaption>
      )}
    </figure>
  )
}

export function LandingModuleRenderer({ item, showPlaceholders = false }: Props) {
  const content = item.content ?? {}

  if (item.item_type === 'text') {
    const align = content.align === 'center' ? 'center' : 'left'
    return (
      <section {...moduleAttrs(item)} className="bg-white py-section-tight">
        <div className={`container-oz ${align === 'center' ? 'text-center' : ''}`}>
          <div className={align === 'center' ? 'mx-auto max-w-[820px]' : 'max-w-[860px]'}>
            {text(content.eyebrow) && (
              <p className="inline-flex rounded-pill bg-[#E5FFF0] px-3 py-1.5 text-[13px] font-extrabold tracking-wide text-[#008F3F]">
                {text(content.eyebrow)}
              </p>
            )}
            <h2 className="mt-4 text-h1 text-ink-900 break-keep">
              {text(content.title, item.title ?? '새 섹션')}
            </h2>
            {text(content.body) && (
              <div className="mt-5 space-y-3 text-lg-fluid leading-relaxed text-ink-500 break-keep">
                {lines(text(content.body)).map((line, index) => (
                  <p key={`text-line-${index}`}>{line}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    )
  }

  if (item.item_type === 'image') {
    const image = <ImageFrame content={content} showPlaceholders={showPlaceholders} />
    if (!image) return null
    return (
      <section {...moduleAttrs(item)} className="bg-white py-section-tight">
        <div className="container-oz">
          {text(content.title) && (
            <h2 className="mb-8 text-center text-h2 text-ink-900 break-keep">
              {text(content.title)}
            </h2>
          )}
          <div className="mx-auto max-w-[1080px]">{image}</div>
        </div>
      </section>
    )
  }

  if (item.item_type === 'split') {
    const reverse = content.reverse === true
    return (
      <section {...moduleAttrs(item)} className="bg-[#F2FFF7] py-section">
        <div
          className={`container-oz grid gap-10 lg:grid-cols-2 lg:items-center ${
            reverse ? 'lg:[&>*:first-child]:order-2' : ''
          }`}
        >
          <div>
            {text(content.eyebrow) && (
              <p className="inline-flex rounded-pill bg-white px-3 py-1.5 text-[13px] font-extrabold tracking-wide text-[#008F3F] shadow-sm">
                {text(content.eyebrow)}
              </p>
            )}
            <h2 className="mt-4 text-h1 text-ink-900 break-keep">
              {text(content.title, item.title ?? '새 분할 섹션')}
            </h2>
            {text(content.body) && (
              <div className="mt-5 space-y-3 text-lg-fluid leading-relaxed text-ink-500 break-keep">
                {lines(text(content.body)).map((line, index) => (
                  <p key={`split-line-${index}`}>{line}</p>
                ))}
              </div>
            )}
            {text(content.buttonLabel) && text(content.buttonHref) && (
              <a
                href={text(content.buttonHref)}
                className="mt-8 inline-flex items-center justify-center rounded-pill bg-[#03C75A] px-7 py-4 text-base font-extrabold text-white shadow-[0_16px_36px_-16px_rgba(3,199,90,0.8)] transition-all hover:bg-[#00B050] hover:shadow-[0_18px_42px_-14px_rgba(3,199,90,0.9)]"
              >
                {text(content.buttonLabel)}
              </a>
            )}
          </div>
          <ImageFrame content={content} showPlaceholders={showPlaceholders} />
        </div>
      </section>
    )
  }

  if (item.item_type === 'cards') {
    const cards = Array.isArray(content.cards) ? content.cards : []
    return (
      <section {...moduleAttrs(item)} className="bg-white py-section">
        <div className="container-oz">
          <div className="mb-10 max-w-[780px]">
            {text(content.eyebrow) && (
              <p className="inline-flex rounded-pill bg-[#E5FFF0] px-3 py-1.5 text-[13px] font-extrabold tracking-wide text-[#008F3F]">
                {text(content.eyebrow)}
              </p>
            )}
            <h2 className="mt-4 text-h1 text-ink-900 break-keep">
              {text(content.title, item.title ?? '새 카드 섹션')}
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {cards.map((card, index) => (
              <article
                key={`landing-card-${index}`}
                className="rounded-lg border border-[#03C75A]/15 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#03C75A]/45 hover:shadow-[0_18px_38px_-28px_rgba(3,199,90,0.8)] md:p-7"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#E5FFF0] text-sm font-extrabold text-[#008F3F]">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-5 text-h3 text-ink-900 break-keep">
                  {text(card.title, `카드 ${index + 1}`)}
                </h3>
                {text(card.body) && (
                  <p className="mt-3 text-[15px] leading-relaxed text-ink-500 break-keep">
                    {text(card.body)}
                  </p>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (item.item_type === 'cta') {
    return (
      <section {...moduleAttrs(item)} className="bg-white py-section-tight">
        <div className="container-oz">
          <div
            className="relative overflow-hidden rounded-xl border border-[#03C75A]/20 p-8 text-white shadow-[0_24px_70px_-36px_rgba(3,199,90,0.7)] md:p-12"
            style={{
              background:
                `radial-gradient(circle at 78% 8%, ${npayGreen}30 0%, transparent 38%), linear-gradient(135deg, ${npayDark} 0%, ${npayDarkSoft} 100%)`,
            }}
          >
            <div className="pointer-events-none absolute right-[-12%] top-[-80%] h-[420px] w-[420px] rounded-full bg-[#03C75A]/25 blur-[90px]" />
            <div className="relative grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                {text(content.eyebrow) && (
                  <p className="inline-flex rounded-pill bg-white/10 px-3 py-1.5 text-[13px] font-extrabold tracking-wide text-[#03C75A]">
                    {text(content.eyebrow)}
                  </p>
                )}
                <h2 className="mt-4 text-h1 text-white break-keep">
                  {text(content.title, item.title ?? '새 CTA 섹션')}
                </h2>
                {text(content.body) && (
                  <p className="mt-4 max-w-[720px] text-lg-fluid text-white/65 break-keep">
                    {text(content.body)}
                  </p>
                )}
              </div>
              {text(content.buttonLabel) && text(content.buttonHref) && (
                <a
                  href={text(content.buttonHref)}
                  className="inline-flex items-center justify-center rounded-pill bg-[#03C75A] px-7 py-4 text-base font-extrabold text-white shadow-[0_16px_36px_-16px_rgba(3,199,90,0.9)] transition-all hover:bg-[#00B050]"
                >
                  {text(content.buttonLabel)}
                </a>
              )}
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (item.item_type === 'faq') {
    const faqs = Array.isArray(content.faqs) ? content.faqs : []
    return (
      <section {...moduleAttrs(item)} className="bg-[#F2FFF7] py-section">
        <div className="container-oz">
          <div className="mx-auto mb-10 max-w-[760px] text-center">
            <p className="inline-flex rounded-pill bg-white px-3 py-1.5 text-[13px] font-extrabold tracking-wide text-[#008F3F] shadow-sm">
              FAQ
            </p>
            <h2 className="mt-4 text-h1 text-ink-900 break-keep">
              {text(content.title, item.title ?? '자주 묻는 질문')}
            </h2>
          </div>
          <div className="mx-auto max-w-[860px] divide-y divide-[#03C75A]/10 rounded-xl border border-[#03C75A]/15 bg-white shadow-sm">
            {faqs.map((faq, index) => (
              <details key={`landing-faq-${index}`} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 p-6 text-left text-base font-bold text-ink-900 break-keep [&::-webkit-details-marker]:hidden">
                  {text(faq.q, `질문 ${index + 1}`)}
                  <span className="text-[#008F3F]">+</span>
                </summary>
                <p className="px-6 pb-6 text-[15px] leading-relaxed text-ink-500 break-keep">
                  {text(faq.a)}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    )
  }

  return null
}
