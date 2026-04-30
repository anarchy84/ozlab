// ─────────────────────────────────────────────
// 어트리뷰션 캡처 (First-touch + Session-touch 하이브리드)
//
// 캡처 대상 :
//   - utm 4종 + utm_term
//   - referer (HTTP Referer 또는 document.referrer)
//   - landing_page_path (사용자가 처음 진입한 페이지)
//   - gclid (구글 광고 클릭 ID)
//   - fbclid (메타 광고 클릭 ID)
//
// 저장 모델 :
//   - First-touch (localStorage 30일) : 처음 들어온 매체에 평생 크레딧
//                                       자영업자 단말기처럼 결정 사이클이 길 때 정확
//   - Session-touch (sessionStorage)  : 같은 세션 내 CTA 클릭 추적
//
// 우선순위 (ApplyForm 제출 시 readAttribution) :
//   URL 쿼리 > Session(현재 세션 CTA 클릭) > First-touch(localStorage) > 빈 값
//
// 광고 트래픽이 직접 도달했을 땐 항상 URL 쿼리가 이김 (절대 손실 방지).
// ─────────────────────────────────────────────

const SESSION_KEY    = 'ozlab_cta_attribution'         // 세션 내 CTA 클릭
const FIRST_TOUCH_KEY = 'ozlab_first_touch_attribution' // 첫 방문 30일 보존
const FIRST_TOUCH_TTL_DAYS = 30

// ─────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────
export interface AttributionPayload {
  // 광고 캠페인
  utm_source?:        string | null
  utm_medium?:        string | null
  utm_campaign?:      string | null
  utm_content?:       string | null
  utm_term?:          string | null
  // 광고 클릭 ID
  gclid?:             string | null
  fbclid?:            string | null
  // 유입 경로
  referer?:           string | null
  landing_page_path?: string | null
  // CTA
  cta_id?:            number | null
  // 메타
  captured_at?:       string
}

// ─────────────────────────────────────────────
// 1) First-touch 캡처 — 사이트 첫 진입 시 1회만 (있으면 보존)
//    AttributionTracker 컴포넌트가 layout 에서 1번 호출
// ─────────────────────────────────────────────
export function captureFirstTouch(): void {
  if (typeof window === 'undefined') return
  try {
    const existing = window.localStorage.getItem(FIRST_TOUCH_KEY)
    if (existing) {
      // 이미 First-touch 기록 있음 — TTL 체크해서 만료면 갱신, 살아있으면 보존
      try {
        const data = JSON.parse(existing) as AttributionPayload
        if (data.captured_at) {
          const age = Date.now() - new Date(data.captured_at).getTime()
          if (age < FIRST_TOUCH_TTL_DAYS * 24 * 60 * 60 * 1000) {
            return // 살아있음 — 보존
          }
        }
      } catch {
        // 파싱 실패 → 새로 기록
      }
    }

    const sp = new URLSearchParams(window.location.search)
    const data: AttributionPayload = {
      utm_source:        sp.get('utm_source'),
      utm_medium:        sp.get('utm_medium'),
      utm_campaign:      sp.get('utm_campaign'),
      utm_content:       sp.get('utm_content'),
      utm_term:          sp.get('utm_term'),
      gclid:             sp.get('gclid'),
      fbclid:            sp.get('fbclid'),
      referer:           document.referrer || null,
      landing_page_path: window.location.pathname,
      captured_at:       new Date().toISOString(),
    }

    // 모든 필드가 비어있는 다이렉트 진입도 일단 저장 (referer = '' 케이스)
    window.localStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(data))
  } catch {
    // localStorage 비활성 (시크릿 모드, 차단 등) — 무시
  }
}

// ─────────────────────────────────────────────
// 2) CTA 클릭 캡처 — 세션 내 CTA 클릭 추적 (기존 호환)
// ─────────────────────────────────────────────
export function captureCtaClick(cta: {
  id?:           number
  utm_source?:   string | null
  utm_medium?:   string | null
  utm_campaign?: string | null
  utm_content?:  string | null
}): void {
  if (typeof window === 'undefined') return
  try {
    const data: AttributionPayload = {
      cta_id:       cta.id ?? null,
      utm_source:   cta.utm_source ?? null,
      utm_medium:   cta.utm_medium ?? null,
      utm_campaign: cta.utm_campaign ?? null,
      utm_content:  cta.utm_content ?? null,
      captured_at:  new Date().toISOString(),
    }
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(data))
  } catch {
    // ignore
  }
}

// ─────────────────────────────────────────────
// 3) ApplyForm 제출 시 호출 — 모든 출처 머지
//    우선순위 : URL > Session(CTA 클릭) > First-touch
// ─────────────────────────────────────────────
export function readAttribution(): AttributionPayload {
  if (typeof window === 'undefined') return {}

  // First-touch 로드 (가장 후순위 베이스)
  let firstTouch: AttributionPayload = {}
  try {
    const raw = window.localStorage.getItem(FIRST_TOUCH_KEY)
    if (raw) {
      const data = JSON.parse(raw) as AttributionPayload
      if (data.captured_at) {
        const age = Date.now() - new Date(data.captured_at).getTime()
        if (age < FIRST_TOUCH_TTL_DAYS * 24 * 60 * 60 * 1000) {
          firstTouch = data
        } else {
          window.localStorage.removeItem(FIRST_TOUCH_KEY)
        }
      }
    }
  } catch {
    // ignore
  }

  // Session CTA 클릭 (TTL 24h)
  let session: AttributionPayload = {}
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY)
    if (raw) {
      const data = JSON.parse(raw) as AttributionPayload
      if (data.captured_at) {
        const age = Date.now() - new Date(data.captured_at).getTime()
        if (age < 24 * 60 * 60 * 1000) {
          session = data
        } else {
          window.sessionStorage.removeItem(SESSION_KEY)
        }
      }
    }
  } catch {
    // ignore
  }

  // URL 쿼리 (현재 페이지)
  const sp = new URLSearchParams(window.location.search)
  const fromUrl: AttributionPayload = {
    utm_source:   sp.get('utm_source'),
    utm_medium:   sp.get('utm_medium'),
    utm_campaign: sp.get('utm_campaign'),
    utm_content:  sp.get('utm_content'),
    utm_term:     sp.get('utm_term'),
    gclid:        sp.get('gclid'),
    fbclid:       sp.get('fbclid'),
  }

  // 머지 — 뒤에 오는 값이 앞을 덮음
  // 단, falsy 는 덮지 않음 (빈 utm 으로 First-touch 를 지우면 안 됨)
  const merged: AttributionPayload = { ...firstTouch }

  // First-touch 의 referer / landing 은 항상 유지 (광고 클릭 첫 방문이 정답)
  // session 과 url 은 utm/광고ID/cta_id 만 덮음

  for (const k of [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
    'gclid', 'fbclid', 'cta_id',
  ] as const) {
    if (session[k]) merged[k] = session[k] as never
    if (fromUrl[k]) merged[k] = fromUrl[k] as never
  }

  return merged
}

// 호환성 alias (기존 ApplyForm 가 readCtaAttribution 호출 중)
export const readCtaAttribution = readAttribution

// ─────────────────────────────────────────────
// 4) 폼 제출 후 세션 클리어 (First-touch 는 보존)
// ─────────────────────────────────────────────
export function clearSessionAttribution(): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // ignore
  }
}

// 기존 함수명 호환
export const clearCtaAttribution = clearSessionAttribution
