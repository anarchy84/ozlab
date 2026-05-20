// ─────────────────────────────────────────────
// GA4 Measurement Protocol — 서버 → GA4 직접 이벤트 전송
//
// 목적 :
//   - 매출 입력 시점에 실제 net 마진(매출 - 사은품)을 GA4 로 전송
//   - 폼 제출 시점의 generate_lead(추정값) ↔ 매출 시점 purchase(실값) 를
//     client_id + transaction_id 로 연결 → 매체별 실 ROAS 정확화
//
// 트리거 :
//   - /api/admin/revenue POST 가 매출 row insert 직후 비동기 호출
//   - 실패해도 매출 입력 자체는 성공 (fire-and-forget)
//
// env :
//   - GA4_MEASUREMENT_ID  (예: G-XXXXXXXXXX)
//   - GA4_API_SECRET      (GA4 > 관리 > 데이터 스트림 > 측정 프로토콜 API 비밀에서 발급)
//   - 둘 중 하나라도 없으면 sendGa4Purchase 는 no-op (안전)
//
// 가이드 :
//   - /admin/help/tracking 10-B 섹션과 일치
//   - 표준: https://developers.google.com/analytics/devguides/collection/protocol/ga4
// ─────────────────────────────────────────────

interface PurchasePayload {
  /** GA4 _ga 쿠키 client_id (consultations.ga_client_id) — 폼 제출자와 동일 사용자 매칭 */
  clientId: string | null
  /** GA4 _ga_XXX 세션 ID (선택) — 같은 세션 묶음 정확도 향상 */
  sessionId?: string | null
  /** 매출 row 식별자 (revenue_records.id) — GA4 transaction_id */
  transactionId: string
  /** 상담 신청 row 식별자 (consultations.id) — generate_lead 이벤트와 매칭 키 */
  leadId: string
  /** 실 net 마진 (매출 - 사은품 비용) — GA4 가 ROAS 계산에 쓰는 값 */
  value: number
  /** 통화 코드 (기본 KRW) */
  currency?: string
  /** 매체 어트리뷰션 (선택) */
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  utm_content?: string | null
  utm_term?: string | null
  gclid?: string | null
  fbclid?: string | null
  /** 상품 라벨 (선택) — GA4 items 배열의 item_name */
  productLabel?: string | null
}

/**
 * GA4 Measurement Protocol 로 purchase 이벤트 전송.
 *
 * - client_id 가 없으면 fallback 으로 transactionId 사용 (GA4 가 어트리뷰션 못 잡지만
 *   이벤트는 들어감 — 일단 매출 카운트는 살리고 매체 매칭은 GA4 측에서 unknown 으로 잡힘)
 * - env 미설정 시 즉시 return (no-op, 안전)
 * - try/catch — 네트워크 에러가 매출 API 응답에 영향 주지 않게
 */
export async function sendGa4Purchase(p: PurchasePayload): Promise<void> {
  const measurementId = process.env.GA4_MEASUREMENT_ID
  const apiSecret = process.env.GA4_API_SECRET

  // env 둘 다 있어야 동작. 둘 중 하나라도 없으면 no-op.
  if (!measurementId || !apiSecret) {
    return
  }

  // client_id 없으면 transaction_id 로 폴백 (GA4 는 client_id 필수)
  const clientId = p.clientId || `srv.${p.transactionId}`

  const url =
    `https://www.google-analytics.com/mp/collect` +
    `?measurement_id=${encodeURIComponent(measurementId)}` +
    `&api_secret=${encodeURIComponent(apiSecret)}`

  const payload: Record<string, unknown> = {
    client_id: clientId,
    events: [
      {
        name: 'purchase',
        params: {
          // GA4 표준 — transaction_id 가 같으면 dedupe (재실행 안전)
          transaction_id: p.transactionId,
          value: p.value,
          currency: p.currency ?? 'KRW',
          // 우리 도메인 키 — generate_lead 와 매칭
          lead_id: p.leadId,
          // 매체 어트리뷰션 (있으면 보냄, GA4 사용자 정의 차원으로 매핑 가능)
          ...(p.utm_source   ? { utm_source: p.utm_source }     : {}),
          ...(p.utm_medium   ? { utm_medium: p.utm_medium }     : {}),
          ...(p.utm_campaign ? { utm_campaign: p.utm_campaign } : {}),
          ...(p.utm_content  ? { utm_content: p.utm_content }   : {}),
          ...(p.utm_term     ? { utm_term: p.utm_term }         : {}),
          ...(p.gclid        ? { gclid: p.gclid }               : {}),
          ...(p.fbclid       ? { fbclid: p.fbclid }             : {}),
          items: [
            {
              item_id: p.transactionId,
              item_name: p.productLabel ?? '오즈랩페이 상담 전환',
              price: p.value,
              quantity: 1,
            },
          ],
        },
      },
    ],
  }

  // session_id 가 있으면 표준 자동 매개변수 자리에 박음
  if (p.sessionId) {
    const params = (payload.events as Array<{ params: Record<string, unknown> }>)[0].params
    params.session_id = p.sessionId
  }

  try {
    // 8초 타임아웃 — GA4 MP 는 비활성 상태에서 보통 100-300ms.
    // 그래도 hang 대비 AbortController 로 보호.
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 8000)
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    })
    clearTimeout(timer)
    // GA4 MP 는 항상 2xx 리턴 (validation hits 만 4xx). 로그만 남기고 throw 안 함.
    if (!res.ok) {
      console.warn('[GA4 MP] non-2xx', res.status, await res.text().catch(() => ''))
    }
  } catch (err) {
    // 네트워크/타임아웃 — 매출 입력 자체엔 영향 없음
    console.warn('[GA4 MP] fetch error', err instanceof Error ? err.message : err)
  }
}

/**
 * GA4 MP validation 엔드포인트 (테스트용).
 *   - production 데이터 안 쌓이고 검증만 받음
 *   - 운영에서 호출하면 안 됨 (debug 용)
 */
export const GA4_MP_DEBUG_URL = 'https://www.google-analytics.com/debug/mp/collect'
