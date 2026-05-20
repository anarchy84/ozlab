'use client'

// ─────────────────────────────────────────────
// GlobalClickTracker — document-level 클릭 위임으로 전화·카톡 클릭 자동 감지
//
// 왜 글로벌인가:
//   - tel: 링크는 Nav/Footer/ApplyForm 성공화면 등 여러 곳에서 사용
//   - 카카오 채널 링크도 동일
//   - 각 컴포넌트마다 onClick 박는 대신 한 컴포넌트에서 위임 처리 → 유지보수 1포인트
//
// 매칭 규칙 (closest('a') 로 클릭된 a 태그 찾기):
//   - href^="tel:"            → phone_click
//   - href contains pf.kakao.com → kakao_chat_click
//   - href contains kakao.com/_  → kakao_chat_click (구 채널 형식)
//
// app/layout.tsx 에 1회 마운트하면 끝. 어드민 경로에선 GTM 차단되므로
// push 해도 실제 전송은 안 됨 (의도된 동작).
// ─────────────────────────────────────────────

import { useEffect } from 'react'
import { pushEvent } from '@/lib/tracking/datalayer'

export function GlobalClickTracker() {
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null
      if (!target) return

      // 클릭된 요소 또는 그 조상 중 가장 가까운 <a> 찾기
      const anchor = target.closest('a') as HTMLAnchorElement | null
      if (!anchor) return

      const href = anchor.getAttribute('href') ?? ''
      if (!href) return

      // 전화 링크
      if (href.startsWith('tel:')) {
        pushEvent('phone_click', {
          page_path: window.location.pathname,
          phone_number: href.replace(/^tel:/, ''),
        })
        return
      }

      // 카카오 채널 링크 (구·신 형식 둘 다)
      if (href.includes('pf.kakao.com') || href.includes('kakao.com/_')) {
        pushEvent('kakao_chat_click', {
          page_path: window.location.pathname,
          link_href: href,
        })
        return
      }
    }

    document.addEventListener('click', handleClick, { capture: true })
    return () => document.removeEventListener('click', handleClick, { capture: true } as EventListenerOptions)
  }, [])

  return null
}
