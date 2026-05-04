// ─────────────────────────────────────────────
// 어드민 표시 포맷 헬퍼
//   - 시간 이중표기 (CRM PRO 패턴: "4일 전" + "04-26 08:58")
//   - 연락처 마스킹 (010-****-9189)
//   - IP 부분 표시
// ─────────────────────────────────────────────

import type { AdminRole } from './types'

// ─────────────────────────────────────────────
// 시간 이중표기 — 상대 + 절대
// ─────────────────────────────────────────────
export interface DualTime {
  relative: string  // "4일 전" / "1시간 23분"
  absolute: string  // "04-26 08:58"
  iso: string       // raw ISO
  ageMinutes: number
}

export function formatDual(input: string | Date | null | undefined): DualTime | null {
  if (!input) return null
  const target = typeof input === 'string' ? new Date(input) : input
  if (Number.isNaN(target.getTime())) return null

  const now = Date.now()
  const diffMs = now - target.getTime()
  const ageMinutes = Math.floor(diffMs / 60000)

  // 상대 시간
  let relative: string
  if (ageMinutes < 1) relative = '방금'
  else if (ageMinutes < 60) relative = `${ageMinutes}분 전`
  else if (ageMinutes < 60 * 24) {
    const h = Math.floor(ageMinutes / 60)
    const m = ageMinutes % 60
    relative = m > 0 ? `${h}시간 ${m}분` : `${h}시간 전`
  } else {
    const d = Math.floor(ageMinutes / (60 * 24))
    relative = `${d}일 전`
  }

  // 절대 시간 (KST — Asia/Seoul)
  // 서버·클라 일관 위해 직접 계산
  const kst = new Date(target.getTime() + 9 * 3600000)
  const mm = String(kst.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(kst.getUTCDate()).padStart(2, '0')
  const hh = String(kst.getUTCHours()).padStart(2, '0')
  const mi = String(kst.getUTCMinutes()).padStart(2, '0')
  const absolute = `${mm}-${dd} ${hh}:${mi}`

  return { relative, absolute, iso: target.toISOString(), ageMinutes }
}

// 시간 경과별 색상 (보라 ~ 빨강 — CRM PRO 패턴)
export function ageBadgeClass(ageMinutes: number | null | undefined): string {
  if (ageMinutes == null) return 'bg-ink-700 text-ink-400'
  if (ageMinutes < 60) return 'bg-violet-500/20 text-violet-300'
  if (ageMinutes < 60 * 24) return 'bg-blue-500/20 text-blue-300'
  if (ageMinutes < 60 * 24 * 3) return 'bg-amber-500/20 text-amber-300'
  return 'bg-red-500/20 text-red-300'
}

// ─────────────────────────────────────────────
// 연락처 마스킹
//   상담사 이상 → 풀 표시
//   viewer 등 → 마스킹
// ─────────────────────────────────────────────
const FULL_PHONE_ROLES: AdminRole[] = [
  'super_admin', 'marketing', 'tm_lead', 'counselor', 'admin', 'marketer',
]

export function maskPhone(phone: string | null | undefined, viewerRole?: AdminRole): string {
  if (!phone) return '—'
  // 풀 표시 권한
  if (viewerRole && FULL_PHONE_ROLES.includes(viewerRole)) {
    return phone
  }
  // 010-1234-5678 → 010-****-5678
  return phone.replace(/(\d{2,3})[-\s]?(\d{3,4})[-\s]?(\d{4})/, '$1-****-$3')
}

// ─────────────────────────────────────────────
// IP 부분 표시 (마지막 옥텟 마스킹)
// ─────────────────────────────────────────────
export function formatIp(ip: string | null | undefined): string {
  if (!ip) return ''
  // IPv4 마지막 옥텟 풀 표시 (CRM PRO 처럼)
  return ip
}

// ─────────────────────────────────────────────
// 부재 카운터 추출 (status code: absent_1, absent_2, ...)
//   → 1, 2, 3, 4, 5 또는 null
// ─────────────────────────────────────────────
export function extractAbsenceCount(statusCode: string | null | undefined): number | null {
  if (!statusCode) return null
  const m = statusCode.match(/^absent_(\d+)/)
  return m ? parseInt(m[1], 10) : null
}
