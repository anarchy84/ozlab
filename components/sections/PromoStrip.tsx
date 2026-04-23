// ─────────────────────────────────────────────
// PromoStrip — 최상단 이벤트 띠 (검정 바탕)
// 원본: _design_reference/src/sections/Hero.jsx 의 .promo-strip 부분
// ─────────────────────────────────────────────
'use client'

import { EditableText } from '@/components/editable/EditableText'
import { pickTextOrUndef, type ContentBlock } from '@/lib/content-blocks'

interface Props {
  blocks: Record<string, ContentBlock>
}

export function PromoStrip({ blocks }: Props) {
  return (
    <div className="bg-ink-900 text-white py-3 px-6 flex justify-center items-center gap-3 text-sm flex-wrap">
      <span className="bg-naver-green text-ink-900 text-[11px] font-extrabold px-2 py-0.5 rounded-sm tracking-wider">
        <EditableText
          as="span"
          blockKey="home.promo.chip"
          fallback="EVENT"
          value={pickTextOrUndef(blocks, 'home.promo.chip')}
          pagePath="/"
        />
      </span>
      <span className="break-keep">
        <EditableText
          as="span"
          blockKey="home.promo.pre"
          fallback="POS 신규 가입 시 "
          value={pickTextOrUndef(blocks, 'home.promo.pre')}
          pagePath="/"
        />
        <strong>
          <EditableText
            as="span"
            blockKey="home.promo.highlight1"
            fallback="오즈랩페이 단말기 무상지원"
            value={pickTextOrUndef(blocks, 'home.promo.highlight1')}
            pagePath="/"
          />
        </strong>
        {' + '}
        <strong>
          <EditableText
            as="span"
            blockKey="home.promo.highlight2"
            fallback="플레이스 리워드 광고 무료"
            value={pickTextOrUndef(blocks, 'home.promo.highlight2')}
            pagePath="/"
          />
        </strong>
      </span>
    </div>
  )
}
