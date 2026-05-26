// 상담 신청 폼과 어드민 상세 모달이 함께 쓰는 선택 옵션.
// 홈페이지에서 고객이 고르는 값과 어드민에서 보정하는 값을 같은 기준으로 유지한다.
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

export type ConsultationOption = (typeof INDUSTRY_OPTIONS)[number] | (typeof REGION_OPTIONS)[number]

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
