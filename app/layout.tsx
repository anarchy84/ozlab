import type { Metadata } from 'next'
// 인라인 편집 — 전역 편집 컨텍스트 & 모달 (admin 로그인 시에만 실질 동작)
import { EditorProvider } from '@/components/editable/EditorProvider'
import { EditorModal } from '@/components/editable/EditorModal'
// 관리자 권한 체크 — 앱 전체에서 Supabase auth 호출을 1회로 축소
// (EditOverlay 가 수십 개 깔릴 때 NavigatorLock 경쟁 방지)
import { AdminGuardProvider } from '@/components/editable/AdminGuardProvider'
import './globals.css'

// ─────────────────────────────────────────────
// 오즈랩페이 루트 레이아웃
// - P6 배포 전에 metadataBase 를 실제 도메인으로 교체 필요
// - OG 이미지·favicon 은 P6 단계에서 제작
// ─────────────────────────────────────────────
export const metadata: Metadata = {
  title: {
    default: '오즈랩페이 | 네이버페이 연동 POS · 카드 단말기',
    template: '%s | 오즈랩페이',
  },
  description:
    '손님이 바글바글한 가게는 모두 오즈랩페이를 씁니다. POS + 카드 단말기 0원, 네이버페이 연동, 리뷰 자동화까지 한 번에.',
  keywords: [
    '네이버페이 단말기',
    'POS 단말기',
    '카드 단말기',
    '네이버 스마트플레이스',
    '리뷰 자동화',
    '자영업자 POS',
    '매장 결제',
    '소상공인 단말기',
  ],
  authors: [{ name: '오즈랩페이' }],
  creator: '오즈랩페이',
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: '오즈랩페이',
    title: '오즈랩페이 | 네이버페이 연동 POS · 카드 단말기',
    description:
      'POS + 카드 단말기 0원, 네이버페이 연동, 리뷰 자동화까지 한 번에.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
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
          AdminGuardProvider : 앱 전체에서 Supabase auth 체크를 1회로 묶음
            - 바깥쪽에 둬서 EditorProvider/EditorModal 등이 모두 같은 context 를 읽게 함
            - 비로그인 방문자에게도 오버헤드 거의 0 (1회 getUser + 이벤트 구독 1개)
          EditorProvider : 편집 세션 관리 (어떤 블록을 누가 편집 중인지)
        */}
        <AdminGuardProvider>
          <EditorProvider>
            <main className="flex-1">{children}</main>
            {/* 전역 편집 모달 — admin 이 ✏️ 눌렀을 때만 실제 DOM 에 나타남 */}
            <EditorModal />
          </EditorProvider>
        </AdminGuardProvider>
      </body>
    </html>
  )
}
