// ─────────────────────────────────────────────
// ReviewAutomation — 다크 배경 4단계 플로우 + 리뷰 목업
// 원본: _design_reference/src/sections/ReviewAutomation.jsx
// ─────────────────────────────────────────────
'use client'

import { Icon } from '@/components/icons'
import { EditableText } from '@/components/editable/EditableText'
import { pickTextOrUndef, type ContentBlock } from '@/lib/content-blocks'

interface Props {
  blocks: Record<string, ContentBlock>
}

export function ReviewAutomation({ blocks }: Props) {
  const steps = [
    { idx: 1, label: 'STEP 1', title: '손님이 결제', desc: '카드·QR·페이 어떤 수단으로든 결제하면' },
    {
      idx: 2,
      label: 'STEP 2',
      title: '리뷰 요청 자동 전송',
      desc: '네이버가 손님에게 영수증 리뷰 요청을 자동으로 보냅니다',
    },
    {
      idx: 3,
      label: 'STEP 3',
      title: '리뷰 작성 (포인트 지급)',
      desc: '손님은 네이버페이 포인트를 받고, 매장은 리뷰가 쌓입니다',
    },
    {
      idx: 4,
      label: 'STEP 4',
      title: '검색 상위 노출',
      desc: '리뷰가 쌓이면 플레이스 검색에서 상위로 올라갑니다',
    },
  ]

  return (
    <section id="review" className="showcase-dark py-section">
      <div className="container-oz">
        {/* 섹션 헤드 */}
        <div className="text-center max-w-[820px] mx-auto mb-14">
          <span className="eyebrow dark">
            <EditableText
              as="span"
              blockKey="home.review.eyebrow"
              fallback="✨ 오즈랩페이만의 핵심 차별점"
              value={pickTextOrUndef(blocks, 'home.review.eyebrow')}
              pagePath="/"
            />
          </span>
          <h2 className="text-h1 text-white break-keep mt-4 mb-4">
            <EditableText
              as="span"
              blockKey="home.review.headline.line1"
              fallback='"리뷰 달아달라" 말하지 마세요.'
              value={pickTextOrUndef(blocks, 'home.review.headline.line1')}
              pagePath="/"
            />
            <br />
            <mark className="hl-solid">
              <EditableText
                as="span"
                blockKey="home.review.headline.mark"
                fallback="네이버가 알아서"
                value={pickTextOrUndef(blocks, 'home.review.headline.mark')}
                pagePath="/"
              />
            </mark>
            <EditableText
              as="span"
              blockKey="home.review.headline.post"
              fallback=" 요청합니다."
              value={pickTextOrUndef(blocks, 'home.review.headline.post')}
              pagePath="/"
            />
          </h2>
          <p className="text-ink-300 text-lg-fluid break-keep">
            <EditableText
              as="span"
              blockKey="home.review.sub.line1"
              fallback="영수증 리뷰, 사장님이 직접 부탁하기 어려우셨죠?"
              value={pickTextOrUndef(blocks, 'home.review.sub.line1')}
              pagePath="/"
            />
            <br />
            <EditableText
              as="span"
              blockKey="home.review.sub.line2"
              fallback="오즈랩페이만 있으면 결제와 동시에 리뷰가 자동으로 쌓입니다."
              value={pickTextOrUndef(blocks, 'home.review.sub.line2')}
              pagePath="/"
            />
          </p>
        </div>

        {/* 4단계 플로우 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4 relative">
          {steps.map((s, i) => (
            <div key={s.idx} className="flow-step">
              <div className="idx">
                <EditableText
                  as="span"
                  blockKey={`home.review.step${s.idx}.label`}
                  fallback={s.label}
                  value={pickTextOrUndef(blocks, `home.review.step${s.idx}.label`)}
                  pagePath="/"
                />
              </div>
              <EditableText
                as="h4"
                blockKey={`home.review.step${s.idx}.title`}
                fallback={s.title}
                value={pickTextOrUndef(blocks, `home.review.step${s.idx}.title`)}
                pagePath="/"
              />
              <EditableText
                as="p"
                blockKey={`home.review.step${s.idx}.desc`}
                fallback={s.desc}
                value={pickTextOrUndef(blocks, `home.review.step${s.idx}.desc`)}
                pagePath="/"
              />
              {i < steps.length - 1 && (
                <div className="flow-arrow">
                  <Icon.Arrow s={24} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 리뷰 카드 목업 — 편집 블록 없이 정적 (디자인용) */}
        <div className="max-w-[520px] mx-auto mt-14">
          <div className="review-mock">
            <div className="flex justify-between items-center mb-3">
              <div className="flex gap-2 items-center">
                <div
                  className="w-9 h-9 rounded-full"
                  style={{ background: 'linear-gradient(135deg,#ffd8a0,#ff9d5c)' }}
                />
                <div>
                  <div className="font-bold text-sm">
                    <EditableText
                      as="span"
                      blockKey="home.review.mock.name"
                      fallback="김○○ 님"
                      value={pickTextOrUndef(blocks, 'home.review.mock.name')}
                      pagePath="/"
                    />
                  </div>
                  <div className="stars">★★★★★</div>
                </div>
              </div>
              <div className="text-xs text-ink-400">방금 전</div>
            </div>
            <div className="text-sm text-ink-700 leading-relaxed">
              <EditableText
                as="span"
                blockKey="home.review.mock.body"
                fallback="메뉴가 정말 맛있어요! 사장님이 직접 설명해주셔서 더 좋았네요. 다음에 또 방문할게요 😊"
                value={pickTextOrUndef(blocks, 'home.review.mock.body')}
                pagePath="/"
              />
            </div>
            <div className="mt-3 p-2.5 bg-[#f1fbf4] rounded-lg text-xs text-[#019544] font-semibold">
              💰 네이버페이 포인트 지급완료 · 영수증 리뷰 1건 추가
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
