export const CONSULTATION_POLICY_BLOCK_KEY = 'admin.consultation_policy.duplicate_phone_window_days'
export const DEFAULT_DUPLICATE_PHONE_WINDOW_DAYS = 30
export const MIN_DUPLICATE_PHONE_WINDOW_DAYS = 30
export const MAX_DUPLICATE_PHONE_WINDOW_DAYS = 365

// 기존 import 호환용. 실제 접수 API는 서버 설정값을 우선 사용한다.
export const DUPLICATE_PHONE_WINDOW_DAYS = DEFAULT_DUPLICATE_PHONE_WINDOW_DAYS

export function coerceDuplicatePhoneWindowDays(value: unknown): number | null {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value.trim())
        : null

  if (parsed === null || !Number.isFinite(parsed)) return null

  const days = Math.round(parsed)
  if (
    days < MIN_DUPLICATE_PHONE_WINDOW_DAYS ||
    days > MAX_DUPLICATE_PHONE_WINDOW_DAYS
  ) {
    return null
  }

  return days
}

export function normalizePhone(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '')
}

export function phoneBlockValues(value: string | null | undefined): string[] {
  const raw = (value ?? '').trim()
  const normalized = normalizePhone(raw)
  return Array.from(new Set([raw, normalized].filter((v) => v.length > 0)))
}
