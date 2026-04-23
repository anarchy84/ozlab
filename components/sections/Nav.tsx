// ─────────────────────────────────────────────
// Nav — sticky 상단 헤더
// 원본: _design_reference/src/sections/Nav.jsx
// ─────────────────────────────────────────────
'use client'

import { OzLogo, Icon } from '@/components/icons'
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

export function Nav({ blocks }: Props) {
  // 메뉴 링크 5개 — 각각 블록으로 관리
  const menuLinks = [
    { key: 'home.nav.link1', label: '기능', href: '#features' },
    { key: 'home.nav.link2', label: '리뷰 자동화', href: '#review' },
    { key: 'home.nav.link3', label: 'place+', href: '#placeplus' },
    { key: 'home.nav.link4', label: '가격', href: '#pricing' },
    { key: 'home.nav.link5', label: 'FAQ', href: '#faq' },
  ]

  return (
    <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-ink-100">
      <div className="container-oz flex items-center justify-between h-16">
        <a href="#" aria-label="오즈랩페이" className="flex items-center">
          <OzLogo size={28} />
        </a>

        {/* 메뉴 — 태블릿 이상에서 노출 */}
        <div className="hidden md:flex items-center gap-8">
          {menuLinks.map((l) => (
            <EditableLink
              key={l.key}
              blockKey={l.key}
              fallback={{ label: l.label, href: l.href, target: '_self' }}
              value={pickLinkOrUndef(blocks, l.key)}
              pagePath="/"
              className="text-[15px] font-semibold text-ink-700 hover:text-naver-green transition-colors"
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* 전화 CTA — 데스크탑만 */}
          <a
            href="tel:1588-0000"
            className="btn btn-ghost sm hidden sm:inline-flex"
          >
            <Icon.Phone s={16} />
            <EditableText
              as="span"
              blockKey="home.nav.phone"
              fallback="1588-0000"
              value={pickTextOrUndef(blocks, 'home.nav.phone')}
              pagePath="/"
            />
          </a>
          {/* 주 CTA */}
          <EditableLink
            blockKey="home.nav.cta"
            fallback={{ label: '지금 신청하기', href: '#apply', target: '_self' }}
            value={pickLinkOrUndef(blocks, 'home.nav.cta')}
            pagePath="/"
            className="btn btn-primary sm"
          />
        </div>
      </div>
    </nav>
  )
}
