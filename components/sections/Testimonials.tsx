// ─────────────────────────────────────────────
// Testimonials — 사장님 후기 3카드
// 원본: _design_reference/src/sections/Testimonials.jsx
// ─────────────────────────────────────────────
'use client'

import { EditableText } from '@/components/editable/EditableText'
import { pickTextOrUndef, type ContentBlock } from '@/lib/content-blocks'

interface Props {
  blocks: Record<string, ContentBlock>
}

export function Testimonials({ blocks }: Props) {
  const quotes = [
    {
      idx: 1,
      quote:
        '매장에 단말기만 뒀을 뿐인데 네이버 리뷰가 알아서 쌓이더라고요. 3개월만에 리뷰 300건 넘었어요.',
      name: '박○○ 사장님',
      role: '홍대 카페',
      avatarChar: '박',
    },
    {
      idx: 2,
      quote:
        '결제, 쿠폰, 홍보까지 한 번에 되니까 다른 프로그램을 쓸 필요가 없어요. 운영이 훨씬 편해졌습니다.',
      name: '이○○ 사장님',
      role: '강남 음식점',
      avatarChar: '이',
    },
    {
      idx: 3,
      quote:
        'place+ 마크 생기고 나서 지도 검색으로 들어오는 신규 손님이 눈에 띄게 늘었어요.',
      name: '정○○ 사장님',
      role: '성수 베이커리',
      avatarChar: '정',
    },
  ]

  return (
    <section className="py-section bg-ink-50">
      <div className="container-oz">
        <div className="text-center max-w-[720px] mx-auto mb-12">
          <span className="eyebrow">
            <EditableText
              as="span"
              blockKey="home.testimonials.eyebrow"
              fallback="사장님들의 진짜 후기"
              value={pickTextOrUndef(blocks, 'home.testimonials.eyebrow')}
              pagePath="/"
            />
          </span>
          <h2 className="text-h1 break-keep mt-4">
            <EditableText
              as="span"
              blockKey="home.testimonials.headline.pre"
              fallback="이미 "
              value={pickTextOrUndef(blocks, 'home.testimonials.headline.pre')}
              pagePath="/"
            />
            <mark className="hl-green">
              <EditableText
                as="span"
                blockKey="home.testimonials.headline.mark"
                fallback="5,000+"
                value={pickTextOrUndef(blocks, 'home.testimonials.headline.mark')}
                pagePath="/"
              />
            </mark>
            <EditableText
              as="span"
              blockKey="home.testimonials.headline.post"
              fallback=" 매장이"
              value={pickTextOrUndef(blocks, 'home.testimonials.headline.post')}
              pagePath="/"
            />
            <br />
            <EditableText
              as="span"
              blockKey="home.testimonials.headline.line2"
              fallback="효과를 경험했습니다"
              value={pickTextOrUndef(blocks, 'home.testimonials.headline.line2')}
              pagePath="/"
            />
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quotes.map((q) => (
            <div key={q.idx} className="quote-card">
              <div className="stars">★★★★★</div>
              <blockquote>
                <EditableText
                  as="span"
                  blockKey={`home.testimonials.quote${q.idx}.text`}
                  fallback={`"${q.quote}"`}
                  value={pickTextOrUndef(blocks, `home.testimonials.quote${q.idx}.text`)}
                  pagePath="/"
                />
              </blockquote>
              <div className="quote-author">
                <div className="quote-avatar">{q.avatarChar}</div>
                <div>
                  <div className="quote-name">
                    <EditableText
                      as="span"
                      blockKey={`home.testimonials.quote${q.idx}.name`}
                      fallback={q.name}
                      value={pickTextOrUndef(
                        blocks,
                        `home.testimonials.quote${q.idx}.name`
                      )}
                      pagePath="/"
                    />
                  </div>
                  <div className="quote-role">
                    <EditableText
                      as="span"
                      blockKey={`home.testimonials.quote${q.idx}.role`}
                      fallback={q.role}
                      value={pickTextOrUndef(
                        blocks,
                        `home.testimonials.quote${q.idx}.role`
                      )}
                      pagePath="/"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
