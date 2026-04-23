// ─────────────────────────────────────────────
// Painpoints — 3 고민 카드 (01·02·03)
// 원본: _design_reference/src/sections/Painpoints.jsx
// ─────────────────────────────────────────────
'use client'

import { EditableText } from '@/components/editable/EditableText'
import { pickTextOrUndef, type ContentBlock } from '@/lib/content-blocks'

interface Props {
  blocks: Record<string, ContentBlock>
}

export function Painpoints({ blocks }: Props) {
  const items = [
    {
      idx: 1,
      num: '01',
      title: '리뷰는 부탁하기 어려워요',
      desc: '손님께 직접 요청하기 어색하고, 부탁해도 반응은 시큰둥.',
      bubble: '"리뷰 달아주세요"… 말하기 민망하고',
    },
    {
      idx: 2,
      num: '02',
      title: '한 번 온 손님이 다시 오지 않아요',
      desc: '데이터가 없으니 재방문 유도도, 단골 관리도 어렵습니다.',
      bubble: '결제만 하고 그냥 나가는 손님',
    },
    {
      idx: 3,
      num: '03',
      title: '관리할 게 너무 많아요',
      desc: '여러 서비스 왔다 갔다 하다 지쳐서 결국 아무것도 못합니다.',
      bubble: '쿠폰, 홍보, 리뷰… 다 따로따로',
    },
  ]

  return (
    <section className="py-section bg-ink-50">
      <div className="container-oz">
        <div className="text-center mb-12">
          <span className="eyebrow">
            <EditableText
              as="span"
              blockKey="home.painpoints.eyebrow"
              fallback="사장님, 이런 고민 있으시죠?"
              value={pickTextOrUndef(blocks, 'home.painpoints.eyebrow')}
              pagePath="/"
            />
          </span>
          <h2 className="text-h1 break-keep mt-4 mb-4">
            <EditableText
              as="span"
              blockKey="home.painpoints.headline.line1"
              fallback="결제만 되는 단말기 시대는"
              value={pickTextOrUndef(blocks, 'home.painpoints.headline.line1')}
              pagePath="/"
            />
            <br />
            <mark className="hl-green">
              <EditableText
                as="span"
                blockKey="home.painpoints.headline.mark"
                fallback="끝났습니다."
                value={pickTextOrUndef(blocks, 'home.painpoints.headline.mark')}
                pagePath="/"
              />
            </mark>
          </h2>
          <p className="text-ink-500 text-lg-fluid break-keep">
            <EditableText
              as="span"
              blockKey="home.painpoints.sub"
              fallback="장사에 집중하기도 벅찬데, 마케팅까지 혼자 하기는 어렵잖아요."
              value={pickTextOrUndef(blocks, 'home.painpoints.sub')}
              pagePath="/"
            />
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((it) => (
            <div key={it.num} className="pain-card">
              <div className="num">
                <EditableText
                  as="span"
                  blockKey={`home.painpoints.card${it.idx}.num`}
                  fallback={it.num}
                  value={pickTextOrUndef(blocks, `home.painpoints.card${it.idx}.num`)}
                  pagePath="/"
                />
              </div>
              <EditableText
                as="h3"
                blockKey={`home.painpoints.card${it.idx}.title`}
                fallback={it.title}
                value={pickTextOrUndef(blocks, `home.painpoints.card${it.idx}.title`)}
                pagePath="/"
              />
              <EditableText
                as="p"
                blockKey={`home.painpoints.card${it.idx}.desc`}
                fallback={it.desc}
                value={pickTextOrUndef(blocks, `home.painpoints.card${it.idx}.desc`)}
                pagePath="/"
              />
              <div className="pain-bubble">
                💬{' '}
                <EditableText
                  as="span"
                  blockKey={`home.painpoints.card${it.idx}.bubble`}
                  fallback={it.bubble}
                  value={pickTextOrUndef(blocks, `home.painpoints.card${it.idx}.bubble`)}
                  pagePath="/"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
