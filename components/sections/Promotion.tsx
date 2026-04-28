// ─────────────────────────────────────────────
// Promotion — 다크 배너: 플레이스 리워드 광고 무료 프로모션
// 원본: _design_reference/src/sections/Promotion.jsx
// ─────────────────────────────────────────────
'use client'

import { Icon } from '@/components/icons'
import { EditableText } from '@/components/editable/EditableText'
import { EditableLink } from '@/components/editable/EditableLink'
import MediaSlot from '@/components/ui/MediaSlot'
import {
  pickTextOrUndef,
  pickImageOrUndef,
  pickLinkOrUndef,
  type ContentBlock,
} from '@/lib/content-blocks'

interface Props {
  blocks: Record<string, ContentBlock>
}

export function Promotion({ blocks }: Props) {
  return (
    // 외부 wrapper : 다크 배경 + 패딩 (grid 컨테이너 X — 안쪽 박스에서 grid 처리)
    <section className="py-section bg-surface-dark text-white relative overflow-hidden">
      {/* 그린 글로우 (우상단) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-[30%] -right-[15%] w-[600px] h-[600px] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(23, 224, 109, 0.25), transparent 70%)',
          filter: 'blur(80px)',
        }}
      />
      <div className="container-oz relative">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* 좌측 카피 */}
          <div>
            <span className="eyebrow dark">
              <EditableText
                as="span"
                blockKey="home.promotion.eyebrow"
                fallback="🎁 지금만 제공되는 특별 혜택"
                value={pickTextOrUndef(blocks, 'home.promotion.eyebrow')}
                pagePath="/"
              />
            </span>
            <h2 className="text-h1 text-white break-keep mt-4 mb-4">
              <EditableText
                as="span"
                blockKey="home.promotion.headline.line1"
                fallback="지금 신청하면"
                value={pickTextOrUndef(blocks, 'home.promotion.headline.line1')}
                pagePath="/"
              />
              <br />
              <span style={{ color: '#17e06d' }}>
                <EditableText
                  as="span"
                  blockKey="home.promotion.headline.line2"
                  fallback="플레이스 리워드 광고"
                  value={pickTextOrUndef(blocks, 'home.promotion.headline.line2')}
                  pagePath="/"
                />
              </span>
              <br />
              <EditableText
                as="span"
                blockKey="home.promotion.headline.line3"
                fallback="완전 무료!"
                value={pickTextOrUndef(blocks, 'home.promotion.headline.line3')}
                pagePath="/"
              />
            </h2>
            <p className="text-ink-300 text-lg-fluid break-keep mb-8">
              <EditableText
                as="span"
                blockKey="home.promotion.sub.line1"
                fallback="POS 신규 계약 시 오즈랩페이 단말기 무상지원 +"
                value={pickTextOrUndef(blocks, 'home.promotion.sub.line1')}
                pagePath="/"
              />
              <br />
              <EditableText
                as="span"
                blockKey="home.promotion.sub.line2"
                fallback="플레이스 리워드 광고 크레딧까지 함께 드립니다."
                value={pickTextOrUndef(blocks, 'home.promotion.sub.line2')}
                pagePath="/"
              />
            </p>
            <EditableLink
              blockKey="home.promotion.cta"
              fallback={{ label: '지금 신청하기', href: '#apply', target: '_self' }}
              value={pickLinkOrUndef(blocks, 'home.promotion.cta')}
              pagePath="/"
              className="btn btn-primary lg"
            >
              <span className="flex items-center gap-2">
                {pickLinkOrUndef(blocks, 'home.promotion.cta')?.label ?? '지금 신청하기'}
                <Icon.Arrow s={18} />
              </span>
            </EditableLink>
          </div>

          {/* 우측 0원 프로모 이미지 */}
          <div className="relative">
            <MediaSlot
              blockKey="home.promotion.image"
              value={pickImageOrUndef(blocks, 'home.promotion.image')}
              aspect="1/1"
              label="0원 프로모션"
              hint="assets/zero-promo.png"
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
