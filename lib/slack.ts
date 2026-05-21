// ─────────────────────────────────────────────
// lib/slack.ts — 슬랙 알림 헬퍼 (DB-first + env fallback)
//
// 설계 의도:
//   - 슬랙 채널 Webhook URL 은 DB slack_channels 테이블에서 가져옴
//     (어드민에서 팀장이 직접 입력. env 재배포 없이 추가/수정 가능)
//   - env SLACK_WEBHOOK_URL_CONSULTATIONS 는 안전망 fallback 으로 유지
//   - DM 은 Slack Bot Token (env SLACK_BOT_TOKEN) 가 설정된 경우만 동작
//   - 모든 함수는 fire-and-forget 패턴 — 호출자는 await 안 해도 됨
//     · timeout 5초 (응답 지연 방지)
//     · 실패해도 throw 안 함 (콘솔 로그만)
//
// 사용:
//   import { sendToSlackChannel, sendSlackDM } from '@/lib/slack'
//   void sendToSlackChannel('leads_main', { text: '...' })
//   void sendSlackDM('U03ABC123', { text: '...' })
// ─────────────────────────────────────────────

import { createAdminClient } from '@/lib/supabase/admin'

const TIMEOUT_MS = 5000
const SLACK_API_BASE = 'https://slack.com/api'

interface SlackBlock {
  type: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

interface SlackMessage {
  text: string
  blocks?: SlackBlock[]
}

// -------------------------------------------------------------
// Webhook URL 조회 — DB 우선, env fallback
// -------------------------------------------------------------
const _channelCache = new Map<string, { url: string | null; at: number }>()
const CACHE_TTL_MS = 30 * 1000 // 30초 캐시 (어드민 변경 즉시 반영하되 N+1 막음)

async function getChannelWebhookUrl(code: string): Promise<string | null> {
  // 1) 메모리 캐시 체크
  const cached = _channelCache.get(code)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.url
  }

  // 2) DB 조회
  let dbUrl: string | null = null
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('slack_channels')
      .select('webhook_url, is_active')
      .eq('code', code)
      .maybeSingle()
    if (data && data.is_active && typeof data.webhook_url === 'string' && data.webhook_url.length > 0) {
      dbUrl = data.webhook_url
    }
  } catch (err) {
    console.warn('[slack] DB 채널 조회 실패', code, err)
  }

  // 3) env fallback — 코드별 매핑
  if (!dbUrl) {
    if (code === 'leads_main') {
      dbUrl = process.env.SLACK_WEBHOOK_URL_CONSULTATIONS ?? null
    } else if (code === 'alerts_warning') {
      dbUrl = process.env.SLACK_WEBHOOK_URL_ALERTS ?? null
    } else if (code === 'daily_digest') {
      dbUrl = process.env.SLACK_WEBHOOK_URL_DIGEST ?? null
    }
  }

  _channelCache.set(code, { url: dbUrl, at: Date.now() })
  return dbUrl
}

/**
 * 채널 캐시 무효화 — 어드민에서 채널 수정/추가 시 호출
 * (현재는 30초 TTL 이라 보통 자동 갱신되지만, 즉시 반영하려면 명시적 호출)
 */
export function invalidateSlackChannelCache(code?: string) {
  if (code) _channelCache.delete(code)
  else _channelCache.clear()
}

// -------------------------------------------------------------
// 슬랙 Webhook 직접 호출 (저수준)
// -------------------------------------------------------------
async function postToWebhook(url: string, message: SlackMessage): Promise<boolean> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
      signal: ctrl.signal,
    })
    clearTimeout(t)
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.warn('[slack webhook] 응답 비정상', res.status, text.slice(0, 200))
      return false
    }
    return true
  } catch (err) {
    console.error('[slack webhook] 호출 실패', err)
    return false
  }
}

// -------------------------------------------------------------
// 공개 API
// -------------------------------------------------------------

/**
 * 채널 broadcast — slack_channels.code 로 식별
 *   - DB 에 채널 미등록 + env 도 없으면 silent no-op
 *   - 실패해도 throw 안 함 (fire-and-forget)
 */
export async function sendToSlackChannel(
  code: string,
  message: SlackMessage,
): Promise<boolean> {
  const url = await getChannelWebhookUrl(code)
  if (!url) return false
  return postToWebhook(url, message)
}

/**
 * 사용자 DM — Slack Bot Token 기반 (chat.postMessage)
 *   - SLACK_BOT_TOKEN env 가 없으면 silent no-op
 *   - userId 는 슬랙 사용자 ID (예: U03ABC123) — admin_users.slack_user_id 에서
 */
export async function sendSlackDM(
  userId: string,
  message: SlackMessage,
): Promise<boolean> {
  const token = process.env.SLACK_BOT_TOKEN
  if (!token || !userId) return false

  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
    const res = await fetch(`${SLACK_API_BASE}/chat.postMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        channel: userId,
        text: message.text,
        blocks: message.blocks,
      }),
      signal: ctrl.signal,
    })
    clearTimeout(t)
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
    if (!json.ok) {
      console.warn('[slack DM] 실패', json.error)
      return false
    }
    return true
  } catch (err) {
    console.error('[slack DM] 호출 실패', err)
    return false
  }
}

/**
 * 신규 리드 broadcast — 통합 헬퍼
 *   - leads_main 채널로 broadcast
 *   - counselorSlackUserId 가 있으면 추가로 DM
 *   - 둘 다 fire-and-forget. 호출자는 await 안 해도 됨
 */
export async function broadcastNewLead(payload: {
  id: string
  name: string
  phone: string
  store_name: string | null
  industry: string | null
  region: string | null
  message: string | null
  inferred_channel: string | null
  utm_campaign?: string | null
  counselorSlackUserId?: string | null
  counselorName?: string | null
  adminUrl?: string
}): Promise<void> {
  const channelLabel = payload.inferred_channel ?? '직접유입'
  const campaign = payload.utm_campaign ? ` · ${payload.utm_campaign}` : ''
  const adminUrl = payload.adminUrl ?? `https://www.ozlabpay.kr/admin/consultations?open=${payload.id}`

  // -------- 채널 broadcast 메시지 --------
  const text =
    `📥 *신규 상담* [${channelLabel}${campaign}]\n` +
    `• 이름: *${payload.name}*\n` +
    `• 연락처: *${payload.phone}*\n` +
    (payload.store_name ? `• 매장: ${payload.store_name}\n` : '') +
    (payload.industry ? `• 업종: ${payload.industry}\n` : '') +
    (payload.region ? `• 지역: ${payload.region}\n` : '') +
    (payload.message ? `• 메시지: ${payload.message.slice(0, 200)}\n` : '') +
    (payload.counselorName ? `• 담당: *${payload.counselorName}*\n` : '') +
    `\n👉 <${adminUrl}|어드민에서 보기>`

  // 1) 마케팅팀 broadcast
  void sendToSlackChannel('leads_main', { text })

  // 2) 담당자 DM (있을 때만)
  if (payload.counselorSlackUserId) {
    const dmText =
      `🚨 *새 상담 배정* — 5분 내 콜백하면 전환율 3배\n` +
      `• 이름: *${payload.name}*\n` +
      `• 연락처: *${payload.phone}*\n` +
      (payload.store_name ? `• 매장: ${payload.store_name}\n` : '') +
      `\n👉 <${adminUrl}|바로 처리>`
    void sendSlackDM(payload.counselorSlackUserId, { text: dmText })
  }
}

/**
 * 이상 시그널 알림 broadcast
 */
export async function broadcastAlert(payload: {
  ruleName: string
  ruleId: string
  metric: string
  metricValue: number
  baseline: number | null
  message: string
  channelCodes: string[]
  userIds: string[]  // admin_users.user_id 배열 (slack_user_id 매핑 필요)
  dashboardUrl?: string
}): Promise<void> {
  const dashboard = payload.dashboardUrl ?? 'https://www.ozlabpay.kr/admin'
  const text =
    `⚠️ *${payload.ruleName}*\n` +
    `${payload.message}\n` +
    `\n📊 <${dashboard}|대시보드에서 확인>`

  // 채널 broadcast
  for (const code of payload.channelCodes) {
    void sendToSlackChannel(code, { text })
  }

  // user DM — slack_user_id 일괄 조회 후 발송
  if (payload.userIds.length > 0) {
    try {
      const supabase = createAdminClient()
      const { data } = await supabase
        .from('admin_users')
        .select('slack_user_id, slack_dm_enabled')
        .in('user_id', payload.userIds)
        .eq('is_active', true)
      for (const row of data ?? []) {
        if (row.slack_user_id && row.slack_dm_enabled) {
          void sendSlackDM(row.slack_user_id, { text })
        }
      }
    } catch (err) {
      console.error('[broadcastAlert] DM 조회 실패', err)
    }
  }
}

/**
 * 일일 다이제스트 — 채널 발송 전용 (07:00 cron)
 */
export async function sendDailyDigest(payload: {
  date: string
  newLeads: number
  byChannel: Array<{ channel: string; count: number }>
  conversions: number
  revenue: number
  roasPct: number | null
  alertCount: number
  dashboardUrl?: string
}): Promise<void> {
  const dashboard = payload.dashboardUrl ?? 'https://www.ozlabpay.kr/admin'
  const channelLines =
    payload.byChannel.length > 0
      ? payload.byChannel.map((c) => `${c.channel} ${c.count}`).join(' / ')
      : '없음'
  const roasText =
    payload.roasPct !== null ? `${payload.roasPct.toFixed(0)}%` : '데이터 부족'

  const text =
    `📊 *어제 실적 ${payload.date}*\n` +
    `• 신규 리드: *${payload.newLeads}건* (${channelLines})\n` +
    `• 전환(개통): *${payload.conversions}건*\n` +
    `• 매출: *${payload.revenue.toLocaleString('ko-KR')}원*\n` +
    `• ROAS: *${roasText}*\n` +
    `• 이상 시그널: ${payload.alertCount}건\n` +
    `\n👉 <${dashboard}|대시보드>`

  void sendToSlackChannel('daily_digest', { text })
}
