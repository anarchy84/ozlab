// ─────────────────────────────────────────────
// FloatingCTA — 스크롤 600px 이상일 때 우하단 노출
// 원본: _design_reference/src/sections/FloatingCTA.jsx
//
// 동작 :
//   - useState 로 show / dismissed 관리
//   - window scroll 이벤트로 600px 넘으면 show=true
//   - × 클릭하면 dismissed=true (세션 유지, 영구 X)
// ─────────────────────────────────────────────
'use client'

import { useState, useEffect } from 'react'
import { Icon } from '@/components/icons'
import { EditableText } from '@/components/editable/EditableText'
import { EditableLink } from '@/components/editable/EditableLink'
import {
  pickTextOrUndef,
  pickLinkOrUndef,
  type ContentBlock,
} from '@/lib/content-blocks'

interface Props {
  blocks: Record<string, ContentBlock>
}

export function FloatingCTA({ blocks }: Props) {
  const [show, setShow] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600 && !dismissed)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [dismissed])

  const ctaValue = pickLinkOrUndef(blocks, 'home.floating.cta')

  return (
    <div className={`floating-cta ${show ? 'show' : ''}`}>
      <div className="msg">
        <strong>
          <EditableText
            as="span"
            blockKey="home.floating.strong1"
            fallback="🎁 지금 신청 시"
            value={pickTextOrUndef(blocks, 'home.floating.strong1')}
            pagePath="/"
          />
        </strong>{' '}
        <EditableText
          as="span"
          blockKey="home.floating.mid"
          fallback="POS + 오즈랩페이 단말기 0원 · "
          value={pickTextOrUndef(blocks, 'home.floating.mid')}
          pagePath="/"
        />
        <strong>
          <EditableText
            as="span"
            blockKey="home.floating.strong2"
            fallback="플레이스 광고 무료"
            value={pickTextOrUndef(blocks, 'home.floating.strong2')}
            pagePath="/"
          />
        </strong>
      </div>
      <EditableLink
        blockKey="home.floating.cta"
        fallback={{ label: '지금 신청하기', href: '#apply', target: '_self' }}
        value={ctaValue}
        pagePath="/"
        className="btn btn-primary"
      >
        <span className="flex items-center gap-2">
          {ctaValue?.label ?? '지금 신청하기'}
          <Icon.Arrow s={16} />
        </span>
      </EditableLink>
      <button
        className="close"
        onClick={() => setDismissed(true)}
        aria-label="닫기"
        type="button"
      >
        ×
      </button>
    </div>
  )
}
