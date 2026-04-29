// ─────────────────────────────────────────────
// Showcase — 다크 배경 "단말기 시대는 끝났습니다" 섹션
// 원본: _design_reference/src/sections/Showcase.jsx
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

export function Showcase({ blocks, ctas }: Props) {
  return (
    // 외부 wrapper : 다크 배경 + 패딩만 (grid 없음)
    // 잘못된 상태로는 <section className="showcase-dark"> 였는데
    // showcase-dark 안에 grid md:grid-cols-2 가 있어서 페이지 전체가
    // 좌우 2단으로 갈라지고 container-oz 가 좌측 좁은 컬럼에 갇혔던 버그.
    <section className="py-section bg-surface-dark text-white relative overflow-hidden">
      {/* 그린 글로우 (우상단 radial gradient blur) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-[20%] -right-[10%] w-[60%] h-[140%] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(23, 224, 109, 0.25), transparent 70%)',
          filter: 'blur(80px)',
        }}
      />
      <div className="container-oz relative">
        {/* 섹션 헤드 — 라이트 톤 카피 */}
        <div className="text-center max-w-[780px] mx-auto mb-16">
          <span className="eyebrow">
            <EditableText
              as="span"
              blockKey="home.showcase.eyebrow"
              fallback="One Device · All-in-One"
              value={pickTextOrUndef(blocks, 'home.showcase.eyebrow')}
              pagePath="/"
            />
          </span>
          <h2 className="text-h1 text-white break-keep mt-4 mb-4">
            <EditableText
              as="span"
              blockKey="home.showcase.headline.line1"
              fallback="결제만 하던 단말기 시대는"
              value={pickTextOrUndef(blocks, 'home.showcase.headline.line1')}
              pagePath="/"
            />
            <br />
            <mark className="hl-green">
              <EditableText
                as="span"
                blockKey="home.showcase.headline.mark"
                fallback="끝났습니다."
                value={pickTextOrUndef(blocks, 'home.showcase.headline.mark')}
                pagePath="/"
              />
            </mark>
          </h2>
          <p className="text-ink-300 text-lg-fluid break-keep">
            <EditableText
              as="span"
              blockKey="home.showcase.sub"
              fallback="오즈랩페이는 결제·리뷰·마케팅·홍보를 한 대에 담은, 완전히 새로운 단말기입니다."
              value={pickTextOrUndef(blocks, 'home.showcase.sub')}
              pagePath="/"
            />
          </p>
        </div>

        {/* 메인 카피 + 단말기 비주얼 */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="eyebrow dark">
              <EditableText
                as="span"
                blockKey="home.showcase.main.eyebrow"
                fallback="NEW · 신제품 출시"
                value={pickTextOrUndef(blocks, 'home.showcase.main.eyebrow')}
                pagePath="/"
              />
            </span>
            <h2 className="text-h1 text-white break-keep mt-4 mb-4">
              <span style={{ color: '#17e06d' }}>
                <EditableText
                  as="span"
                  blockKey="home.showcase.main.headline.pre"
                  fallback="한 대로 연결"
                  value={pickTextOrUndef(blocks, 'home.showcase.main.headline.pre')}
                  pagePath="/"
                />
              </span>
              <br />
              <EditableText
                as="span"
                blockKey="home.showcase.main.headline.post"
                fallback="차별화된 카드단말기"
                value={pickTextOrUndef(blocks, 'home.showcase.main.headline.post')}
                pagePath="/"
              />
            </h2>
            <p className="text-ink-300 text-lg-fluid mb-8 break-keep">
              <EditableText
                as="span"
                blockKey="home.showcase.main.sub.line1"
                fallback="카드·QR·페이사인·삼성페이까지, 손님의 모든 결제를 받으면서"
                value={pickTextOrUndef(blocks, 'home.showcase.main.sub.line1')}
                pagePath="/"
              />
              <br />
              <EditableText
                as="span"
                blockKey="home.showcase.main.sub.line2"
                fallback="네이버 리뷰와 place+ 연동까지 자동으로 이어집니다."
                value={pickTextOrUndef(blocks, 'home.showcase.main.sub.line2')}
                pagePath="/"
              />
            </p>
            <DynamicCTA
              placement="showcase"
              ctas={ctas}
              fallback={{ label: '0원으로 시작하기', href: '#apply' }}
              className="btn lg !bg-[#17e06d] !text-ink-900"
            >
              <span className="flex items-center gap-2">
                {ctas?.[0]?.label ?? '0원으로 시작하기'}
                <Icon.Arrow s={18} />
              </span>
            </DynamicCTA>
          </div>

          <div className="relative">
            <MediaSlot
              blockKey="home.showcase.device"
              value={pickImageOrUndef(blocks, 'home.showcase.device')}
              aspect="3/4"
              label="오즈랩페이 단말기 (다크)"
              hint="assets/device-dark-standing.png"
              pagePath="/"
              fit="contain"
              className="drop-shadow-2xl"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
