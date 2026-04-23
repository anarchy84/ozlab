// ─────────────────────────────────────────────
// Pricing — 7개 가격 카드 (단말기·POS 라인업)
// 원본: _design_reference/src/sections/Pricing.jsx
//
// 각 카드: 이름 / 정상가 / 프로모션가 / 컬러옵션
// 카드 이미지는 MediaSlot (home.pricing.cardN.image)
// ─────────────────────────────────────────────
'use client'

import { EditableText } from '@/components/editable/EditableText'
import MediaSlot from '@/components/ui/MediaSlot'
import {
  pickTextOrUndef,
  pickImageOrUndef,
  type ContentBlock,
} from '@/lib/content-blocks'

interface Props {
  blocks: Record<string, ContentBlock>
}

type PriceItem = {
  idx: number
  tag: string
  name: string
  orig: string
  now: string
  colors: string[]
  featured: boolean
}

const ITEMS: PriceItem[] = [
  { idx: 1, tag: '구성 1', name: '3인치 단말기 세트', orig: '583,000', now: '66,000', colors: ['White', 'Black'], featured: false },
  { idx: 2, tag: 'BEST', name: '10.1인치 안드로이드 POS 세트', orig: '1,012,000', now: '195,800', colors: ['White', 'Black'], featured: true },
  { idx: 3, tag: '구성 3', name: '15인치 윈도우 POS Basic', orig: '1,117,000', now: '424,600', colors: ['White', 'Black'], featured: false },
  { idx: 4, tag: '구성 4', name: '15인치 윈도우 POS Premium', orig: '1,315,000', now: '622,600', colors: ['White', 'Black'], featured: false },
  { idx: 5, tag: '구성 5', name: '15인치 오더 POS Lite', orig: '940,500', now: '315,700', colors: ['White', 'Black'], featured: false },
  { idx: 6, tag: '구성 6', name: '15인치 오더 POS Basic', orig: '1,038,500', now: '371,800', colors: ['White', 'Black'], featured: false },
  { idx: 7, tag: '구성 7', name: '15인치 오더 POS Premium', orig: '1,138,500', now: '513,700', colors: ['White', 'Black'], featured: false },
]

export function Pricing({ blocks }: Props) {
  return (
    <section id="pricing" className="py-section">
      <div className="container-oz">
        {/* 섹션 헤드 */}
        <div className="text-center max-w-[760px] mx-auto mb-12">
          <span className="eyebrow">
            <EditableText
              as="span"
              blockKey="home.pricing.eyebrow"
              fallback="상품 구성 안내"
              value={pickTextOrUndef(blocks, 'home.pricing.eyebrow')}
              pagePath="/"
            />
          </span>
          <h2 className="text-h1 break-keep mt-4 mb-4">
            <EditableText
              as="span"
              blockKey="home.pricing.headline.line1"
              fallback="우리 매장에 맞는"
              value={pickTextOrUndef(blocks, 'home.pricing.headline.line1')}
              pagePath="/"
            />
            <br />
            <mark className="hl-green">
              <EditableText
                as="span"
                blockKey="home.pricing.headline.mark"
                fallback="구성"
                value={pickTextOrUndef(blocks, 'home.pricing.headline.mark')}
                pagePath="/"
              />
            </mark>
            <EditableText
              as="span"
              blockKey="home.pricing.headline.post"
              fallback="으로 시작하세요"
              value={pickTextOrUndef(blocks, 'home.pricing.headline.post')}
              pagePath="/"
            />
          </h2>
          <p className="text-ink-500 text-lg-fluid break-keep">
            <EditableText
              as="span"
              blockKey="home.pricing.sub"
              fallback="모든 가격은 VAT 포함 · 프로모션가는 신규 가입 시 적용됩니다."
              value={pickTextOrUndef(blocks, 'home.pricing.sub')}
              pagePath="/"
            />
          </p>
        </div>

        {/* 상품 라인업 히어로 이미지 */}
        <div className="max-w-[520px] mx-auto mb-12 rounded-2xl overflow-hidden shadow-lg">
          <MediaSlot
            blockKey="home.pricing.lineup"
            value={pickImageOrUndef(blocks, 'home.pricing.lineup')}
            aspect="4/3"
            label="오즈랩페이 상품 라인업"
            hint="assets/product-grid.png"
            pagePath="/"
            fit="contain"
          />
        </div>

        {/* 7 카드 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {ITEMS.map((it) => (
            <div
              key={it.idx}
              className={`price-card ${it.featured ? 'featured' : ''}`}
            >
              <div className="price-tag">
                <EditableText
                  as="span"
                  blockKey={`home.pricing.card${it.idx}.tag`}
                  fallback={it.tag}
                  value={pickTextOrUndef(blocks, `home.pricing.card${it.idx}.tag`)}
                  pagePath="/"
                />
              </div>
              <EditableText
                as="h3"
                blockKey={`home.pricing.card${it.idx}.name`}
                fallback={it.name}
                value={pickTextOrUndef(blocks, `home.pricing.card${it.idx}.name`)}
                pagePath="/"
              />
              <div className="price-img">
                <MediaSlot
                  blockKey={`home.pricing.card${it.idx}.image`}
                  value={pickImageOrUndef(blocks, `home.pricing.card${it.idx}.image`)}
                  aspect="1/1"
                  label={`${it.name} 이미지`}
                  hint="assets/device-netpay.png"
                  pagePath="/"
                  fit="contain"
                />
              </div>
              <div className="price-orig">
                정상가{' '}
                <EditableText
                  as="span"
                  blockKey={`home.pricing.card${it.idx}.orig`}
                  fallback={it.orig}
                  value={pickTextOrUndef(blocks, `home.pricing.card${it.idx}.orig`)}
                  pagePath="/"
                />
                원
              </div>
              <div className="price-now">
                <small>프로모션가</small>
                <EditableText
                  as="span"
                  blockKey={`home.pricing.card${it.idx}.now`}
                  fallback={it.now}
                  value={pickTextOrUndef(blocks, `home.pricing.card${it.idx}.now`)}
                  pagePath="/"
                />
                원
              </div>
              <div className="price-color">
                {it.colors.map((c) => (
                  <span key={c}>
                    <span
                      className="sw"
                      style={{ background: c === 'Black' ? '#1a1a1a' : 'white' }}
                    />{' '}
                    {c}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="text-center mt-8 text-sm text-ink-400 break-keep">
          <EditableText
            as="span"
            blockKey="home.pricing.footnote"
            fallback="* 제휴 POS사 신규 계약 시 오즈랩페이 단말기는 0원으로 제공됩니다."
            value={pickTextOrUndef(blocks, 'home.pricing.footnote')}
            pagePath="/"
          />
        </p>
      </div>
    </section>
  )
}
