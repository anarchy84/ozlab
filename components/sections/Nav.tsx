// ─────────────────────────────────────────────
// Nav — sticky 상단 헤더
// 원본: _design_reference/src/sections/Nav.jsx
// ─────────────────────────────────────────────
'use client'

import { usePathname } from 'next/navigation'
import { OzLogo, Icon } from '@/components/icons'
import { EditableText } from '@/components/editable/EditableText'
import { EditableLink } from '@/components/editable/EditableLink'
import { DynamicCTA } from '@/components/cta/DynamicCTA'
import {
  pickTextOrUndef,
  pickLinkOrUndef,
  type ContentBlock,
} from '@/lib/content-blocks'
import type { CtaButton } from '@/lib/admin/types'

interface Props {
  blocks: Record<string, ContentBlock>
  ctas?: CtaButton[]
}

export function Nav({ blocks, ctas }: Props) {
  const pathname = usePathname()
  // 오래된 GNB 편집값이 남아 있어도 새 메뉴 구성이 우선 적용되도록 신규 블록 키를 사용한다.
  const menuLinks = [
    { key: 'home.nav.v2.features', label: '기능', href: '/#features' },
    { key: 'home.nav.v2.internet', label: '사업자 인터넷', href: '/internet' },
    { key: 'home.nav.v2.tableorder', label: '테이블오더', href: '/business/torder' },
    { key: 'home.nav.v2.cctv', label: 'CCTV', href: '/business/cctv' },
    { key: 'home.nav.v2.marketing', label: '사업자 마케팅지원', href: '/marketing-support' },
    { key: 'home.nav.v2.tips', label: '꿀팁', href: '/tips' },
    { key: 'home.nav.v2.pricing', label: '가격', href: '/#pricing' },
    { key: 'home.nav.v2.faq', label: 'FAQ', href: '/#faq' },
  ]

  const linkClass = (href: string, mobile = false) => {
    const active = isActiveMenu(pathname, href)
    const base = mobile
      ? 'shrink-0 whitespace-nowrap rounded-pill px-3 py-1.5 text-[13px] font-bold transition-colors'
      : 'whitespace-nowrap rounded-pill px-3 py-1.5 text-[14px] xl:text-[15px] font-semibold transition-colors'
    return active
      ? `${base} bg-naver-soft text-naver-deep shadow-sm`
      : `${base} text-ink-700 hover:bg-ink-50 hover:text-naver-green`
  }

  return (
    <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-ink-100">
      <div className="container-oz flex items-center justify-between h-16">
        <a href="/" aria-label="오즈랩페이" className="flex items-center">
          <OzLogo size={28} />
        </a>

        {/* 메뉴 — 데스크톱에서 노출 */}
        <div className="hidden lg:flex items-center gap-5 xl:gap-7">
          {menuLinks.map((l) => {
            const current = pickLinkOrUndef(blocks, l.key)
            const href = current?.href ?? l.href
            const active = isActiveMenu(pathname, href)
            return (
              <EditableLink
                key={l.key}
                blockKey={l.key}
                fallback={{ label: l.label, href: l.href, target: '_self' }}
                value={current}
                pagePath="/"
                className={linkClass(href)}
                ariaCurrent={active ? 'page' : undefined}
              />
            )
          })}
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
          {/* 주 CTA — cta_buttons.placement='nav' (어드민 동적 관리) */}
          <DynamicCTA
            placement="nav"
            ctas={ctas}
            fallback={{ label: '지금 신청하기', href: '/#apply' }}
            className="btn btn-primary sm"
          />
        </div>
      </div>

      {/* 모바일 GNB — 메뉴가 사라지지 않도록 상단 가로 스트립으로 노출 */}
      <div className="lg:hidden border-t border-ink-100 bg-white/95">
        <div
          className="container-oz flex h-11 items-center gap-5 overflow-x-auto"
          aria-label="모바일 주요 메뉴"
        >
          {menuLinks.map((l) => (
            <MobileMenuLink
              key={`mobile-${l.key}`}
              item={l}
              blocks={blocks}
              pathname={pathname}
              classNameFor={linkClass}
            />
          ))}
        </div>
      </div>
    </nav>
  )
}

function MobileMenuLink({
  item,
  blocks,
  pathname,
  classNameFor,
}: {
  item: { key: string; label: string; href: string }
  blocks: Record<string, ContentBlock>
  pathname: string
  classNameFor: (href: string, mobile?: boolean) => string
}) {
  const current = pickLinkOrUndef(blocks, item.key)
  const href = current?.href ?? item.href
  const active = isActiveMenu(pathname, href)
  return (
    <EditableLink
      blockKey={item.key}
      fallback={{ label: item.label, href: item.href, target: '_self' }}
      value={current}
      pagePath="/"
      className={classNameFor(href, true)}
      ariaCurrent={active ? 'page' : undefined}
    />
  )
}

function isActiveMenu(pathname: string, href: string): boolean {
  if (
    !href ||
    href.includes('#') ||
    href.startsWith('tel:') ||
    /^https?:\/\//i.test(href)
  ) {
    return false
  }
  const path = href.split('#')[0] || '/'
  if (path === '/') return pathname === '/'
  return pathname === path || pathname.startsWith(`${path}/`)
}
