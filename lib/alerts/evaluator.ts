// ─────────────────────────────────────────────
// lib/alerts/evaluator.ts — 이상 시그널 룰 평가 코어
//
// 지원 metric (6종):
//   · lead_count        : 어제 신규 리드 수
//   · cpa               : 어제 CPA = spend / conversions(개통)
//   · roas              : 어제 ROAS = revenue / spend * 100
//   · conversion_rate   : 어제 전환율 = 개통 / 신규리드 * 100
//   · unassigned_count  : 현재 미배정 30분 경과 리드 수
//   · channel_no_lead   : 특정 매체 24시간 0건 (dim_filter.channel 필수)
//
// 지원 dimension (4종):
//   · global, channel, service, channel_x_service
//
// 지원 comparison (3종):
//   · multiplier        : value >= (baseline * threshold) — CPA/ROAS 상승형
//   · absolute          : 절대값 비교 (metric 별로 방향 다름 — 아래 isAbsoluteBreach 참조)
//   · percentage_of_avg : value <= (baseline * threshold) — lead_count 하락형
//
// 지원 comparison_basis (3종):
//   · target            : alert_rules.baseline_value 직접 사용
//   · rolling_30d_avg   : 최근 30일 평균
//   · previous_week     : 7일 전 동일 시점 값
//
// 평가 흐름:
//   1) baseline 계산
//   2) 현재 value 계산
//   3) triggered? 판정
//   4) cooldown 체크 (같은 룰 + 같은 dim_context 마지막 발송 후 N분 이내면 skip)
//   5) 발송 + alert_log INSERT
// ─────────────────────────────────────────────

import { createAdminClient } from '@/lib/supabase/admin'
import { broadcastAlert } from '@/lib/slack'

type SupabaseClient = ReturnType<typeof createAdminClient>

export interface AlertRule {
  id: string
  name: string
  description: string | null
  metric: string
  dimension: string
  dim_filter: Record<string, unknown>
  comparison: string
  threshold: number
  comparison_basis: string
  baseline_value: number | null
  channel_codes: string[]
  user_ids: string[]
  cooldown_minutes: number
  is_active: boolean
}

interface EvalContext {
  /** 평가 대상 기준 날짜 (어제 = yesterdayKST) */
  yesterdayKST: string
  /** 30일 전 KST 날짜 */
  thirtyDaysAgoKST: string
  /** 7일 전 KST 날짜 */
  sevenDaysAgoKST: string
}

interface EvalResult {
  triggered: boolean
  value: number | null
  baseline: number | null
  contextLabel: string
  dimContext: Record<string, unknown>
}

// -------------------------------------------------------------
// KST 날짜 헬퍼 — 한국 기준 어제·30일전·7일전
// -------------------------------------------------------------
function kstDateString(daysAgo = 0): string {
  const now = new Date()
  // UTC+9
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000 - daysAgo * 24 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

export function makeEvalContext(): EvalContext {
  return {
    yesterdayKST: kstDateString(1),
    thirtyDaysAgoKST: kstDateString(30),
    sevenDaysAgoKST: kstDateString(7),
  }
}

// -------------------------------------------------------------
// metric 계산기 — 각 metric 별로 SQL 실행
// -------------------------------------------------------------

/** 어제 신규 리드 수 (전체) */
async function calcLeadCount(
  supabase: SupabaseClient,
  date: string,
  dimFilter: Record<string, unknown>,
): Promise<number> {
  let q = supabase
    .from('consultations')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', `${date}T00:00:00+09:00`)
    .lt('created_at', `${date}T24:00:00+09:00`)

  if (typeof dimFilter.channel === 'string' && dimFilter.channel) {
    q = q.eq('inferred_channel', dimFilter.channel)
  }

  const { count, error } = await q
  if (error) {
    console.error('[calcLeadCount]', error)
    return 0
  }
  return count ?? 0
}

/** 어제 CPA = spend / conversions(개통) */
async function calcCpa(
  supabase: SupabaseClient,
  date: string,
  dimFilter: Record<string, unknown>,
): Promise<number | null> {
  // 1) ad_metrics 에서 어제 spend (matchset)
  let qSpend = supabase
    .from('ad_metrics')
    .select('spend')
    .eq('date', date)
  if (typeof dimFilter.channel === 'string') qSpend = qSpend.eq('channel', dimFilter.channel)
  if (typeof dimFilter.service === 'string') qSpend = qSpend.eq('service', dimFilter.service)

  const { data: spendRows, error: e1 } = await qSpend
  if (e1) {
    console.error('[calcCpa spend]', e1)
    return null
  }
  const totalSpend = (spendRows ?? []).reduce(
    (sum, r) => sum + Number(r.spend ?? 0),
    0,
  )

  // 2) consultations 어제 개통건 (is_conversion=true 상태)
  let qConv = supabase
    .from('consultations')
    .select('id, status:db_statuses!consultations_status_id_fkey(is_conversion), inferred_channel')
    .gte('created_at', `${date}T00:00:00+09:00`)
    .lt('created_at', `${date}T24:00:00+09:00`)
  if (typeof dimFilter.channel === 'string') qConv = qConv.eq('inferred_channel', dimFilter.channel)

  const { data: convRows, error: e2 } = await qConv
  if (e2) {
    console.error('[calcCpa conv]', e2)
    return null
  }
  const conversions = (convRows ?? []).filter((r) => {
    const s = r.status as { is_conversion?: boolean } | null
    return s?.is_conversion === true
  }).length

  if (conversions === 0) return null // 무한대 방지
  return Math.round(totalSpend / conversions)
}

/** 어제 ROAS = revenue / spend * 100 */
async function calcRoas(
  supabase: SupabaseClient,
  date: string,
  dimFilter: Record<string, unknown>,
): Promise<number | null> {
  // 1) spend
  let qSpend = supabase.from('ad_metrics').select('spend').eq('date', date)
  if (typeof dimFilter.channel === 'string') qSpend = qSpend.eq('channel', dimFilter.channel)
  const { data: spendRows } = await qSpend
  const totalSpend = (spendRows ?? []).reduce((s, r) => s + Number(r.spend ?? 0), 0)
  if (totalSpend === 0) return null

  // 2) revenue — revenue_records 어제 net_amount (있으면 net, 없으면 amount-gift)
  // recognized_at 기준
  const { data: revRows } = await supabase
    .from('revenue_records')
    .select('amount, gift_amount, net_amount, recognized_at')
    .eq('recognized_at', date)
  const totalRevenue = (revRows ?? []).reduce(
    (s, r) => s + Number(r.net_amount ?? (Number(r.amount ?? 0) - Number(r.gift_amount ?? 0))),
    0,
  )
  return Math.round((totalRevenue / totalSpend) * 100)
}

/** 어제 전환율 = 개통건 / 신규리드 * 100 */
async function calcConversionRate(
  supabase: SupabaseClient,
  date: string,
  dimFilter: Record<string, unknown>,
): Promise<number | null> {
  let q = supabase
    .from('consultations')
    .select('id, status:db_statuses!consultations_status_id_fkey(is_conversion)')
    .gte('created_at', `${date}T00:00:00+09:00`)
    .lt('created_at', `${date}T24:00:00+09:00`)
  if (typeof dimFilter.channel === 'string') q = q.eq('inferred_channel', dimFilter.channel)

  const { data, error } = await q
  if (error || !data) return null
  const total = data.length
  if (total === 0) return null
  const conv = data.filter((r) => {
    const s = r.status as { is_conversion?: boolean } | null
    return s?.is_conversion === true
  }).length
  return Math.round((conv / total) * 100)
}

/** 현재 미배정 + 30분 경과 리드 수 */
async function calcUnassignedCount(supabase: SupabaseClient): Promise<number> {
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
  const { count, error } = await supabase
    .from('consultations')
    .select('id', { count: 'exact', head: true })
    .is('counselor_id', null)
    .lt('created_at', thirtyMinAgo)
  if (error) {
    console.error('[calcUnassignedCount]', error)
    return 0
  }
  return count ?? 0
}

/** 특정 매체 24시간 0건 — boolean 형태로 (0이면 triggered=true) */
async function calcChannelNoLead(
  supabase: SupabaseClient,
  dimFilter: Record<string, unknown>,
): Promise<number> {
  const ch = typeof dimFilter.channel === 'string' ? dimFilter.channel : null
  if (!ch) return 1 // 잘못된 룰
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count } = await supabase
    .from('consultations')
    .select('id', { count: 'exact', head: true })
    .eq('inferred_channel', ch)
    .gte('created_at', dayAgo)
  return count ?? 0
}

// -------------------------------------------------------------
// metric 계산 디스패처
// -------------------------------------------------------------
async function evaluateMetric(
  supabase: SupabaseClient,
  metric: string,
  date: string,
  dimFilter: Record<string, unknown>,
): Promise<number | null> {
  switch (metric) {
    case 'lead_count':
      return calcLeadCount(supabase, date, dimFilter)
    case 'cpa':
      return calcCpa(supabase, date, dimFilter)
    case 'roas':
      return calcRoas(supabase, date, dimFilter)
    case 'conversion_rate':
      return calcConversionRate(supabase, date, dimFilter)
    case 'unassigned_count':
      return calcUnassignedCount(supabase)
    case 'channel_no_lead':
      return calcChannelNoLead(supabase, dimFilter)
    default:
      console.warn('[evaluateMetric] unknown metric', metric)
      return null
  }
}

// -------------------------------------------------------------
// baseline 계산 — rolling_30d_avg / previous_week
// -------------------------------------------------------------
async function calcBaseline(
  supabase: SupabaseClient,
  rule: AlertRule,
  ctx: EvalContext,
): Promise<number | null> {
  if (rule.comparison_basis === 'target') {
    return rule.baseline_value
  }
  if (rule.comparison_basis === 'previous_week') {
    return evaluateMetric(supabase, rule.metric, ctx.sevenDaysAgoKST, rule.dim_filter)
  }
  if (rule.comparison_basis === 'rolling_30d_avg') {
    // 30일 평균 — 각 일별 metric 값 계산 후 평균
    const values: number[] = []
    for (let i = 1; i <= 30; i++) {
      const d = kstDateString(i)
      const v = await evaluateMetric(supabase, rule.metric, d, rule.dim_filter)
      if (v !== null) values.push(v)
    }
    if (values.length === 0) return null
    return values.reduce((s, v) => s + v, 0) / values.length
  }
  return null
}

// -------------------------------------------------------------
// 위반 판정
// -------------------------------------------------------------
function isBreach(
  rule: AlertRule,
  value: number,
  baseline: number | null,
): boolean {
  if (rule.comparison === 'multiplier') {
    if (baseline === null || baseline === 0) return false
    return value >= baseline * rule.threshold
  }
  if (rule.comparison === 'percentage_of_avg') {
    if (baseline === null || baseline === 0) return false
    return value <= baseline * rule.threshold
  }
  if (rule.comparison === 'absolute') {
    // metric 별로 방향 다름:
    //   - lead_count / roas / conversion_rate : value < threshold (미달)
    //   - cpa / unassigned_count / channel_no_lead : value > threshold (초과)
    //   · channel_no_lead 의 경우 0건 = triggered 라 threshold=0 + value>=threshold 가 자연스럽지 않음
    //     → 별도 분기: count <= threshold
    if (rule.metric === 'channel_no_lead') {
      return value <= rule.threshold
    }
    const lowerIsBetter = ['cpa', 'unassigned_count']
    if (lowerIsBetter.includes(rule.metric)) {
      return value > rule.threshold
    }
    return value < rule.threshold
  }
  return false
}

// -------------------------------------------------------------
// 쿨다운 체크
// -------------------------------------------------------------
async function inCooldown(
  supabase: SupabaseClient,
  ruleId: string,
  cooldownMinutes: number,
): Promise<boolean> {
  const since = new Date(Date.now() - cooldownMinutes * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('alert_log')
    .select('id')
    .eq('rule_id', ruleId)
    .eq('success', true)
    .gte('triggered_at', since)
    .limit(1)
  if (error) {
    console.error('[inCooldown]', error)
    return false
  }
  return (data?.length ?? 0) > 0
}

// -------------------------------------------------------------
// 메시지 생성
// -------------------------------------------------------------
function buildAlertMessage(rule: AlertRule, value: number, baseline: number | null): string {
  const valStr = formatMetric(rule.metric, value)
  const baseStr = baseline !== null ? formatMetric(rule.metric, baseline) : '-'
  const basisLabel: Record<string, string> = {
    target: '목표',
    rolling_30d_avg: '30일 평균',
    previous_week: '지난주',
  }
  return `현재 값: *${valStr}* (${basisLabel[rule.comparison_basis] ?? '비교기준'}: ${baseStr})`
}

function formatMetric(metric: string, value: number): string {
  switch (metric) {
    case 'cpa':
      return `${Math.round(value).toLocaleString('ko-KR')}원`
    case 'roas':
      return `${value.toFixed(0)}%`
    case 'conversion_rate':
      return `${value.toFixed(1)}%`
    case 'lead_count':
    case 'unassigned_count':
    case 'channel_no_lead':
      return `${Math.round(value).toLocaleString('ko-KR')}건`
    default:
      return value.toString()
  }
}

// -------------------------------------------------------------
// 룰 1개 평가 + 발송
// -------------------------------------------------------------
export async function evaluateAndDispatchRule(rule: AlertRule): Promise<EvalResult> {
  const supabase = createAdminClient()
  const ctx = makeEvalContext()

  // 1) baseline + value 계산
  const [baseline, value] = await Promise.all([
    calcBaseline(supabase, rule, ctx),
    evaluateMetric(
      supabase,
      rule.metric,
      // unassigned_count / channel_no_lead 는 실시간 → date 무시
      ['unassigned_count', 'channel_no_lead'].includes(rule.metric)
        ? ctx.yesterdayKST
        : ctx.yesterdayKST,
      rule.dim_filter,
    ),
  ])

  if (value === null) {
    return {
      triggered: false,
      value: null,
      baseline,
      contextLabel: '계산 불가',
      dimContext: rule.dim_filter,
    }
  }

  // 2) 위반 판정
  const triggered = isBreach(rule, value, baseline)
  if (!triggered) {
    return { triggered: false, value, baseline, contextLabel: '정상', dimContext: rule.dim_filter }
  }

  // 3) 쿨다운
  if (await inCooldown(supabase, rule.id, rule.cooldown_minutes)) {
    return { triggered: false, value, baseline, contextLabel: '쿨다운 중', dimContext: rule.dim_filter }
  }

  // 4) 발송 + 로그
  const message = buildAlertMessage(rule, value, baseline)

  try {
    await broadcastAlert({
      ruleName: rule.name,
      ruleId: rule.id,
      metric: rule.metric,
      metricValue: value,
      baseline,
      message,
      channelCodes: rule.channel_codes,
      userIds: rule.user_ids,
    })

    await supabase.from('alert_log').insert({
      rule_id: rule.id,
      rule_name_snapshot: rule.name,
      metric_value: value,
      baseline,
      message,
      destinations: rule.channel_codes,
      success: true,
      dim_context: rule.dim_filter,
    })
    return { triggered: true, value, baseline, contextLabel: '발송 완료', dimContext: rule.dim_filter }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    await supabase.from('alert_log').insert({
      rule_id: rule.id,
      rule_name_snapshot: rule.name,
      metric_value: value,
      baseline,
      message,
      destinations: rule.channel_codes,
      success: false,
      error_message: errMsg,
      dim_context: rule.dim_filter,
    })
    return { triggered: true, value, baseline, contextLabel: `발송 실패: ${errMsg}`, dimContext: rule.dim_filter }
  }
}

// -------------------------------------------------------------
// 활성 룰 전체 평가 — cron 진입점에서 호출
// -------------------------------------------------------------
export async function evaluateAllActiveRules(): Promise<
  Array<{ ruleId: string; ruleName: string; result: EvalResult }>
> {
  const supabase = createAdminClient()
  const { data: rules, error } = await supabase
    .from('alert_rules')
    .select(
      'id, name, description, metric, dimension, dim_filter, comparison, threshold, comparison_basis, baseline_value, channel_codes, user_ids, cooldown_minutes, is_active',
    )
    .eq('is_active', true)

  if (error) {
    console.error('[evaluateAllActiveRules]', error)
    return []
  }

  const results: Array<{ ruleId: string; ruleName: string; result: EvalResult }> = []
  for (const r of rules ?? []) {
    const result = await evaluateAndDispatchRule(r as AlertRule)
    results.push({ ruleId: r.id, ruleName: r.name, result })
  }
  return results
}
