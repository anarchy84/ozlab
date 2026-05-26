// ─────────────────────────────────────────────
// 상담 입력 5개 필드 옵션 (업종/지역/단말기/약정/통화시간)
//
// 2026-05-26 변경 :
//   - 옵션 마스터를 DB( consultation_field_options ) 로 이전
//   - 어드민 설정 페이지(/admin/settings/consultation-options) 에서 직접 편집
//   - 본 파일은 타입 + 정규화 + Fallback 상수만 보유
//
// Fallback 상수 :
//   - DB 연결 실패·SSG 빌드 시 안전망. 평소엔 DB 옵션 우선.
//   - 단말기/약정/통화시간은 의도적으로 비움 (의사결정 : 사용자가 어드민에서 직접 추가)
// ─────────────────────────────────────────────

// 5개 필드 식별자 — DB CHECK 제약과 동기화 유지할 것
export const CONSULTATION_FIELD_KEYS = [
  'industry',
  'region',
  'device_type',
  'contract_period',
  'callable_time',
] as const

export type ConsultationFieldKey = (typeof CONSULTATION_FIELD_KEYS)[number]

export const CONSULTATION_FIELD_LABELS: Record<ConsultationFieldKey, string> = {
  industry: '업종',
  region: '지역',
  device_type: '단말기',
  contract_period: '약정',
  callable_time: '통화가능시간',
}

// DB row 타입 (supabase types 생성 전 임시)
export interface ConsultationFieldOption {
  id: string
  field_key: ConsultationFieldKey
  value: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// ─────────────────────────────────────────────
// Fallback 상수 — DB fetch 실패 시 사용
// ─────────────────────────────────────────────
export const INDUSTRY_OPTIONS = ['음식점 · 카페', '소매 · 판매', '서비스 · 뷰티', '기타'] as const

export const REGION_OPTIONS = [
  '서울',
  '경기·인천',
  '부산·경남',
  '대구·경북',
  '광주·전라',
  '대전·충청',
  '강원',
  '제주',
] as const

// 단말기/약정/통화시간은 비움 (어드민에서 직접 추가)
export const DEVICE_TYPE_OPTIONS: readonly string[] = []
export const CONTRACT_PERIOD_OPTIONS: readonly string[] = []
export const CALLABLE_TIME_OPTIONS: readonly string[] = []

export const FALLBACK_OPTIONS: Record<ConsultationFieldKey, readonly string[]> = {
  industry: INDUSTRY_OPTIONS,
  region: REGION_OPTIONS,
  device_type: DEVICE_TYPE_OPTIONS,
  contract_period: CONTRACT_PERIOD_OPTIONS,
  callable_time: CALLABLE_TIME_OPTIONS,
}

export type ConsultationOption = (typeof INDUSTRY_OPTIONS)[number] | (typeof REGION_OPTIONS)[number]

// ─────────────────────────────────────────────
// 옵션 정규화 — 공백·대소문자 무시하고 매칭
// ─────────────────────────────────────────────
export function normalizeConsultationOption(
  value: string | null | undefined,
  options: readonly string[],
): string {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) return ''

  const compact = compactOptionLabel(trimmed)
  return options.find((option) => compactOptionLabel(option) === compact) ?? trimmed
}

function compactOptionLabel(value: string): string {
  return value.replace(/\s+/g, '')
}

// ─────────────────────────────────────────────
// DB rows → 필드별 활성 옵션 배열로 변환
// ─────────────────────────────────────────────
export function groupOptionsByField(
  rows: ConsultationFieldOption[],
): Record<ConsultationFieldKey, string[]> {
  const result: Record<ConsultationFieldKey, string[]> = {
    industry: [],
    region: [],
    device_type: [],
    contract_period: [],
    callable_time: [],
  }
  // sort_order 오름차순, 동일 시 value 사전순 (API 에서 이미 정렬해서 옴)
  for (const row of rows) {
    if (!row.is_active) continue
    if (!result[row.field_key]) continue
    result[row.field_key].push(row.value)
  }
  return result
}

// ─────────────────────────────────────────────
// 기존 자유 텍스트 데이터 보호 :
//   옵션 외 값이라도 그대로 표시하기 위해 "현재 값"을 옵션 리스트에 합치는 헬퍼
// ─────────────────────────────────────────────
export function mergeOptionsWithCurrentValue(
  options: readonly string[],
  currentValue: string | null | undefined,
): string[] {
  const trimmed = currentValue?.trim() ?? ''
  if (!trimmed) return [...options]
  const found = options.find((o) => compactOptionLabel(o) === compactOptionLabel(trimmed))
  if (found) return [...options]
  return [trimmed, ...options] // 옵션 외 값은 맨 앞에 노출 (옵션 외 배지 가능)
}
