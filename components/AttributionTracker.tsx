'use client'

// ─────────────────────────────────────────────
// AttributionTracker — 사이트 첫 진입 시 First-touch 어트리뷰션 캡처
//
// app/layout.tsx 에 1회 마운트하면 끝.
// localStorage 에 30일 보존되며 같은 브라우저에서 재방문해도 첫 매체 유지.
// ─────────────────────────────────────────────

import { useEffect } from 'react'
import { captureFirstTouch } from '@/lib/cta-attribution'

export function AttributionTracker() {
  useEffect(() => {
    captureFirstTouch()
  }, [])
  return null
}
