// ─────────────────────────────────────────────
// 마케팅 패키지 견적 — 공용 타입 + 계산/포맷 헬퍼 (클라이언트 안전)
//
// 데이터 소스: package_pricing_items + package_pricing_settings (DB 마스터)
// 서버 로더는 marketing-package-pricing-server.ts 참고
// ─────────────────────────────────────────────

export type PackageItemGroup = 'initial' | 'monthly'

export interface PackagePricingItem {
  id: string
  item_group: PackageItemGroup
  name: string
  description: string | null
  /** 초기 항목 = 1회성 금액, 월정기 항목 = 월 단가 */
  monthly_price: number
  /** 월정기 항목의 연 환산. 초기 항목은 null */
  yearly_price: number | null
  sort_order: number
  is_active: boolean
  note?: string | null
}

export interface PackagePricingSettings {
  package_monthly: number
  package_yearly: number
  badge_label: string
  cta_label: string
  yearly_note: string
  /** 정상가 수동 지정. null 이면 항목 합계로 자동 계산 */
  regular_total_override: number | null
}

export interface PackagePricingData {
  initial: PackagePricingItem[]
  monthly: PackagePricingItem[]
  settings: PackagePricingSettings
}

// 기본 설정값 (DB 로드 실패 시 폴백) — 마이그레이션 시드와 동일
export const DEFAULT_PACKAGE_SETTINGS: PackagePricingSettings = {
  package_monthly: 125000,
  package_yearly: 1500000,
  badge_label: '연간 계약 특가 · 통합 패키지',
  cta_label: '이 가격으로 견적 신청',
  yearly_note: '부가세 별도 · 광고 실비/현장 촬영 제외',
  regular_total_override: 20050000,
}

// 정상가 = override ?? (Σ초기.monthly + Σ월정기.yearly)
export function computeRegularTotal(data: PackagePricingData): number {
  if (typeof data.settings.regular_total_override === 'number') {
    return data.settings.regular_total_override
  }
  const initialSum = data.initial.reduce((s, it) => s + (it.monthly_price || 0), 0)
  const monthlyYearlySum = data.monthly.reduce((s, it) => s + (it.yearly_price ?? it.monthly_price * 12), 0)
  return initialSum + monthlyYearlySum
}

export function computeSavings(data: PackagePricingData): number {
  return Math.max(0, computeRegularTotal(data) - data.settings.package_yearly)
}

// 할인율 (%) — 소수 1자리
export function computeDiscountPct(data: PackagePricingData): number {
  const regular = computeRegularTotal(data)
  if (regular <= 0) return 0
  return Math.round((computeSavings(data) / regular) * 1000) / 10
}

// 숫자 → "1,500,000"
export function formatNum(n: number): string {
  return Math.round(n).toLocaleString('ko-KR')
}

// 숫자 → "₩1,500,000"
export function formatWon(n: number): string {
  return `₩${formatNum(n)}`
}

// 할인율 → "92.5%" (정수면 ".0" 제거)
export function formatPct(pct: number): string {
  return `${Number.isInteger(pct) ? pct : pct.toFixed(1)}%`
}
