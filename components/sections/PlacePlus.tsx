// ─────────────────────────────────────────────
// PlacePlus — 2컬럼: 카피 + place+ 배지 목업
// 원본: _design_reference/src/sections/PlacePlus.jsx
// ─────────────────────────────────────────────
'use client'

import { EditableText } from '@/components/editable/EditableText'
import { pickTextOrUndef, type ContentBlock } from '@/lib/content-blocks'

interface Props {
  blocks: Record<string, ContentBlock>
}

export function PlacePlus({ blocks }: Props) {
  // place+ 목업용 가상 매장 — 카피만 편집 가능
  const items = [
    {
      idx: 1,
      thumbClass: 'a',
      name: '단골식당',
      plus: true,
      meta: '★ 4.8 · 리뷰 1,284 · 한식',
      sub: '홍대입구역 3번 출구 · 도보 3분',
    },
    {
      idx: 2,
      thumbClass: 'b',
      name: '초록집밥',
      plus: true,
      meta: '★ 4.7 · 리뷰 932 · 분식',
      sub: '홍대입구역 9번 출구 · 도보 5분',
    },
    {
      idx: 3,
      thumbClass: 'c',
      name: '○○식당',
      plus: false,
      meta: '★ 4.6 · 리뷰 212 · 한식',
      sub: 'place+ 없음 · 낮은 노출',
    },
  ]

  return (
    <section id="placeplus" className="py-section">
      <div className="container-oz grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
        {/* 좌측 카피 */}
        <div>
          <span className="eyebrow">
            <EditableText
              as="span"
              blockKey="home.placeplus.eyebrow"
              fallback="place+ 마크"
              value={pickTextOrUndef(blocks, 'home.placeplus.eyebrow')}
              pagePath="/"
            />
          </span>
          <h2 className="text-h1 break-keep mt-4 mb-5">
            <EditableText
              as="span"
              blockKey="home.placeplus.headline.line1"
              fallback="손님이 믿고 찾는 가게에만"
              value={pickTextOrUndef(blocks, 'home.placeplus.headline.line1')}
              pagePath="/"
            />
            <br />
            <mark className="hl-green">
              <EditableText
                as="span"
                blockKey="home.placeplus.headline.mark"
                fallback="place+"
                value={pickTextOrUndef(blocks, 'home.placeplus.headline.mark')}
                pagePath="/"
              />
            </mark>
            <EditableText
              as="span"
              blockKey="home.placeplus.headline.post"
              fallback="가 붙습니다."
              value={pickTextOrUndef(blocks, 'home.placeplus.headline.post')}
              pagePath="/"
            />
          </h2>
          <p className="text-ink-500 text-lg-fluid break-keep mt-4">
            <EditableText
              as="span"
              blockKey="home.placeplus.desc"
              fallback="네이버 플레이스 검색결과에서 place+ 마크는 오즈랩페이 단말기를 쓰는 매장만 받을 수 있습니다. 손님에게는 '믿을 수 있는 가게'라는 신호가 되고, 매장은 클릭률이 올라갑니다."
              value={pickTextOrUndef(blocks, 'home.placeplus.desc')}
              pagePath="/"
            />
          </p>
          <ul className="feature-bullets mt-6">
            <li>
              <EditableText
                as="span"
                blockKey="home.placeplus.bullet1"
                fallback="오즈랩페이 단말기 사용 매장에만 자동 부여"
                value={pickTextOrUndef(blocks, 'home.placeplus.bullet1')}
                pagePath="/"
              />
            </li>
            <li>
              <EditableText
                as="span"
                blockKey="home.placeplus.bullet2"
                fallback="플레이스 검색결과 눈에 띄는 위치에 강조 노출"
                value={pickTextOrUndef(blocks, 'home.placeplus.bullet2')}
                pagePath="/"
              />
            </li>
            <li>
              <EditableText
                as="span"
                blockKey="home.placeplus.bullet3"
                fallback="손님의 신뢰도 ↑, 클릭률 ↑, 방문율 ↑"
                value={pickTextOrUndef(blocks, 'home.placeplus.bullet3')}
                pagePath="/"
              />
            </li>
          </ul>
        </div>

        {/* 우측 배지 목업 */}
        <div>
          <div className="place-badge-demo">
            <div className="flex items-center gap-2 pb-3 border-b border-ink-100 mb-3">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-extrabold"
                style={{ background: '#03c75a' }}
              >
                N
              </div>
              <div className="text-sm font-semibold">
                <EditableText
                  as="span"
                  blockKey="home.placeplus.demo.title"
                  fallback='네이버 플레이스 · "홍대 맛집"'
                  value={pickTextOrUndef(blocks, 'home.placeplus.demo.title')}
                  pagePath="/"
                />
              </div>
            </div>

            {items.map((it) => (
              <div
                key={it.idx}
                className="place-item"
                style={it.plus ? undefined : { opacity: 0.55 }}
              >
                <div className={`place-thumb ${it.thumbClass}`} />
                <div className="place-body">
                  <div className="place-title">
                    <EditableText
                      as="span"
                      blockKey={`home.placeplus.demo.item${it.idx}.name`}
                      fallback={it.name}
                      value={pickTextOrUndef(
                        blocks,
                        `home.placeplus.demo.item${it.idx}.name`
                      )}
                      pagePath="/"
                    />
                    {it.plus && <span className="place-plus-mark">place+</span>}
                  </div>
                  <div className="place-meta text-xs text-ink-500 mt-1">
                    <EditableText
                      as="span"
                      blockKey={`home.placeplus.demo.item${it.idx}.meta`}
                      fallback={it.meta}
                      value={pickTextOrUndef(
                        blocks,
                        `home.placeplus.demo.item${it.idx}.meta`
                      )}
                      pagePath="/"
                    />
                  </div>
                  <div className="text-xs text-ink-400 mt-1">
                    <EditableText
                      as="span"
                      blockKey={`home.placeplus.demo.item${it.idx}.sub`}
                      fallback={it.sub}
                      value={pickTextOrUndef(
                        blocks,
                        `home.placeplus.demo.item${it.idx}.sub`
                      )}
                      pagePath="/"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-ink-500 mt-4 break-keep">
            <EditableText
              as="span"
              blockKey="home.placeplus.demo.caption"
              fallback="↑ place+ 가 붙은 매장은 같은 조건에서 상위로 표시됩니다."
              value={pickTextOrUndef(blocks, 'home.placeplus.demo.caption')}
              pagePath="/"
            />
          </p>
        </div>
      </div>
    </section>
  )
}
