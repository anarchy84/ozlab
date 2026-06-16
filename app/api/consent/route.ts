// ─────────────────────────────────────────────
// /api/consent — 공개 동의 항목 조회 (선택 동의 2종)
//
// GET → { marketing: {enabled,label,body}, third_party: {enabled,label,body} }
//   - 공개 폼(ApplyForm, CtaModalForm)이 마운트 시 호출
//   - enabled=false 인 항목은 폼에서 노출하지 않음
//   - 어드민 저장 시 revalidateTag('consent') 로 캐시 무효화
// ─────────────────────────────────────────────

import { NextResponse } from 'next/server'
import { getConsentSettings } from '@/lib/consent-server'

// 자주 바뀌지 않는 정적 콘텐츠 → 캐시 허용. 어드민 저장 시 태그로 무효화.
export const revalidate = 600

export async function GET() {
  const settings = await getConsentSettings()
  return NextResponse.json(settings, {
    headers: {
      // CDN/브라우저 캐시 — 10분, stale-while-revalidate 1일
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=86400',
    },
  })
}
