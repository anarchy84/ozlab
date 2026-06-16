// ─────────────────────────────────────────────
// 동의 항목(개인정보 수집·이용 / 제3자 제공 / 마케팅 수신) — 공용 타입·헬퍼 (클라이언트 안전)
//
// 구조 (아정당식 전체동의 + 필수/선택 리스트) :
//   - privacy(필수) · third_party(필수) · marketing(선택)
//   - 필수 항목은 모두 체크해야 제출 가능 (전체동의로 일괄 체크)
//
// 저장 위치 : content_blocks
//   block_key  = 'consultation.consent.privacy' | '.third_party' | '.marketing'
//   block_type = 'text' (제약상 text 사용, 실제 value 는 아래 구조)
//   value      = { enabled: boolean, label: string, body: string }
//
// 이 파일은 서버/클라이언트 양쪽에서 import 가능해야 함 (서버 전용 모듈 import 금지)
// ─────────────────────────────────────────────

/** 동의 종류 */
export type ConsentKind = 'privacy' | 'third_party' | 'marketing'

/** 폼 제출 boolean 필드명 */
export type ConsentFieldName = 'consent_privacy' | 'consent_third_party' | 'consent_marketing'

/** 항목 순서 (렌더·반복용) */
export const CONSENT_KINDS: ConsentKind[] = ['privacy', 'third_party', 'marketing']

interface ConsentMeta {
  /** 필수 동의 여부 — 필수면 항상 노출 + 제출 시 체크 강제 */
  required: boolean
  /** consultations 컬럼 / 폼 필드명 */
  field: ConsentFieldName
  /** content_blocks block_key */
  blockKey: string
}

/** 항목별 구조 메타 (필수 여부는 코드 고정, 문구만 어드민 편집) */
export const CONSENT_META: Record<ConsentKind, ConsentMeta> = {
  privacy: {
    required: true,
    field: 'consent_privacy',
    blockKey: 'consultation.consent.privacy',
  },
  third_party: {
    required: true,
    field: 'consent_third_party',
    blockKey: 'consultation.consent.third_party',
  },
  marketing: {
    required: false,
    field: 'consent_marketing',
    blockKey: 'consultation.consent.marketing',
  },
}

/** 필수 항목 종류 목록 (제출 검증용) */
export const REQUIRED_CONSENT_KINDS: ConsentKind[] = CONSENT_KINDS.filter(
  (k) => CONSENT_META[k].required,
)

/** 단일 동의 항목 값 */
export interface ConsentItem {
  enabled: boolean
  label: string
  body: string
}

/** 세 동의 항목 묶음 — 공개 API 응답 형태 */
export type ConsentSettings = Record<ConsentKind, ConsentItem>

/** DB 값이 없을 때 쓰는 기본값 (사이트가 깨지지 않도록 안전 fallback) */
export const DEFAULT_CONSENTS: ConsentSettings = {
  privacy: {
    enabled: true,
    label: '(필수) 개인정보 수집 및 이용에 동의합니다.',
    body: '',
  },
  third_party: {
    enabled: true,
    label: '(필수) 개인정보 제3자 제공 및 활용에 동의합니다.',
    body: '',
  },
  marketing: {
    enabled: false,
    label: '(선택) 마케팅 정보 수신에 동의합니다.',
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
