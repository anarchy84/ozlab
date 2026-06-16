// ─────────────────────────────────────────────
// 선택 동의(마케팅 활용 / 제3자 제공) — 공용 타입·헬퍼 (클라이언트 안전)
//
// 저장 위치 : content_blocks
//   block_key = 'consultation.consent.marketing'  | 'consultation.consent.third_party'
//   block_type = 'text' (제약상 text 사용, 실제 value 는 아래 구조)
//   value = { enabled: boolean, label: string, body: string }
//
// 이 파일은 서버/클라이언트 양쪽에서 import 가능해야 함
//   - next/headers 등 서버 전용 모듈 import 금지
//   - DB 조회는 lib/consent-server.ts 에 분리
// ─────────────────────────────────────────────

/** 동의 종류 */
export type ConsentKind = 'marketing' | 'third_party'

/** content_blocks block_key 매핑 */
export const CONSENT_BLOCK_KEYS: Record<ConsentKind, string> = {
  marketing: 'consultation.consent.marketing',
  third_party: 'consultation.consent.third_party',
}

/** 제출 폼이 보내는 boolean 필드명 매핑 */
export const CONSENT_FIELD_NAMES: Record<ConsentKind, 'consent_marketing' | 'consent_third_party'> = {
  marketing: 'consent_marketing',
  third_party: 'consent_third_party',
}

/** 단일 동의 항목 값 */
export interface ConsentItem {
  enabled: boolean
  label: string
  body: string
}

/** 두 동의 항목 묶음 — 공개 API 응답 형태 */
export interface ConsentSettings {
  marketing: ConsentItem
  third_party: ConsentItem
}

/** DB 값이 없을 때 쓰는 기본값 (사이트가 깨지지 않도록 안전 fallback) */
export const DEFAULT_CONSENTS: ConsentSettings = {
  marketing: {
    enabled: false,
    label: '(선택) 마케팅 정보 수신 및 활용에 동의합니다.',
    body: '',
  },
  third_party: {
    enabled: false,
    label: '(선택) 개인정보 제3자 제공에 동의합니다.',
    body: '',
  },
}

/**
 * content_blocks.value(jsonb)를 ConsentItem 으로 정규화.
 * 잘못된 형태면 기본값으로 안전 처리.
 */
export function parseConsentItem(value: unknown, fallback: ConsentItem): ConsentItem {
  if (!value || typeof value !== 'object') return fallback
  const v = value as Record<string, unknown>
  return {
    enabled: typeof v.enabled === 'boolean' ? v.enabled : fallback.enabled,
    label: typeof v.label === 'string' && v.label.trim().length > 0 ? v.label : fallback.label,
    body: typeof v.body === 'string' ? v.body : fallback.body,
  }
}
