// ─────────────────────────────────────────────
// Footer — 3컬럼 다크 푸터 (로고·서비스·고객센터)
// 원본: _design_reference/src/sections/Footer.jsx
// ─────────────────────────────────────────────
'use client'

import { OzLogo } from '@/components/icons'
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

export function Footer({ blocks }: Props) {
  const serviceLinks = [
    { key: 'home.footer.service.link1', label: '기능 소개', href: '#features' },
    { key: 'home.footer.service.link2', label: '리뷰 자동화', href: '#review' },
    { key: 'home.footer.service.link3', label: 'place+ 마크', href: '#placeplus' },
    { key: 'home.footer.service.link4', label: '가격 안내', href: '#pricing' },
  ]

  const supportLinks = [
    { key: 'home.footer.support.link1', label: '1588-0000 (평일 9–18시)', href: 'tel:1588-0000' },
    { key: 'home.footer.support.link2', label: '상담 신청', href: '#apply' },
    { key: 'home.footer.support.link3', label: '자주 묻는 질문', href: '#faq' },
    { key: 'home.footer.support.link4', label: '이용약관 · 개인정보처리방침', href: '#' },
  ]

  return (
    <footer className="bg-ink-900 text-ink-300 pt-16 pb-6">
      <div className="container-oz grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr] gap-10 md:gap-12">
        {/* 좌측 — 로고 + 카피 */}
        <div>
          <div className="mb-4">
            <OzLogo size={28} dark />
          </div>
          <p className="text-sm leading-relaxed mb-2">
            <EditableText
              as="span"
              blockKey="home.footer.tagline"
              fallback="결제부터 리뷰·마케팅·홍보까지 한 대로 연결."
              value={pickTextOrUndef(blocks, 'home.footer.tagline')}
              pagePath="/"
            />
          </p>
          <p className="text-sm text-ink-400">
            <EditableText
              as="span"
              blockKey="home.footer.copyright"
              fallback="© 2026 오즈랩페이 (Ozlabpay). All rights reserved."
              value={pickTextOrUndef(blocks, 'home.footer.copyright')}
              pagePath="/"
            />
          </p>
          <p className="text-xs text-ink-500 mt-4 break-keep">
            <EditableText
              as="span"
              blockKey="home.footer.notice"
              fallback="본 페이지는 네이버페이·플레이스와 연동되는 제휴 가맹 프로모션 안내 페이지입니다."
              value={pickTextOrUndef(blocks, 'home.footer.notice')}
              pagePath="/"
            />
          </p>
        </div>

        {/* 중앙 — 서비스 링크 */}
        <div>
          <h5 className="text-white text-sm font-bold mb-4">
            <EditableText
              as="span"
              blockKey="home.footer.service.title"
              fallback="서비스"
              value={pickTextOrUndef(blocks, 'home.footer.service.title')}
              pagePath="/"
            />
          </h5>
          <div className="flex flex-col gap-2">
            {serviceLinks.map((l) => (
              <EditableLink
                key={l.key}
                blockKey={l.key}
                fallback={{ label: l.label, href: l.href, target: '_self' }}
                value={pickLinkOrUndef(blocks, l.key)}
                pagePath="/"
                className="text-sm text-ink-300 hover:text-white transition-colors"
              />
            ))}
          </div>
        </div>

        {/* 우측 — 고객센터 링크 */}
        <div>
          <h5 className="text-white text-sm font-bold mb-4">
            <EditableText
              as="span"
              blockKey="home.footer.support.title"
              fallback="고객센터"
              value={pickTextOrUndef(blocks, 'home.footer.support.title')}
              pagePath="/"
            />
          </h5>
          <div className="flex flex-col gap-2">
            {supportLinks.map((l) => (
              <EditableLink
                key={l.key}
                blockKey={l.key}
                fallback={{ label: l.label, href: l.href, target: '_self' }}
                value={pickLinkOrUndef(blocks, l.key)}
                pagePath="/"
                className="text-sm text-ink-300 hover:text-white transition-colors"
              />
            ))}
          </div>
        </div>
      </div>

      {/* 최하단 — 제휴 문의 */}
      <div className="container-oz mt-12 pt-6 border-t border-ink-800 text-xs text-ink-500">
        <EditableText
          as="span"
          blockKey="home.footer.partnership"
          fallback="제휴문의 · 가맹 · 언론 : partner@example.com"
          value={pickTextOrUndef(blocks, 'home.footer.partnership')}
          pagePath="/"
        />
      </div>
    </footer>
  )
}
