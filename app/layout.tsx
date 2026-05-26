import type { Metadata } from 'next'
// 인라인 편집 — 전역 편집 컨텍스트 & 모달 (admin 로그인 시에만 실질 동작)
import { EditorProvider } from '@/components/editable/EditorProvider'
import { EditorModal } from '@/components/editable/EditorModal'
// 관리자 권한 체크 — 앱 전체에서 Supabase auth 호출을 1회로 축소
// (EditOverlay 가 수십 개 깔릴 때 NavigatorLock 경쟁 방지)
import { AdminGuardProvider } from '@/components/editable/AdminGuardProvider'
import { AttributionTracker } from '@/components/AttributionTracker'
import { GlobalClickTracker } from '@/components/tracking/GlobalClickTracker'
import { ScrollDepthTracker } from '@/components/tracking/ScrollDepthTracker'
import { JsonLd } from '@/components/seo/JsonLd'
import { GoogleTagManager } from '@/components/seo/GoogleTagManager'
import { CustomHeadInjector } from '@/components/seo/CustomHeadInjector'
import { GTM_ID, organizationJsonLd, SITE_DESCRIPTION, SITE_URL, websiteJsonLd } from '@/lib/seo'
import { getSiteSettings, resolveValue } from '@/lib/admin/site-settings'
import './globals.css'

// ─────────────────────────────────────────────
// 오즈랩페이 루트 레이아웃
//
// 동적 head 영역 (슈퍼어드민이 /admin/settings/head 에서 편집):
//   · GTM ID, GA4 측정 ID, 메타 픽셀 ID, GSC/네이버 verification 토큰
//   · custom_head_html (자유 HTML — 대행사 픽셀 등)
//
// 우선순위: site_settings DB > env > 코드 fallback
//   → DB 가 비어 있으면 env, env 도 없으면 코드 상수
//   → 어드민에서 저장하면 다음 요청부터 즉시 반영 (force-dynamic)
// ─────────────────────────────────────────────

// metadata 도 DB-first 가 필요해서 generateMetadata 로 변환
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()
  const googleVerification = resolveValue({
    dbValue: settings.google_site_verification,
    envValue: process.env.GOOGLE_SITE_VERIFICATION,
  })
  const naverVerification = resolveValue({
    dbValue: settings.naver_site_verification,
    envValue: process.env.NAVER_SITE_VERIFICATION,
  })

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: '네이버 카드 단말기 · 네이버 POS기 | 오즈랩페이',
      template: '%s | 오즈랩페이',
    },
    description: SITE_DESCRIPTION,
    keywords: [
      '네이버 카드 단말기',
      '네이버 카드 결제기',
      '네이버포스기',
      '네이버포스',
      '네이버 POS',
      '네이버 pos',
      '포스기',
      '포스단말기',
      '결제포스',
      '결제포스기',
      '애플페이포스기',
      '애플페이결제단말기',
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
      languages: { 'ko-KR': '/' },
    },
    openGraph: {
      type: 'website',
      locale: 'ko_KR',
      siteName: '오즈랩페이',
      title: '네이버 카드 단말기 · 네이버 POS기 | 오즈랩페이',
      description: SITE_DESCRIPTION,
      url: SITE_URL,
    },
    twitter: {
      card: 'summary_large_image',
      title: '네이버 카드 단말기 · 네이버 POS기 | 오즈랩페이',
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
      google: googleVerification ?? undefined,
      other: naverVerification
        ? { 'naver-site-verification': [naverVerification] }
        : {},
    },
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // site_settings 1회 로드 (generateMetadata 와 별개 요청이지만 부담 미미 — KV 6 row)
  // 향후 React cache() 로 dedup 가능
  const settings = await getSiteSettings()
  const dynamicGtmId = resolveValue({
    dbValue: settings.gtm_id,
    envValue: process.env.NEXT_PUBLIC_GTM_ID,
    fallback: GTM_ID, // 마지막 코드 상수 fallback
  }) ?? GTM_ID

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
      <body
        className="min-h-screen flex flex-col antialiased text-brand-ink"
        style={{
          // 리브랜드 — 전체 페이지 subtle 인디고-퍼플 그라데이션
          // 헤더(흰배경) 와 자연스럽게 연결되도록 매우 옅게. 어드민(/admin) 도 own bg 가 덮어씀.
          background:
            'linear-gradient(180deg, #FFFFFF 0%, #FFFFFF 30%, #F6F8FF 65%, #F4F0FF 100%)',
          backgroundAttachment: 'fixed',
        }}
      >
        {/*
          GTM (Google Tag Manager) — DB 우선 ID
            - /admin/* 자동 차단 (컴포넌트 내부)
        */}
        <GoogleTagManager gtmId={dynamicGtmId} />
        {/*
          슈퍼어드민이 박은 자유 HTML head — 클라이언트에서 inject + /admin/* 차단
          (트래킹 픽셀 위주, hydration 후 박혀도 통계 누락 거의 없음)
        */}
        <CustomHeadInjector html={settings.custom_head_html} />

        <AdminGuardProvider>
          <EditorProvider>
            <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
            {/* 사이트 첫 진입 시 First-touch 어트리뷰션 30일 보존 */}
            <AttributionTracker />
            {/*
              GTM dataLayer 트래커 2종 — /admin/* 경로에선 GTM 자체가 차단되므로
              push 해도 무동작 (의도). 퍼블릭 페이지에서만 실제 GA4 까지 흐름.
            */}
            <GlobalClickTracker />
            <ScrollDepthTracker />
            <main className="flex-1">{children}</main>
            {/* 전역 편집 모달 — admin 이 ✏️ 눌렀을 때만 실제 DOM 에 나타남 */}
            <EditorModal />
          </EditorProvider>
        </AdminGuardProvider>
      </body>
    </html>
  )
}
