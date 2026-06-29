// ─────────────────────────────────────────────
// Footer — 3컬럼 다크 푸터 (로고·서비스·고객센터)
// 원본: _design_reference/src/sections/Footer.jsx
// ─────────────────────────────────────────────
'use client'

import { EditableText } from '@/components/editable/EditableText'
import { EditableLink } from '@/components/editable/EditableLink'
import { DynamicCTA } from '@/components/cta/DynamicCTA'
import {
  pickTextOrUndef,
  pickLinkOrUndef,
  type ContentBlock,
} from '@/lib/content-blocks'
import { SITE_PHONE, SITE_PHONE_HREF } from '@/lib/contact'
import type { CtaButton } from '@/lib/admin/types'

interface Props {
  blocks: Record<string, ContentBlock>
  ctas?: CtaButton[]
}

export function Footer({ blocks, ctas }: Props) {
  const serviceLinks = [
    { key: 'home.footer.service.v2.ozlab', label: '오즈랩페이 기능', href: '/#features' },
    { key: 'home.footer.service.v3.naverPos', label: '네이버 POS · 카드 단말기', href: '/naver-pos' },
    { key: 'home.footer.service.v3.applePay', label: '애플페이 결제 단말기', href: '/apple-pay-pos' },
    { key: 'home.footer.service.v2.internet', label: '사업자 인터넷', href: '/internet' },
    { key: 'home.footer.service.v2.tableorder', label: '테이블오더', href: '/business/torder' },
    { key: 'home.footer.service.v2.cctv', label: 'CCTV', href: '/business/cctv' },
    { key: 'home.footer.service.v2.marketing', label: '사업자 마케팅지원', href: '/marketing-support' },
    { key: 'home.footer.service.v2.tips', label: '꿀팁', href: '/tips' },
    { key: 'home.footer.service.v2.blog', label: '블로그', href: '/blog' },
  ]

  // supportLinks 의 "상담 신청"은 DynamicCTA 로 별도 처리 (어트리뷰션 추적)
  const supportLinks = [
    { key: 'home.footer.support.v2.phone', label: `${SITE_PHONE} (평일 9–18시)`, href: SITE_PHONE_HREF },
    { key: 'home.footer.support.v2.faq', label: '자주 묻는 질문', href: '/#faq' },
    { key: 'home.footer.support.v2.privacy', label: '개인정보처리방침', href: '/legal/privacy-policy.pdf' },
  ]

  return (
    <footer className="bg-ink-900 text-ink-300 pt-16 pb-6">
      <div className="container-oz grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr] gap-10 md:gap-12">
        {/* 좌측 — 로고 + 카피 */}
        <div>
          <div className="mb-4">
            {/* 리브랜드 — 다크 배경용 흰 로고 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/ozlabpay-logo-horizontal-white.png"
              alt="오즈랩페이"
              className="h-8 w-auto"
            />
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
            {/* 전화 (1번 링크) */}
            <EditableLink
              key={supportLinks[0].key}
              blockKey={supportLinks[0].key}
              fallback={{ label: supportLinks[0].label, href: supportLinks[0].href, target: '_self' }}
              value={pickLinkOrUndef(blocks, supportLinks[0].key)}
              pagePath="/"
              className="text-sm text-ink-300 hover:text-white transition-colors"
            />
            {/* 상담 신청 — DynamicCTA (어트리뷰션 추적)
                다크 푸터에서 유일한 컬러 CTA. 브랜드 블루→퍼플 그라데이션 +
                흰 글자 = 가독성·주목도 모두 최대.
                disableStyleClass 로 DB 의 'btn btn-ghost' 매핑 차단하고
                className 으로 컴팩트 사이즈(px-4 py-2)와 화살표(after pseudo)를 직접 통제. */}
            <DynamicCTA
              placement="footer"
              ctas={ctas}
              fallback={{ label: '상담 신청', href: '#apply' }}
              className="inline-flex items-center justify-center gap-1.5 mt-1 px-4 py-2 rounded-full
                         bg-brand-gradient text-white text-sm font-semibold w-fit
                         shadow-brand transition-all
                         hover:brightness-110 hover:shadow-violet
                         after:ml-0.5 after:content-['→'] after:font-normal"
              disableStyleClass
            />
            {/* FAQ + 약관 (3-4번 링크) */}
            {supportLinks.slice(1).map((l) => (
              <EditableLink
                key={l.key}
                blockKey={l.key}
                fallback={{ label: l.label, href: l.href, target: l.href.endsWith('.pdf') ? '_blank' : '_self' }}
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
