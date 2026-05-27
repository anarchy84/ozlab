// ─────────────────────────────────────────────
// 광고 퍼포먼스 대시보드 — 데이터 헬퍼 (서버 전용)
//
// 핵심 :
//   - ad_metrics (광고비) + consultations (리드) + revenue_records (전환매출)
//     3개를 channel_mapping 으로 정규화 후 JS 에서 조인
//
// 정규화 규칙 :
//   - consultations.utm_source + utm_medium → channel_mapping 매핑 → channel_code
//   - ad_metrics.channel → 이미 channel_code 형식 (시트에서 표준 코드로 넣는다는 전제)
// ─────────────────────────────────────────────

import { createAdminClient } from '@/lib/supabase/admin'

// ─────────────────────────────────────────────
// 기간 preset → from/to (KST 기준)
// ─────────────────────────────────────────────
export type PeriodPreset = 'today' | 'week' | 'month' | 'last_month' | 'last_3m' | ''

export interface PeriodRange {
  from: string  // YYYY-MM-DD
  to: string    // YYYY-MM-DD
  label: string
}

function kstDate(): Date {
  // KST = UTC+9
  const now = new Date()
  return new Date(now.getTime() + 9 * 60 * 60 * 1000)
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function resolvePeriod(preset: PeriodPreset): PeriodRange {
  const today = kstDate()
  const todayStr = ymd(today)

  switch (preset) {
    case 'today':
      return { from: todayStr, to: todayStr, label: '오늘' }
    case 'week': {
      const start = new Date(today)
      start.setUTCDate(start.getUTCDate() - 6)
      return { from: ymd(start), to: todayStr, label: '최근 7일' }
    }
    case 'month': {
      const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))
      return { from: ymd(start), to: todayStr, label: '이번 달' }
    }
    case 'last_month': {
      const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1))
      const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0))
      return { from: ymd(start), to: ymd(end), label: '지난 달' }
    }
    case 'last_3m': {
      const start = new Date(today)
      start.setUTCMonth(start.getUTCMonth() - 3)
      return { from: ymd(start), to: todayStr, label: '최근 3개월' }
    }
    default:
      // 전체 — 2020 부터 today
      return { from: '2020-01-01', to: todayStr, label: '전체 기간' }
  }
}

// ─────────────────────────────────────────────
// 데이터 타입
// ─────────────────────────────────────────────
export interface ChannelMappingRow {
  utm_source: string
  utm_medium: string | null
  channel_code: string
  channel_label: string
  is_paid: boolean
}

export interface ChannelPerformanceRow {
  channel_code: string
  channel_label: string
  is_paid: boolean
  impressions: number
  clicks: number
  spend: number
  leads: number
  conversions: number
  revenue: number
  // 계산 지표
  ctr: number | null        // 클릭/노출 %
  cvr: number | null        // 전환/클릭 % (광고플랫폼 기준)
  cpl: number | null        // 광고비/리드
  cpa: number | null        // 광고비/전환
  roas: number | null       // 매출/광고비 %
  lead_cvr: number | null   // 전환/리드 % (영업단계 전환율)
}

export interface DailySeriesRow {
  date: string
  spend: number
  leads: number
  conversions: number
  revenue: number
}

export interface CampaignRow {
  channel_code: string
  channel_label: string
  utm_campaign: string
  leads: number
  conversions: number
  revenue: number
}

export interface PaidMediaSummary {
  totals: {
    impressions: number
    clicks: number
    ctr: number | null
    spend: number
    leads: number
    cpl: number | null
    conversions: number
    cpa: number | null
    revenue: number
    roas: number | null
  }
  byChannel: ChannelPerformanceRow[]
  dailySeries: DailySeriesRow[]
  byCampaign: CampaignRow[]
  range: PeriodRange
  // 진단용
  unmappedLeadKeys: string[]  // channel_mapping 에 없는 utm 조합
}

// ─────────────────────────────────────────────
// 메인 fetch 함수
// ─────────────────────────────────────────────
export async function loadPaidMediaSummary(preset: PeriodPreset): Promise<PaidMediaSummary> {
  const range = resolvePeriod(preset)
  const admin = createAdminClient()

  // 1) channel_mapping 전체 (utm 정규화용 lookup)
  const { data: mappingRows } = await admin
    .from('channel_mapping')
    .select('utm_source, utm_medium, channel_code, channel_label, is_paid')
    .eq('is_active', true)

  const mapping: ChannelMappingRow[] = (mappingRows ?? []) as ChannelMappingRow[]

  // utm_source+utm_medium → mapping 빠른 lookup
  const mappingByKey = new Map<string, ChannelMappingRow>()
  for (const m of mapping) {
    const key = makeKey(m.utm_source, m.utm_medium ?? '')
    mappingByKey.set(key, m)
  }
  // channel_code → label/is_paid 빠른 lookup
  const channelInfoByCode = new Map<string, { label: string; is_paid: boolean }>()
  for (const m of mapping) {
    if (!channelInfoByCode.has(m.channel_code)) {
      channelInfoByCode.set(m.channel_code, { label: m.channel_label, is_paid: m.is_paid })
    }
  }

  // 2) ad_metrics — 기간 내 광고비/노출/클릭/전환(광고플랫폼 기준)
  const { data: adRows } = await admin
    .from('ad_metrics')
    .select('date, channel, impressions, clicks, conversions, spend')
    .gte('date', range.from)
    .lte('date', range.to)

  // 3) consultations — 기간 내 리드 (utm 정규화 후 channel_code 매핑)
  const { data: consRows } = await admin
    .from('consultations')
    .select('id, created_at, utm_source, utm_medium, utm_campaign')
    .gte('created_at', `${range.from}T00:00:00`)
    .lte('created_at', `${range.to}T23:59:59`)

  // 4) revenue_records — 기간 내 매출 + consultation 의 utm 조회
  const { data: revRows } = await admin
    .from('revenue_records')
    .select('id, consultation_id, amount, recognized_at')
    .gte('recognized_at', range.from)
    .lte('recognized_at', range.to)

  // revenue 의 consultation utm 추가 fetch (별도 IN 쿼리)
  const revConsultationIds = Array.from(
    new Set((revRows ?? []).map((r) => r.consultation_id).filter(Boolean))
  )
  let revUtmByConsId = new Map<string, { utm_source: string | null; utm_medium: string | null; utm_campaign: string | null }>()
  if (revConsultationIds.length > 0) {
    const { data: revCons } = await admin
      .from('consultations')
      .select('id, utm_source, utm_medium, utm_campaign')
      .in('id', revConsultationIds as string[])
    revUtmByConsId = new Map(
      (revCons ?? []).map((c) => [
        c.id as string,
        {
          utm_source: c.utm_source as string | null,
          utm_medium: c.utm_medium as string | null,
          utm_campaign: c.utm_campaign as string | null,
        },
      ])
    )
  }

  // ─────────────────────────────────────────────
  // 집계 — JS 조인
  // ─────────────────────────────────────────────

  // 미매핑 utm 조합 추적 (진단용)
  const unmappedSet = new Set<string>()

  // channel_code 기준 집계 컨테이너
  const byCode = new Map<string, ChannelPerformanceRow>()
  const ensureCode = (code: string): ChannelPerformanceRow => {
    let row = byCode.get(code)
    if (!row) {
      const info = channelInfoByCode.get(code)
      row = {
        channel_code: code,
        channel_label: info?.label ?? code,
        is_paid: info?.is_paid ?? true,
        impressions: 0,
        clicks: 0,
        spend: 0,
        leads: 0,
        conversions: 0,
        revenue: 0,
        ctr: null,
        cvr: null,
        cpl: null,
        cpa: null,
        roas: null,
        lead_cvr: null,
      }
      byCode.set(code, row)
    }
    return row
  }

  // ad_metrics → channel_code 기준 (시트가 channel_code 표준으로 채워졌다는 전제)
  for (const r of adRows ?? []) {
    const code = (r.channel as string) || 'unknown'
    const row = ensureCode(code)
    row.impressions += Number(r.impressions ?? 0)
    row.clicks += Number(r.clicks ?? 0)
    row.spend += Number(r.spend ?? 0)
    // ad_metrics.conversions 는 광고플랫폼 기준 전환 — 별도 추적 (우리 분석은 revenue_records 기준이 더 정확)
  }

  // consultations → utm 정규화 → channel_code 카운트
  for (const c of consRows ?? []) {
    const src = ((c.utm_source as string | null) ?? '').trim()
    const med = ((c.utm_medium as string | null) ?? '').trim()
    const key = makeKey(src, med)
    const matched = mappingByKey.get(key) ?? mappingByKey.get(makeKey(src, ''))
    const code = matched?.channel_code ?? 'unmapped'
    if (!matched) {
      unmappedSet.add(`${src || '(none)'}/${med || '(none)'}`)
    }
    const row = ensureCode(code)
    row.leads += 1
  }

  // revenue → utm 정규화 → channel_code 매출/전환 카운트
  const byDate = new Map<string, DailySeriesRow>()
  const ensureDate = (d: string): DailySeriesRow => {
    let row = byDate.get(d)
    if (!row) {
      row = { date: d, spend: 0, leads: 0, conversions: 0, revenue: 0 }
      byDate.set(d, row)
    }
    return row
  }

  for (const r of revRows ?? []) {
    const cons = revUtmByConsId.get(r.consultation_id as string)
    const src = (cons?.utm_source ?? '').trim()
    const med = (cons?.utm_medium ?? '').trim()
    const key = makeKey(src, med)
    const matched = mappingByKey.get(key) ?? mappingByKey.get(makeKey(src, ''))
    const code = matched?.channel_code ?? 'unmapped'
    const row = ensureCode(code)
    row.conversions += 1
    row.revenue += Number(r.amount ?? 0)

    // 일별 시계열 — 매출 + 전환
    const dRow = ensureDate(r.recognized_at as string)
    dRow.conversions += 1
    dRow.revenue += Number(r.amount ?? 0)
  }

  // 일별 — 광고비
  for (const r of adRows ?? []) {
    const dRow = ensureDate(r.date as string)
    dRow.spend += Number(r.spend ?? 0)
  }
  // 일별 — 리드
  for (const c of consRows ?? []) {
    const d = (c.created_at as string).slice(0, 10)
    const dRow = ensureDate(d)
    dRow.leads += 1
  }

  // 캠페인 드릴다운
  const byCampaign = new Map<string, CampaignRow>()
  for (const c of consRows ?? []) {
    const src = ((c.utm_source as string | null) ?? '').trim()
    const med = ((c.utm_medium as string | null) ?? '').trim()
    const camp = ((c.utm_campaign as string | null) ?? '').trim() || '(no campaign)'
    const key = makeKey(src, med)
    const matched = mappingByKey.get(key) ?? mappingByKey.get(makeKey(src, ''))
    const code = matched?.channel_code ?? 'unmapped'
    const label = matched?.channel_label ?? code
    const campKey = `${code}|${camp}`
    let row = byCampaign.get(campKey)
    if (!row) {
      row = {
        channel_code: code,
        channel_label: label,
        utm_campaign: camp,
        leads: 0,
        conversions: 0,
        revenue: 0,
      }
      byCampaign.set(campKey, row)
    }
    row.leads += 1
  }
  // 캠페인별 전환/매출
  for (const r of revRows ?? []) {
    const cons = revUtmByConsId.get(r.consultation_id as string)
    const src = (cons?.utm_source ?? '').trim()
    const med = (cons?.utm_medium ?? '').trim()
    const camp = (cons?.utm_campaign ?? '').trim() || '(no campaign)'
    const key = makeKey(src, med)
    const matched = mappingByKey.get(key) ?? mappingByKey.get(makeKey(src, ''))
    const code = matched?.channel_code ?? 'unmapped'
    const campKey = `${code}|${camp}`
    const row = byCampaign.get(campKey)
    if (row) {
      row.conversions += 1
      row.revenue += Number(r.amount ?? 0)
    }
  }

  // ─────────────────────────────────────────────
  // 지표 계산 — 매체별
  // ─────────────────────────────────────────────
  for (const row of byCode.values()) {
    row.ctr      = row.impressions > 0 ? (row.clicks / row.impressions) * 100 : null
    row.cvr      = row.clicks      > 0 ? (row.conversions / row.clicks) * 100 : null
    row.cpl      = row.leads       > 0 ? row.spend / row.leads : null
    row.cpa      = row.conversions > 0 ? row.spend / row.conversions : null
    row.roas     = row.spend       > 0 ? (row.revenue / row.spend) * 100 : null
    row.lead_cvr = row.leads       > 0 ? (row.conversions / row.leads) * 100 : null
  }

  // 총합
  const totals = {
    impressions: 0,
    clicks: 0,
    ctr: null as number | null,
    spend: 0,
    leads: 0,
    cpl: null as number | null,
    conversions: 0,
    cpa: null as number | null,
    revenue: 0,
    roas: null as number | null,
  }
  // 총합은 페이드 미디어 채널만 (organic/direct/site 제외) — 진짜 광고 성과만 측정
  for (const row of byCode.values()) {
    if (!row.is_paid) continue
    totals.impressions += row.impressions
    totals.clicks += row.clicks
    totals.spend += row.spend
    totals.leads += row.leads
    totals.conversions += row.conversions
    totals.revenue += row.revenue
  }
  totals.ctr  = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : null
  totals.cpl  = totals.leads > 0 ? totals.spend / totals.leads : null
  totals.cpa  = totals.conversions > 0 ? totals.spend / totals.conversions : null
  totals.roas = totals.spend > 0 ? (totals.revenue / totals.spend) * 100 : null

  // 정렬
  const byChannel = Array.from(byCode.values()).sort((a, b) => {
    // 페이드 우선 + 광고비 내림차순
    if (a.is_paid !== b.is_paid) return a.is_paid ? -1 : 1
    return b.spend - a.spend
  })

  const dailySeries = Array.from(byDate.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  )

  const byCampaignSorted = Array.from(byCampaign.values())
    .filter((r) => r.leads > 0 || r.conversions > 0)
    .sort((a, b) => b.leads - a.leads)
    .slice(0, 50)

  return {
    totals,
    byChannel,
    dailySeries,
    byCampaign: byCampaignSorted,
    range,
    unmappedLeadKeys: Array.from(unmappedSet),
  }
}

function makeKey(source: string, medium: string): string {
  return `${(source ?? '').toLowerCase().trim()}|${(medium ?? '').toLowerCase().trim()}`
}

// ─────────────────────────────────────────────
// 포맷 헬퍼 (서버/클라이언트 공용)
// ─────────────────────────────────────────────
export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('ko-KR')
}

export function fmtMoney(n: number): string {
  return Math.round(n).toLocaleString('ko-KR') + '원'
}

export function fmtPercent(n: number | null, digits = 1): string {
  if (n === null) return '-'
  return n.toFixed(digits) + '%'
}

export function fmtCpl(n: number | null): string {
  if (n === null) return '-'
  return Math.round(n).toLocaleString('ko-KR') + '원'
}
