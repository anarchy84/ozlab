// ─────────────────────────────────────────────
// Features — 4대 핵심 가치 (결제·리뷰·마케팅·홍보) 교차 레이아웃
// 원본: _design_reference/src/sections/Features.jsx
//
// 원본의 <mark> 하이라이트는 headline.pre / headline.mark / headline.post 3조각으로 분리
// 불릿 4개는 각각 EditableText 로 관리 (card{n}.bullet{1..4})
// ─────────────────────────────────────────────
'use client'

import type { ReactNode } from 'react'
import { Icon } from '@/components/icons'
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

// 피쳐 메타데이터 — 순서·아이콘·레이아웃 방향만 여기서 관리
// 카피는 전부 blocks 로 편집
type FeatureMeta = {
  idx: 1 | 2 | 3 | 4
  eyebrow: string
  icon: ReactNode
  // 헤드라인 3조각 (pre / mark / post)
  headlinePre: string
  headlineMark: string
  headlinePost: string
  desc: string
  bullets: [string, string, string, string]
  // MediaSlot 힌트
  visualHint: string
  visualLabel: string
  visualClass: 'green' | 'dark'
  reverse: boolean
}

const FEATURES: FeatureMeta[] = [
  {
    idx: 1,
    eyebrow: '01. 결제',
    icon: <Icon.Card s={20} />,
    headlinePre: '손님이 원하는',
    headlineMark: '모든 결제 수단',
    headlinePost: '지원',
    desc: '카드 · QR · 페이사인 · 삼성페이 · 제로페이까지. 손님이 꺼낸 결제 수단, 뭐든 받을 수 있습니다.',
    bullets: [
      '신용·체크카드, IC/무선',
      'QR 결제 (네이버페이·카카오페이·제로페이)',
      '페이사인·삼성페이·애플페이',
      '현금영수증 자동 발행',
    ],
    visualHint: 'assets/ok-pair.png',
    visualLabel: '결제 단말기',
    visualClass: 'green',
    reverse: false,
  },
  {
    idx: 2,
    eyebrow: '02. 리뷰',
    icon: <Icon.Star s={20} />,
    headlinePre: '결제 끝, 바로',
    headlineMark: '네이버 리뷰',
    headlinePost: '로 연결',
    desc: '사장님이 따로 부탁하지 않아도, 결제와 동시에 네이버가 손님에게 알아서 리뷰를 요청합니다.',
    bullets: [
      '결제 즉시 네이버 플레이스 리뷰 작성 유도',
      '영수증 리뷰 자동 누적',
      '리뷰 포인트로 재방문율 UP',
      '네이버 지도 검색 상위 노출에 기여',
    ],
    visualHint: 'assets/review-auto-img.png',
    visualLabel: '리뷰 자동화 화면',
    visualClass: 'dark',
    reverse: true,
  },
  {
    idx: 3,
    eyebrow: '03. 마케팅',
    icon: <Icon.Megaphone s={20} />,
    headlinePre: '한 번 온 손님을',
    headlineMark: '자주 오는 단골',
    headlinePost: '로',
    desc: '결제 데이터로 고객 취향을 파악해 쿠폰·적립·맞춤 혜택을 자동으로 제공합니다.',
    bullets: [
      '구매 이력 기반 맞춤 쿠폰',
      '자동 적립 & 리워드',
      '네이버 스마트플레이스 연동',
      '재방문율·객단가 리포트',
    ],
    visualHint: 'assets/device-bodycodi.png',
    visualLabel: '마케팅 단말기',
    visualClass: 'dark',
    reverse: false,
  },
  {
    idx: 4,
    eyebrow: '04. 홍보',
    icon: <Icon.Chart s={20} />,
    headlinePre: '매장 소식·이벤트를',
    headlineMark: '실시간 홍보',
    headlinePost: '',
    desc: '손님이 매장에 머무는 동안, 대기화면이 우리 가게의 광고판이 됩니다.',
    bullets: [
      '대기화면에 이벤트·신메뉴 노출',
      '영상·이미지 광고 스케줄링',
      'place+ 배지 자동 적용',
      '리뷰 이벤트 실시간 공지',
    ],
    visualHint: 'assets/device-with-features.png',
    visualLabel: '대기화면 홍보',
    visualClass: 'dark',
    reverse: true,
  },
]

export function Features({ blocks }: Props) {
  return (
    <section id="features" className="py-section">
      <div className="container-oz">
        {/* 섹션 헤드 */}
        <div className="text-center max-w-[780px] mx-auto mb-16">
          <span className="eyebrow">
            <EditableText
              as="span"
              blockKey="home.features.eyebrow"
              fallback="오즈랩페이 4가지 핵심 가치"
              value={pickTextOrUndef(blocks, 'home.features.eyebrow')}
              pagePath="/"
            />
          </span>
          <h2 className="text-h1 break-keep mt-4">
            <EditableText
              as="span"
              blockKey="home.features.headline.line1"
              fallback="결제 · 리뷰 · 마케팅 · 홍보"
              value={pickTextOrUndef(blocks, 'home.features.headline.line1')}
              pagePath="/"
            />
            <br />
            <mark className="hl-green">
              <EditableText
                as="span"
                blockKey="home.features.headline.mark"
                fallback="한 대로"
                value={pickTextOrUndef(blocks, 'home.features.headline.mark')}
                pagePath="/"
              />
            </mark>
            <EditableText
              as="span"
              blockKey="home.features.headline.post"
              fallback=" 다 됩니다."
              value={pickTextOrUndef(blocks, 'home.features.headline.post')}
              pagePath="/"
            />
          </h2>
        </div>

        {/* 4 개 피쳐 행 */}
        <div className="space-y-20 md:space-y-28">
          {FEATURES.map((f) => (
            <div
              key={f.idx}
              className={`grid lg:grid-cols-2 gap-10 lg:gap-16 items-center ${
                f.reverse ? 'lg:[&>*:first-child]:order-2' : ''
              }`}
            >
              {/* 카피 */}
              <div>
                <span className="eyebrow inline-flex items-center gap-2">
                  {f.icon}
                  <EditableText
                    as="span"
                    blockKey={`home.features.card${f.idx}.eyebrow`}
                    fallback={f.eyebrow}
                    value={pickTextOrUndef(blocks, `home.features.card${f.idx}.eyebrow`)}
                    pagePath="/"
                  />
                </span>
                <h2 className="text-h1 break-keep mt-4 mb-4">
                  <EditableText
                    as="span"
                    blockKey={`home.features.card${f.idx}.headline.pre`}
                    fallback={f.headlinePre}
                    value={pickTextOrUndef(
                      blocks,
                      `home.features.card${f.idx}.headline.pre`
                    )}
                    pagePath="/"
                  />
                  <br />
                  <mark className="hl-green">
                    <EditableText
                      as="span"
                      blockKey={`home.features.card${f.idx}.headline.mark`}
                      fallback={f.headlineMark}
                      value={pickTextOrUndef(
                        blocks,
                        `home.features.card${f.idx}.headline.mark`
                      )}
                      pagePath="/"
                    />
                  </mark>
                  <EditableText
                    as="span"
                    blockKey={`home.features.card${f.idx}.headline.post`}
                    fallback={f.headlinePost}
                    value={pickTextOrUndef(
                      blocks,
                      `home.features.card${f.idx}.headline.post`
                    )}
                    pagePath="/"
                  />
                </h2>
                <p className="text-ink-500 text-lg-fluid break-keep mb-6">
                  <EditableText
                    as="span"
                    blockKey={`home.features.card${f.idx}.desc`}
                    fallback={f.desc}
                    value={pickTextOrUndef(blocks, `home.features.card${f.idx}.desc`)}
                    pagePath="/"
                  />
                </p>
                <ul className="feature-bullets">
                  {f.bullets.map((b, j) => (
                    <li key={j}>
                      <EditableText
                        as="span"
                        blockKey={`home.features.card${f.idx}.bullet${j + 1}`}
                        fallback={b}
                        value={pickTextOrUndef(
                          blocks,
                          `home.features.card${f.idx}.bullet${j + 1}`
                        )}
                        pagePath="/"
                      />
                    </li>
                  ))}
                </ul>
              </div>

              {/* 비주얼 */}
              <div
                className={`rounded-2xl overflow-hidden ${
                  f.visualClass === 'green'
                    ? 'bg-gradient-to-br from-[#e8fbef] to-[#c8f2d6]'
                    : 'bg-ink-900'
                }`}
              >
                <MediaSlot
                  blockKey={`home.features.card${f.idx}.visual`}
                  value={pickImageOrUndef(blocks, `home.features.card${f.idx}.visual`)}
                  aspect="4/3"
                  label={f.visualLabel}
                  hint={f.visualHint}
                  pagePath="/"
                  fit="contain"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
