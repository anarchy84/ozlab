// ─────────────────────────────────────────────
// Mechanism — 검색 상위 노출의 원리 3컬럼
// 원본: _design_reference/src/sections/Mechanism.jsx
// ─────────────────────────────────────────────
'use client'

import { Icon } from '@/components/icons'
import { EditableText } from '@/components/editable/EditableText'
import { pickTextOrUndef, type ContentBlock } from '@/lib/content-blocks'

interface Props {
  blocks: Record<string, ContentBlock>
}

export function Mechanism({ blocks }: Props) {
  const items = [
    {
      idx: 1,
      icon: <Icon.Star s={28} />,
      title: '영수증 리뷰 수',
      desc: '네이버 알고리즘은 리뷰 수·빈도를 핵심 지표로 봅니다.',
    },
    {
      idx: 2,
      icon: <Icon.Search s={28} />,
      title: '검색 클릭률',
      desc: 'place+ 매장은 눈에 띄어 자연스럽게 클릭률이 올라갑니다.',
    },
    {
      idx: 3,
      icon: <Icon.Shield s={28} />,
      title: '네이버 인증 가맹',
      desc: '오즈랩페이 단말기는 공식 인증 가맹 지표로 반영됩니다.',
    },
  ]

  return (
    <section className="py-section bg-ink-50">
      <div className="container-oz">
        <div className="text-center max-w-[760px] mx-auto mb-14">
          <span className="eyebrow">
            <EditableText
              as="span"
              blockKey="home.mechanism.eyebrow"
              fallback="검색 상위 노출의 원리"
              value={pickTextOrUndef(blocks, 'home.mechanism.eyebrow')}
              pagePath="/"
            />
          </span>
          <h2 className="text-h1 break-keep mt-4 mb-4">
            <EditableText
              as="span"
              blockKey="home.mechanism.headline.line1"
              fallback="오즈랩페이만 써도"
              value={pickTextOrUndef(blocks, 'home.mechanism.headline.line1')}
              pagePath="/"
            />
            <br />
            <mark className="hl-green">
              <EditableText
                as="span"
                blockKey="home.mechanism.headline.mark"
                fallback="자동으로 가점"
                value={pickTextOrUndef(blocks, 'home.mechanism.headline.mark')}
                pagePath="/"
              />
            </mark>
            <EditableText
              as="span"
              blockKey="home.mechanism.headline.post"
              fallback="이 쌓입니다."
              value={pickTextOrUndef(blocks, 'home.mechanism.headline.post')}
              pagePath="/"
            />
          </h2>
          <p className="text-ink-500 text-lg-fluid break-keep">
            <EditableText
              as="span"
              blockKey="home.mechanism.sub"
              fallback="플레이스 검색 알고리즘은 리뷰 수와 클릭률을 중요하게 봅니다. 오즈랩페이는 이 두 지표 모두를 자연스럽게 끌어올립니다."
              value={pickTextOrUndef(blocks, 'home.mechanism.sub')}
              pagePath="/"
            />
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((it) => (
            <div key={it.idx} className="mech-item">
              <div className="mech-icon">{it.icon}</div>
              <EditableText
                as="h4"
                blockKey={`home.mechanism.item${it.idx}.title`}
                fallback={it.title}
                value={pickTextOrUndef(blocks, `home.mechanism.item${it.idx}.title`)}
                pagePath="/"
              />
              <EditableText
                as="p"
                blockKey={`home.mechanism.item${it.idx}.desc`}
                fallback={it.desc}
                value={pickTextOrUndef(blocks, `home.mechanism.item${it.idx}.desc`)}
                pagePath="/"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
