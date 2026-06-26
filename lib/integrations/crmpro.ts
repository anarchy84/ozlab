// ─────────────────────────────────────────────
// CRMPro lead submit integration
//
// env:
//   - CRM_PRO_API_KEY    server-only API key
//   - CRM_PRO_GROUP_NO   optional reference value; production is forced to group 158
//   - CRM_PRO_BASE_URL   optional, defaults to https://crmpro.kr/api
//
// 동작:
//   - env 없으면 no-op
//   - 실패해도 상담 접수 자체는 막지 않음
// ─────────────────────────────────────────────

import { normalizePhone } from '@/lib/consultation-policy'

const DEFAULT_BASE_URL = 'https://crmpro.kr/api'
const FINAL_CRM_PRO_GROUP_NO = 158

interface CrmProLeadPayload {
  name: string
  phone: string
  industry?: string | null
  region?: string | null
  deviceType?: string | null
  contractPeriod?: string | null
  callableTime?: string | null
  storeName?: string | null
  message?: string | null
  createdAt?: string | Date | null
  clientIp?: string | null
  landingPagePath?: string | null
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  customFields?: Record<string, unknown>
}

interface CrmProSubmitBody {
  group_no: number
  name: string
  tel: string
  etc1: string
  etc2: string
  etc3: string
  etc4: string
  etc5: string
  reg_datetime: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
}

export function buildCrmProSubmitBody(p: CrmProLeadPayload): CrmProSubmitBody | null {
  const groupNo = resolveCrmProGroupNo()

  const tel = normalizePhone(p.phone)
  if (!p.name || tel.length < 7) return null

  const desiredService = firstText(
    p.deviceType,
    p.customFields?.desired_service,
    p.customFields?.service,
    p.customFields?.product,
    p.customFields?.product_label,
    p.customFields?.device_type,
    p.customFields?.terminal_type,
    p.customFields?.['희망 상품/서비스'],
    p.customFields?.['희망상품'],
    p.customFields?.['단말기'],
  ) ?? '오즈랩페이 상담'

  const callableTime = firstText(
    p.callableTime,
    p.customFields?.callable_time,
    p.customFields?.call_time,
    p.customFields?.available_time,
    p.customFields?.['통화가능시간'],
  ) ?? '미정'

  const extraInfo = [
    p.storeName ? `매장명: ${p.storeName}` : null,
    p.region ? `지역: ${p.region}` : null,
    p.contractPeriod ? `약정: ${p.contractPeriod}` : null,
    p.landingPagePath ? `랜딩: ${p.landingPagePath}` : null,
    p.utmSource ? `utm_source: ${p.utmSource}` : null,
    p.utmMedium ? `utm_medium: ${p.utmMedium}` : null,
    p.utmCampaign ? `utm_campaign: ${p.utmCampaign}` : null,
  ].filter(Boolean).join(' / ')
  const utmSource = firstText(p.utmSource)
  const utmMedium = firstText(p.utmMedium)
  const utmCampaign = firstText(p.utmCampaign)

  return {
    group_no: groupNo,
    name: p.name,
    tel,
    etc1: p.industry || '미입력',
    etc2: desiredService,
    etc3: callableTime,
    etc4: (firstText(p.message) ?? '미입력').slice(0, 500),
    etc5: extraInfo.slice(0, 500),
    reg_datetime: formatKstDatetime(p.createdAt ?? new Date()),
    ...(utmSource ? { utm_source: utmSource } : {}),
    ...(utmMedium ? { utm_medium: utmMedium } : {}),
    ...(utmCampaign ? { utm_campaign: utmCampaign } : {}),
  }
}

export async function sendCrmProLead(p: CrmProLeadPayload): Promise<void> {
  const apiKey = process.env.CRM_PRO_API_KEY
  if (!apiKey) {
    console.warn('[CRMPro] skipped: CRM_PRO_API_KEY is not configured')
    return
  }

  const body = buildCrmProSubmitBody(p)
  if (!body) {
    console.warn('[CRMPro] skipped: invalid CRM_PRO_GROUP_NO or lead payload')
    return
  }

  const baseUrl = (process.env.CRM_PRO_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, '')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey,
  }
  if (p.clientIp) headers['X-Forwarded-For'] = p.clientIp

  let timer: ReturnType<typeof setTimeout> | null = null
  try {
    const ctrl = new AbortController()
    timer = setTimeout(() => ctrl.abort(), 8000)
    const res = await fetch(`${baseUrl}/db/submit`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.warn('[CRMPro] non-2xx', res.status, redactApiKey(text))
      return
    }

    const result = await res.json().catch(() => null) as { success?: boolean; message?: string } | null
    if (result && result.success === false) {
      console.warn('[CRMPro] rejected', result.message ?? 'unknown')
      return
    }
    console.info('[CRMPro] submitted', {
      group_no: body.group_no,
      has_utm_source: Boolean(body.utm_source),
      has_utm_medium: Boolean(body.utm_medium),
      has_utm_campaign: Boolean(body.utm_campaign),
      message: result?.message ?? 'ok',
    })
  } catch (err) {
    console.warn('[CRMPro] fetch error', err instanceof Error ? err.message : err)
  } finally {
    if (timer) clearTimeout(timer)
  }
}

function resolveCrmProGroupNo(): number {
  const configuredGroupNo = Number(process.env.CRM_PRO_GROUP_NO)
  if (configuredGroupNo !== FINAL_CRM_PRO_GROUP_NO) {
    console.warn('[CRMPro] CRM_PRO_GROUP_NO mismatch; forcing final group', {
      configured_group_no: Number.isFinite(configuredGroupNo) ? configuredGroupNo : null,
      forced_group_no: FINAL_CRM_PRO_GROUP_NO,
    })
  }
  return FINAL_CRM_PRO_GROUP_NO
}

function firstText(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value !== 'string') continue
    const t = value.trim()
    if (t.length > 0) return t.slice(0, 200)
  }
  return null
}

function formatKstDatetime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(Number.isNaN(date.getTime()) ? new Date() : date)

  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${byType.year}-${byType.month}-${byType.day} ${byType.hour}:${byType.minute}:${byType.second}`
}

function redactApiKey(value: string): string {
  const key = process.env.CRM_PRO_API_KEY
  if (!key) return value
  return value.replaceAll(key, '[redacted]')
}
