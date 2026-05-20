'use client'

// ─────────────────────────────────────────────
// GTM (Google Tag Manager) 삽입 컴포넌트
//
//   - 모든 퍼블릭 페이지에 GTM 스크립트 + noscript iframe 박음
//   - /admin/* 경로는 트래킹 제외 (어드민 행동이 GA·이벤트 통계 오염시키는 거 방지)
//   - next/script strategy="afterInteractive" 사용
//       → GTM 자체가 async 로딩이라 페이지뷰 캡쳐 누락 없음
//       → 초기 LCP 영향 최소화
//   - GTM ID 는 lib/seo.ts 의 GTM_ID 상수에서 주입 (env NEXT_PUBLIC_GTM_ID 우선)
//
// 사용 위치 : app/layout.tsx 의 <body> 첫 자식 (admin 도 같은 RootLayout 거치므로
//             클라이언트에서 pathname 체크해서 admin 진입 시 렌더 차단)
// ─────────────────────────────────────────────

import Script from 'next/script'
import { usePathname } from 'next/navigation'

interface GoogleTagManagerProps {
  gtmId: string
}

export function GoogleTagManager({ gtmId }: GoogleTagManagerProps) {
  const pathname = usePathname()

  // 어드민 경로는 GTM 안 박음
  //   - admin 직원 사내 트래픽이 GA 통계 오염시키지 않도록
  //   - 내부 사용 행동 → 통계 추적 안 함이 깔끔
  if (pathname?.startsWith('/admin')) return null
  if (!gtmId) return null

  return (
    <>
      {/*
        GTM 메인 스크립트 — next/script 가 자동으로 적절한 위치에 inject
        afterInteractive 라 hydration 후 박지만, GTM 자체가 async 라 페이지뷰 캡쳐 OK
      */}
      <Script
        id="gtm-base"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`,
        }}
      />
      {/*
        noscript fallback — JS 차단 사용자(스크리너·일부 봇·구형 브라우저) 트래킹용
        body 안에 들어가야 표준 — 본 컴포넌트가 body 첫 자식으로 마운트되므로 OK
      */}
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
          height="0"
          width="0"
          style={{ display: 'none', visibility: 'hidden' }}
          title="Google Tag Manager"
        />
      </noscript>
    </>
  )
}
