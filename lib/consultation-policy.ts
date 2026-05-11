export const DUPLICATE_PHONE_WINDOW_DAYS = 30

export function normalizePhone(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '')
}

export function phoneBlockValues(value: string | null | undefined): string[] {
  const raw = (value ?? '').trim()
  const normalized = normalizePhone(raw)
  return Array.from(new Set([raw, normalized].filter((v) => v.length > 0)))
}
