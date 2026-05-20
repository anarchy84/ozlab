import type { Metadata } from 'next'
// 인라인 편집 — 전역 편집 컨텍스트 & 모달 (admin 로그인 시에만 실질 동작)
import { EditorProvider } from '@/components/editable/EditorProvider'
import { EditorModal } from '@/components/editable/EditorModal'
// 관리자 권한 체크 — 앱 전체에서 Supabase auth 호출을 1회로 축소
// (EditOverlay 가 수십 개 깔릴 때 NavigatorLock 경쟁 방지)
import { AdminGuardProvider } from '@/components/editable/AdminGuardProvider'
import { AttributionTracker } from '@/components/AttributionTracker'
import { JsonLd } from '@/components/seo/JsonLd'
import { GoogleTagManager } from '@/components/seo/GoogleTagManager'
import { GTM_ID, organizationJsonLd, SITE_DESCRIPTION, SITE_URL, websiteJsonLd } from '@/lib/seo'
import './globals.css'

// ─────────────────────────────────────────────
// 오즈랩페이 루트 레이아웃
// - P6 배포 전에 metadataBase 를 실제 도메인으로 교체 필요
// - OG 이미지·favicon 은 P6 단계에서 제작
// ─────────────────────────────────────────────
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: '오즈랩페이 | 네이버페이 연동 POS · 카드 단말기',
    template: '%s | 오즈랩페이',
  },
  description: SITE_DESCRIPTION,
  keywords: [
    '네이버페이 단말기',
    'POS 단말기',
    '카드 단말기',
    '네이버 스마트플레이스',
    '리뷰 자동화',
    '자영업자 POS',
    '매장 결제',
    '소상공인 단말기',
    '플레이스 마케팅',
    'N커넥트 단말기',
  ],
  applicationName: '오즈랩페이',
  authors: [{ name: '오즈랩페이' }],
  creator: '오즈랩페이',
  publisher: '오즈랩페이',
  category: 'business',
  alternates: {
    canonical: '/',
    languages: {
      'ko-KR': '/',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: '오즈랩페이',
    title: '오즈랩페이 | 네이버페이 연동 POS · 카드 단말기',
    description: SITE_DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: '오즈랩페이 | 네이버페이 연동 POS · 카드 단말기',
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    other: {
      'naver-site-verification': process.env.NAVER_SITE_VERIFICATION
        ? [process.env.NAVER_SITE_VERIFICATION]
        : [],
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <head>
        {/* Pretendard Variable — 공식 CDN (P4 에서 self-host 전환 검토) */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          as="style"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body className="min-h-screen flex flex-col antialiased bg-white text-[#101828]">
        {/*
          GTM (Google Tag Manager)
            - 모든 퍼블릭 페이지에 박힘. /admin/* 경로는 컴포넌트 내부에서 자동 차단.
            - script + noscript iframe 모두 이 컴포넌트가 책임.
            - body 최상단에 둬야 GTM 표준 권장 위치(noscript 가 body 시작점)에 맞음.
        */}
        <GoogleTagManager gtmId={GTM_ID} />
        {/*
          AdminGuardProvider : 앱 전체에서 Supabase auth 체크를 1회로 묶음
            - 바깥쪽에 둬서 EditorProvider/EditorModal 등이 모두 같은 context 를 읽게 함
            - 비로그인 방문자에게도 오버헤드 거의 0 (1회 getUser + 이벤트 구독 1개)
          EditorProvider : 편집 세션 관리 (어떤 블록을 누가 편집 중인지)
        */}
        <AdminGuardProvider>
          <EditorProvider>
            <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
            {/* 사이트 첫 진입 시 First-touch 어트리뷰션 30일 보존 */}
            <AttributionTracker />
            <main className="flex-1">{children}</main>
            {/* 전역 편집 모달 — admin 이 ✏️ 눌렀을 때만 실제 DOM 에 나타남 */}
            <EditorModal />
          </EditorProvider>
        </AdminGuardProvider>
      </body>
    </html>
  )
}
