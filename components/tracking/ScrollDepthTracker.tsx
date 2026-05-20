'use client'

// ─────────────────────────────────────────────
// ScrollDepthTracker — 페이지 스크롤 깊이 25/50/75/100% 도달 시 dataLayer push
//
// 왜 필요한가:
//   - 블로그·LP 콘텐츠 소비 깊이 측정
//   - GA4 enhanced measurement 의 scroll 은 90% 만 잡음 → 25/50/75 단계가 더 정밀
//   - 매체별 콘텐츠 효율 비교 (네이버에서 온 사람은 50% 도달, 메타는 25% 도달 같은)
//
// 페이지 이동 시 (Next.js 클라이언트 라우팅) 리셋:
//   - usePathname 변할 때 발사 기록 reset
//
// 어드민 경로에선 GTM 차단되므로 push 해도 무동작.
// ─────────────────────────────────────────────

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { pushEvent } from '@/lib/tracking/datalayer'

const THRESHOLDS = [25, 50, 75, 100] as const

export function ScrollDepthTracker() {
  const pathname = usePathname()

  useEffect(() => {
    // 페이지마다 발사 기록 초기화
    const fired = new Set<number>()

    function compute(): number {
      const doc = document.documentElement
      const winH = window.innerHeight
      const docH = Math.max(doc.scrollHeight, document.body.scrollHeight)
      // 페이지가 화면보다 작으면 첫 진입에 100% 도달로 잡힘 — 정상
      if (docH <= winH) return 100
      const scrolled = window.scrollY + winH
      return Math.min(100, Math.round((scrolled / docH) * 100))
    }

    function handleScroll() {
      const pct = compute()
      for (const t of THRESHOLDS) {
        if (pct >= t && !fired.has(t)) {
          fired.add(t)
          pushEvent('scroll_depth', {
            depth_pct: t,
            page_path: pathname ?? window.location.pathname,
          })
        }
      }
    }

    // 첫 진입에 viewport 보다 짧은 페이지면 즉시 100% 발사
    handleScroll()

    // passive — 메인 스레드 안 막음
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [pathname])

  return null
}
