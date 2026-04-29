// ─────────────────────────────────────────────
// CTA 어트리뷰션 sessionStorage 헬퍼
//
// 흐름 :
//   1) 사용자가 DynamicCTA 클릭 → captureCtaClick(cta) 호출
//      → sessionStorage 에 utm 4종 + cta_id 저장 + 쿠키 (Server Action 대비)
//   2) 사용자가 ApplyForm 제출 → readCtaAttribution() 으로 읽어 폼에 첨부
//   3) /api/consultations 가 utm 필드 INSERT → consultations.utm_*
//
// 우선순위 :
//   URL 쿼리 (?utm_source=...) > sessionStorage (CTA 클릭) > 빈 값
//   → URL 쿼리가 항상 우선 (광고 트래픽 어트리뷰션 절대 손실 방지)
// ─────────────────────────────────────────────

const KEY = 'ozlab_cta_attribution'

export interface CtaAttribution {
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  utm_content?: string | null
  cta_id?: number | null
  captured_at?: string  // ISO
}

/** CTA 클릭 시 호출. 24시간 TTL. */
export function captureCtaClick(cta: {
  id?: number
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  utm_content?: string | null
}): void {
  if (typeof window === 'undefined') return
  try {
    const data: CtaAttribution = {
      cta_id: cta.id ?? null,
      utm_source: cta.utm_source ?? null,
      utm_medium: cta.utm_medium ?? null,
      utm_campaign: cta.utm_campaign ?? null,
      utm_content: cta.utm_content ?? null,
      captured_at: new Date().toISOString(),
    }
    window.sessionStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    // sessionStorage 비활성 (시크릿 모드 등) — 무시
  }
}

/** ApplyForm 제출 시 호출. URL 쿼리가 있으면 우선. */
export function readCtaAttribution(): CtaAttribution {
  if (typeof window === 'undefined') return {}

  // 1) URL 쿼리 우선
  const urlParams = new URLSearchParams(window.location.search)
  const fromUrl: CtaAttribution = {
    utm_source: urlParams.get('utm_source'),
    utm_medium: urlParams.get('utm_medium'),
    utm_campaign: urlParams.get('utm_campaign'),
    utm_content: urlParams.get('utm_content'),
  }
  // 하나라도 있으면 URL 우선
  if (
    fromUrl.utm_source ||
    fromUrl.utm_medium ||
    fromUrl.utm_campaign ||
    fromUrl.utm_content
  ) {
    return fromUrl
  }

  // 2) sessionStorage (CTA 클릭)
  try {
    const raw = window.sessionStorage.getItem(KEY)
    if (!raw) return {}
    const data = JSON.parse(raw) as CtaAttribution

    // 24시간 TTL
    if (data.captured_at) {
      const age = Date.now() - new Date(data.captured_at).getTime()
      if (age > 24 * 60 * 60 * 1000) {
        window.sessionStorage.removeItem(KEY)
        return {}
      }
    }
    return data
  } catch {
    return {}
  }
}

/** 폼 제출 후 어트리뷰션 클리어 (선택). */
export function clearCtaAttribution(): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}
