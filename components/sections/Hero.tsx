// ─────────────────────────────────────────────
// Hero — 메인 히어로 + 떠다니는 4태그 + 비주얼 밴드
// 원본: _design_reference/src/sections/Hero.jsx
// ─────────────────────────────────────────────
'use client'

import { Icon } from '@/components/icons'
import { EditableText } from '@/components/editable/EditableText'
import { EditableLink } from '@/components/editable/EditableLink'
import MediaSlot from '@/components/ui/MediaSlot'
import { DynamicCTA } from '@/components/cta/DynamicCTA'
import {
  pickTextOrUndef,
  pickImageOrUndef,
  pickLinkOrUndef,
  type ContentBlock,
} from '@/lib/content-blocks'
import type { CtaButton } from '@/lib/admin/types'

interface Props {
  blocks: Record<string, ContentBlock>
  ctas?: CtaButton[]
}

export function Hero({ blocks, ctas }: Props) {
  // 떠다니는 태그 4개 — 위치 t1/t2/t3/t4 는 CSS 에서 고정
  const tags = [
    { key: 'home.hero.tag1', label: '네이버 리뷰 자동 작성', pos: 't1' },
    { key: 'home.hero.tag2', label: '카드·QR·페이 전부', pos: 't2' },
    { key: 'home.hero.tag3', label: 'place+ 검색 상위 노출', pos: 't3' },
    { key: 'home.hero.tag4', label: '대기화면 매장 홍보', pos: 't4' },
  ]

  return (
    <>
      {/* 메인 히어로 */}
      <section className="py-section-tight">
        <div className="container-oz grid lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-16 items-center">
          {/* 카피 */}
          <div>
            <span className="eyebrow">
              <EditableText
                as="span"
                blockKey="home.hero.eyebrow"
                fallback="결제부터 리뷰·마케팅까지 한 대로"
                value={pickTextOrUndef(blocks, 'home.hero.eyebrow')}
                pagePath="/"
              />
            </span>

            {/* 헤드라인 — 3 조각 + 마크 강조 */}
            <h1 className="text-display break-keep mt-4 mb-6">
              <EditableText
                as="span"
                blockKey="home.hero.headline.pre"
                fallback="손님이 "
                value={pickTextOrUndef(blocks, 'home.hero.headline.pre')}
                pagePath="/"
              />
              <mark className="hl-green">
                <EditableText
                  as="span"
                  blockKey="home.hero.headline.mark"
                  fallback="바글바글"
                  value={pickTextOrUndef(blocks, 'home.hero.headline.mark')}
                  pagePath="/"
                />
              </mark>
              <EditableText
                as="span"
                blockKey="home.hero.headline.post"
                fallback="한"
                value={pickTextOrUndef(blocks, 'home.hero.headline.post')}
                pagePath="/"
              />
              <br />
              <EditableText
                as="span"
                blockKey="home.hero.headline.line2"
                fallback="가게에는 이유가 있죠."
                value={pickTextOrUndef(blocks, 'home.hero.headline.line2')}
                pagePath="/"
              />
            </h1>

            <p className="text-lg-fluid text-ink-600 max-w-[520px] mb-8 break-keep">
              <EditableText
                as="span"
                blockKey="home.hero.sub.line1"
                fallback="결제부터 리뷰·마케팅까지 한 대로 연결."
                value={pickTextOrUndef(blocks, 'home.hero.sub.line1')}
                pagePath="/"
              />
              <br />
              <EditableText
                as="span"
                blockKey="home.hero.sub.line2"
                fallback="지금 잘 되는 가게들은 모두 오즈랩페이를 씁니다."
                value={pickTextOrUndef(blocks, 'home.hero.sub.line2')}
                pagePath="/"
              />
            </p>

            {/* CTA 2개 — primary 는 cta_buttons (어드민 동적), secondary 는 EditableLink */}
            <div className="flex gap-3 flex-wrap">
              <DynamicCTA
                placement="hero"
                ctas={ctas}
                fallback={{ label: '0원으로 시작하기', href: '#apply' }}
                className="btn btn-primary lg"
              >
                <span className="flex items-center gap-2">
                  {ctas?.[0]?.label ?? '0원으로 시작하기'}
                  <Icon.Arrow s={18} />
                </span>
              </DynamicCTA>
              <EditableLink
                blockKey="home.hero.cta.secondary"
                fallback={{ label: '리뷰 자동화 보기', href: '#review', target: '_self' }}
                value={pickLinkOrUndef(blocks, 'home.hero.cta.secondary')}
                pagePath="/"
                className="btn btn-ghost"
              />
            </div>

            {/* 메타 3개 */}
            <div className="flex gap-5 flex-wrap mt-9 text-ink-500 text-sm">
              <span>
                <strong className="text-ink-900 font-bold">
                  <EditableText
                    as="span"
                    blockKey="home.hero.stat1.num"
                    fallback="5,000+"
                    value={pickTextOrUndef(blocks, 'home.hero.stat1.num')}
                    pagePath="/"
                  />
                </strong>{' '}
                <EditableText
                  as="span"
                  blockKey="home.hero.stat1.label"
                  fallback="매장 도입"
                  value={pickTextOrUndef(blocks, 'home.hero.stat1.label')}
                  pagePath="/"
                />
              </span>
              <span>
                <strong className="text-ink-900 font-bold">
                  <EditableText
                    as="span"
                    blockKey="home.hero.stat2.num"
                    fallback="평균 리뷰 3.2배"
                    value={pickTextOrUndef(blocks, 'home.hero.stat2.num')}
                    pagePath="/"
                  />
                </strong>{' '}
                <EditableText
                  as="span"
                  blockKey="home.hero.stat2.label"
                  fallback="증가"
                  value={pickTextOrUndef(blocks, 'home.hero.stat2.label')}
                  pagePath="/"
                />
              </span>
              <span>
                <strong className="text-ink-900 font-bold">
                  <EditableText
                    as="span"
                    blockKey="home.hero.stat3.num"
                    fallback="place+"
                    value={pickTextOrUndef(blocks, 'home.hero.stat3.num')}
                    pagePath="/"
                  />
                </strong>{' '}
                <EditableText
                  as="span"
                  blockKey="home.hero.stat3.label"
                  fallback="검색 우선 노출"
                  value={pickTextOrUndef(blocks, 'home.hero.stat3.label')}
                  pagePath="/"
                />
              </span>
            </div>
          </div>

          {/* 비주얼 (단말기 + 떠다니는 태그) */}
          <div className="relative aspect-square lg:aspect-[1/1.1] flex items-center justify-center">
            <div className="hero-device-bg" aria-hidden="true" />
            <div className="relative z-[2] w-full max-w-[560px]">
              <MediaSlot
                blockKey="home.hero.device"
                value={pickImageOrUndef(blocks, 'home.hero.device')}
                aspect="3/4"
                label="히어로 단말기 이미지"
                hint="assets/hero-vertical.png · 세로형 단말기"
                pagePath="/"
                priority
                fit="contain"
                className="drop-shadow-2xl"
              />
            </div>

            {tags.map((t) => (
              <div key={t.key} className={`hero-tag ${t.pos}`}>
                <span className="dot" />
                <EditableText
                  as="span"
                  blockKey={t.key}
                  fallback={t.label}
                  value={pickTextOrUndef(blocks, t.key)}
                  pagePath="/"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 비주얼 밴드 — 3 이미지 가로 카드 */}
      <section className="pb-section-tight">
        <div className="container-oz">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl overflow-hidden bg-ink-50 shadow-sm">
              <MediaSlot
                blockKey="home.hero.band1"
                value={pickImageOrUndef(blocks, 'home.hero.band1')}
                aspect="4/3"
                label="매장 설치 이미지"
                hint="assets/hanwool-hero.png"
                pagePath="/"
              />
            </div>
            <div className="rounded-xl overflow-hidden bg-ink-50 shadow-sm">
              <MediaSlot
                blockKey="home.hero.band2"
                value={pickImageOrUndef(blocks, 'home.hero.band2')}
                aspect="4/3"
                label="오즈랩페이 단말기"
                hint="assets/device-okpos-pointing.png"
                pagePath="/"
              />
            </div>
            <div className="rounded-xl overflow-hidden bg-ink-50 shadow-sm">
              <MediaSlot
                blockKey="home.hero.band3"
                value={pickImageOrUndef(blocks, 'home.hero.band3')}
                aspect="4/3"
                label="기능 소개"
                hint="assets/feature-stack.png"
                pagePath="/"
              />
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
