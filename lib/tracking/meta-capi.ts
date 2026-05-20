// ─────────────────────────────────────────────
// Meta Conversions API (CAPI) — 서버 → Meta 직접 이벤트 전송
//
// 왜 :
//   - 브라우저 픽셀은 iOS14·ATT·차단기·쿠키 차단으로 30~50% 신호 손실
//   - 서버 → 서버 호출은 손실 0 → ROAS 정확도 ↑
//   - 픽셀과 CAPI 둘 다 같은 event_id 로 보내면 Meta 가 자동 dedupe
//
// 우리 패턴 :
//   ① 폼 제출 (브라우저)
//      · GTM 안 Meta 픽셀 'Lead' (event_id = consultations.id)
//      · 서버 /api/consultations 가 sendMetaLead 호출 (event_id 동일)
//        → Meta 가 dedupe, 한 건만 카운트, 손실 0
//   ② 매출 입력 (어드민)
//      · sendMetaPurchase — value=net 마진, event_id=revenue_records.id
//
// env :
//   - META_PIXEL_ID         (15~16자 숫자, 비즈매니저 > 이벤트 관리자)
//   - META_CAPI_TOKEN       (CAPI 액세스 토큰, 절대 client 노출 금지)
//   - META_CAPI_TEST_CODE   (선택, 비즈매니저 "테스트 이벤트" 탭에서 발급)
//   - 셋 다 없으면 sendMeta* 는 no-op (안전)
// ─────────────────────────────────────────────

import { createHash } from 'crypto'

const GRAPH_VERSION = 'v18.0'

interface BaseEventPayload {
  /** event_id — 픽셀 이벤트와 dedupe 키 (consultations.id 또는 revenue_records.id) */
  eventId: string
  /** 이벤트 발생 페이지 URL (Meta 표준 매개변수) */
  eventSourceUrl?: string | null
  /** 클라이언트 IP (Vercel x-forwarded-for) */
  clientIp?: string | null
  /** 클라이언트 user-agent */
  clientUserAgent?: string | null
  /** _fbp 쿠키 — 모든 픽셀 방문자 보유 */
  fbp?: string | null
  /** _fbc 쿠키 — 광고 클릭 도착자 보유 */
  fbc?: string | null
  /** 이메일 (raw, 함수 안에서 해싱) — 우리는 폼에 이메일 없음, 보통 null */
  email?: string | null
  /** 전화번호 (raw, 함수 안에서 정규화 후 해싱) */
  phone?: string | null
  /** action source — 'website' 가 표준 */
  actionSource?: 'website' | 'system_generated'
}

interface LeadPayload extends BaseEventPayload {
  /** 추정 lead value (운영하면서 평균값 갱신) */
  value?: number
}

interface PurchasePayload extends BaseEventPayload {
  /** 실 net 마진 (매출 - 사은품 비용) */
  value: number
  /** transaction_id — revenue_records.id */
  transactionId: string
  /** 상품 라벨 (선택, contents 배열의 item id/name) */
  productLabel?: string | null
}

/** SHA-256 helper — Meta 가 user_data 식별자에 요구 */
function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex')
}

/** 전화번호 한국 → E.164 비슷한 형태 정규화 후 해시.
 *  예: "010-1234-5678" → "821012345678" → sha256
 *  Meta 공식 권장: 숫자만 + 국가코드 prefix. 한국은 +82, 모바일 0 제거. */
function normalizeAndHashPhone(raw: string): string | null {
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 0) return null
  let normalized: string
  if (digits.startsWith('82')) {
    normalized = digits
  } else if (digits.startsWith('0')) {
    normalized = `82${digits.slice(1)}`
  } else {
    normalized = `82${digits}`
  }
  return sha256(normalized)
}

/** 이메일 lowercase + trim 후 해시 (Meta 표준) */
function normalizeAndHashEmail(raw: string): string | null {
  if (!raw) return null
  const t = raw.trim().toLowerCase()
  if (!t) return null
  return sha256(t)
}

/** user_data 빌더 — 식별자 있는 것만 채움 (Meta 매칭 알고리즘에 도움) */
function buildUserData(p: BaseEventPayload): Record<string, unknown> {
  const ud: Record<string, unknown> = {}
  if (p.email) {
    const em = normalizeAndHashEmail(p.email)
    if (em) ud.em = em
  }
  if (p.phone) {
    const ph = normalizeAndHashPhone(p.phone)
    if (ph) ud.ph = ph
  }
  if (p.fbp) ud.fbp = p.fbp
  if (p.fbc) ud.fbc = p.fbc
  if (p.clientIp) ud.client_ip_address = p.clientIp
  if (p.clientUserAgent) ud.client_user_agent = p.clientUserAgent
  return ud
}

async function postToMeta(events: Array<Record<string, unknown>>): Promise<void> {
  const pixelId = process.env.META_PIXEL_ID
  const token = process.env.META_CAPI_TOKEN
  if (!pixelId || !token) return

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(token)}`
  const body: Record<string, unknown> = { data: events }
  const testCode = process.env.META_CAPI_TEST_CODE
  if (testCode) body.test_event_code = testCode // 검증 단계에만 사용

  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 8000)
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
    clearTimeout(timer)
    if (!res.ok) {
      console.warn('[Meta CAPI] non-2xx', res.status, await res.text().catch(() => ''))
    }
  } catch (err) {
    console.warn('[Meta CAPI] fetch error', err instanceof Error ? err.message : err)
  }
}

/** 폼 제출 시점 — Meta Lead 이벤트 (서버 측, 픽셀과 dedupe) */
export async function sendMetaLead(p: LeadPayload): Promise<void> {
  if (!process.env.META_PIXEL_ID || !process.env.META_CAPI_TOKEN) return
  const evt: Record<string, unknown> = {
    event_name: 'Lead',
    event_time: Math.floor(Date.now() / 1000),
    event_id: p.eventId, // ★ 픽셀과 dedupe 키 — GTM 픽셀 태그에도 동일 값 박아야 함
    action_source: p.actionSource ?? 'website',
    user_data: buildUserData(p),
  }
  if (p.eventSourceUrl) evt.event_source_url = p.eventSourceUrl
  if (typeof p.value === 'number') {
    evt.custom_data = { value: p.value, currency: 'KRW' }
  }
  await postToMeta([evt])
}

/** 매출 입력 시점 — Meta Purchase 이벤트 (실 net 마진, 서버 측) */
export async function sendMetaPurchase(p: PurchasePayload): Promise<void> {
  if (!process.env.META_PIXEL_ID || !process.env.META_CAPI_TOKEN) return
  const evt: Record<string, unknown> = {
    event_name: 'Purchase',
    event_time: Math.floor(Date.now() / 1000),
    event_id: p.eventId, // revenue_records.id — 같은 매출 row 재전송 시 dedupe
    action_source: p.actionSource ?? 'website',
    user_data: buildUserData(p),
    custom_data: {
      value: p.value,
      currency: 'KRW',
      contents: [
        {
          id: p.transactionId,
          quantity: 1,
          item_price: p.value,
        },
      ],
      content_type: 'product',
      content_name: p.productLabel ?? '오즈랩페이 상담 전환',
    },
  }
  if (p.eventSourceUrl) evt.event_source_url = p.eventSourceUrl
  await postToMeta([evt])
}
