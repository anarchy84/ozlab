// ─────────────────────────────────────────────
// dataLayer 트래킹 헬퍼
//   - GTM 표준 이벤트를 안전하게 window.dataLayer 로 push
//   - GA4 _ga 쿠키에서 client_id 파싱 (lead_id ↔ 매출 보정 연결 키)
//   - SSR 안전 (window 체크)
//
// 표준 이벤트 명세 (가이드: /admin/help/tracking 10번 섹션)
//   · generate_lead   — 폼 제출 성공 (lead_id, value 추정, utm_*)
//   · form_start      — 폼 첫 필드 포커스
//   · cta_click       — CTA 버튼 클릭
//   · phone_click     — tel: 링크 클릭 (Nav/Footer/성공화면 등)
//   · kakao_chat_click — 카카오 채널 링크 클릭
//   · scroll_depth    — 페이지 25/50/75/100% 스크롤 도달
// ─────────────────────────────────────────────

/**
 * GTM 표준 이벤트 이름
 *   - generate_lead 는 GA4 추천 이벤트 (자동 전환 인식)
 *   - 나머지는 우리 도메인 표준 (카멜케이스 아님 — GA4 권장 snake_case)
 */
export type TrackingEvent =
  | 'generate_lead'
  | 'form_start'
  | 'cta_click'
  | 'phone_click'
  | 'kakao_chat_click'
  | 'scroll_depth'

/**
 * 어떤 이벤트든 안전하게 dataLayer 에 push.
 *   - GTM 로드 전에도 큐가 쌓이도록 dataLayer 초기화 보장
 *   - 어드민 경로(/admin/*)에선 GoogleTagManager 컴포넌트가 차단하므로
 *     이 함수 호출은 가능하지만 GTM 자체가 안 살아있어 사실상 무동작
 */
export function pushEvent(
  event: TrackingEvent,
  params: Record<string, unknown> = {},
): void {
  if (typeof window === 'undefined') return
  try {
    // dataLayer 없으면 만들기 (GTM 로드 전 호출 대비)
    // GTM 이 나중에 로드돼도 큐의 이벤트를 모두 처리함
    const w = window as unknown as { dataLayer?: Array<Record<string, unknown>> }
    w.dataLayer = w.dataLayer ?? []
    w.dataLayer.push({ event, ...params })
  } catch {
    // 트래킹 실패가 페이지 자체를 깨면 안 됨 — 조용히 무시
  }
}

/**
 * GA4 _ga 쿠키에서 client_id 파싱
 *
 *   _ga 형식: 'GA1.1.{client_id_part_1}.{client_id_part_2}'
 *   client_id = 'part_1.part_2'  (Measurement Protocol 의 client_id 와 동일)
 *
 *   GA4 가 아직 로드되기 전에는 null. 폼 제출 직전에 호출되니 보통은 OK.
 */
export function getGaClientId(): string | null {
  if (typeof document === 'undefined') return null
  try {
    const match = document.cookie.match(/(?:^|;\s*)_ga=([^;]+)/)
    if (!match) return null
    // 예: 'GA1.1.1234567890.1700000000' → '1234567890.1700000000'
    const parts = match[1].split('.')
    if (parts.length < 4) return null
    return `${parts[2]}.${parts[3]}`
  } catch {
    return null
  }
}

/**
 * GA4 session_id 파싱 (GA4 측정 ID 별 쿠키 _ga_XXXXXXXXXX 안에 있음)
 *   _ga_G-XXXXX 형식: 'GS1.1.{session_id}.{session_number}.{is_first_session_event}.{last_active_ts}.{...}'
 *   session_id = 두 번째 dot 뒤
 */
export function getGaSessionId(measurementId?: string): string | null {
  if (typeof document === 'undefined') return null
  if (!measurementId) {
    // measurement ID 모르면 _ga_ 로 시작하는 첫 쿠키 사용
    const m = document.cookie.match(/(?:^|;\s*)_ga_[A-Z0-9]+=([^;]+)/)
    if (!m) return null
    const parts = m[1].split('.')
    return parts.length >= 3 ? parts[2] : null
  }
  // 'G-XXXXXXXXXX' → 쿠키 이름 '_ga_XXXXXXXXXX'
  const cookieName = `_ga_${measurementId.replace(/^G-/, '')}`
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${cookieName}=([^;]+)`))
  if (!m) return null
  const parts = m[1].split('.')
  return parts.length >= 3 ? parts[2] : null
}

/**
 * 폼 제출 추정 매출 (1건당 추정 net 마진, KRW)
 *   - 운영하면서 평균값 조정 가능
 *   - env NEXT_PUBLIC_LEAD_DEFAULT_VALUE 로 override
 *   - 진짜 net 값은 매출 입력 시 서버에서 GA4 Measurement Protocol 로 보정 (A-3 단계)
 */
export const LEAD_DEFAULT_VALUE = Number(
  process.env.NEXT_PUBLIC_LEAD_DEFAULT_VALUE ?? 30000,
)
