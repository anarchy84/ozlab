// ─────────────────────────────────────────────
// FAQ — 6개 아코디언 (열림/닫힘 상태 관리)
// 원본: _design_reference/src/sections/FAQ.jsx
//
// useState 로 한 번에 하나만 열림 (기본: 첫 번째 열림)
// 편집 블록: 각 item 의 q (질문), a (답변)
// ─────────────────────────────────────────────
'use client'

import { useState } from 'react'
import { Icon } from '@/components/icons'
import { EditableText } from '@/components/editable/EditableText'
import { pickTextOrUndef, type ContentBlock } from '@/lib/content-blocks'
import { homeFaqsForBlocks } from '@/lib/home-faqs'

interface Props {
  blocks: Record<string, ContentBlock>
}

export function FAQ({ blocks }: Props) {
  const [open, setOpen] = useState<number>(0)
  const items = homeFaqsForBlocks(blocks)

  return (
    <section id="faq" className="py-section">
      <div className="container-oz max-w-[860px]">
        <div className="text-center mb-12">
          <span className="eyebrow">
            <EditableText
              as="span"
              blockKey="home.faq.eyebrow"
              fallback="자주 묻는 질문"
              value={pickTextOrUndef(blocks, 'home.faq.eyebrow')}
              pagePath="/"
            />
          </span>
          <h2 className="text-h1 break-keep mt-4">
            <EditableText
              as="span"
              blockKey="home.faq.headline"
              fallback="궁금한 점이 있으신가요?"
              value={pickTextOrUndef(blocks, 'home.faq.headline')}
              pagePath="/"
            />
          </h2>
        </div>

        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={it.idx} className="faq-item" data-open={open === i}>
              <button
                className="faq-q"
                onClick={() => setOpen(open === i ? -1 : i)}
                type="button"
              >
                <span className="flex-1 text-left">
                  <EditableText
                    as="span"
                    blockKey={`home.faq.item${it.idx}.q`}
                    fallback={it.q}
                    value={pickTextOrUndef(blocks, `home.faq.item${it.idx}.q`)}
                    pagePath="/"
                  />
                </span>
                <span className="ic">
                  <Icon.Plus s={20} />
                </span>
              </button>
              <div className="faq-a">
                <EditableText
                  as="span"
                  blockKey={`home.faq.item${it.idx}.a`}
                  fallback={it.a}
                  value={pickTextOrUndef(blocks, `home.faq.item${it.idx}.a`)}
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
