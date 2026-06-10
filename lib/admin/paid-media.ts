// ─────────────────────────────────────────────
// 트래픽·광고 퍼포먼스 대시보드 — 데이터 헬퍼 (서버 전용)
//
// 핵심 :
//   - site_visits (방문) + ad_metrics (광고비) + consultations (리드) +
//     revenue_records (전환매출)을 channel_mapping 으로 정규화 후 JS 에서 조인
//
// 정규화 규칙 :
//   - consultations.utm_source + utm_medium → channel_mapping 매핑 → channel_code
//   - ad_metrics.channel → 이미 channel_code 형식 (시트에서 표준 코드로 넣는다는 전제)
//   - 중단된 외부 매입형 소스는 이 리포트 모델에서 제외
// ─────────────────────────────────────────────

import { createAdminClient } from '@/lib/supabase/admin'
import { loadSiteTrafficSummary } from '@/lib/admin/site-traffic'

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

export type TrafficGroup = 'paid' | 'organic' | 'direct' | 'referral' | 'site' | 'other'

export interface TrafficTotalBucket {
  pageviews: number
  visits: number
  visitors: number
  leads: number
  conversions: number
  revenue: number
}

export interface ChannelPerformanceRow {
  channel_code: string
  channel_label: string
  is_paid: boolean
  traffic_group: TrafficGroup
  impressions: number
  clicks: number
  pageviews: number
  visits: number
  visitors: number
  spend: number
  // 리드 — 2개 source 분리
  ad_leads: number          // 광고 플랫폼 보고 리드 (ad_metrics.conversions, 시트 '전환수')
  leads: number             // CRM 도착 리드 (consultations utm 매칭)
  conversions: number       // CRM 개통 (revenue_records 매칭)
  revenue: number
  // 계산 지표
  ctr: number | null        // 클릭/노출 %
  cvr: number | null        // 전환/클릭 % (광고플랫폼 기준)
  click_to_visit_rate: number | null // 실제 방문 세션 / 광고 클릭 %
  visit_to_lead_rate: number | null  // CRM 리드 / 실제 방문 세션 %
  ad_cpl: number | null     // 광고비 / 광고 리드 (광고 측 기준)
  cpl: number | null        // 광고비 / CRM 리드 (CRM 측 기준)
  cpa: number | null        // 광고비 / 개통
  roas: number | null       // 매출 / 광고비 %
  lead_cvr: number | null   // 개통 / CRM 리드 % (영업단계 전환율)
}

export interface DailySeriesRow {
  date: string
  spend: number                // 페이드미디어 광고비 only
  pageviews: number            // 실제 페이지뷰
  visits: number               // 실제 방문 세션
  visitors: number             // 고유 방문자
  ad_leads: number          // 광고 측 리드 (ad_metrics.conversions)
  leads: number             // CRM 측 리드
  conversions: number
  revenue: number
}

export interface CampaignRow {
  channel_code: string
  channel_label: string
  utm_campaign: string
  leads: number             // CRM 측 (utm_campaign 기준)
  conversions: number
  revenue: number
}
// 캠페인 단위는 utm 기반이므로 ad_leads 분리 적용 안 함 (시트의 캠페인 raw 는 ad_metrics 에 저장 안 됨)

export interface PaidMediaSummary {
  trafficTotals: TrafficTotalBucket & {
    paid: TrafficTotalBucket
    organic: TrafficTotalBucket
    direct: TrafficTotalBucket
    referral: TrafficTotalBucket
    site: TrafficTotalBucket
    other: TrafficTotalBucket
  }
  totals: {
    impressions: number
    clicks: number
    pageviews: number
    visits: number
    visitors: number
    ctr: number | null
    click_to_visit_rate: number | null
    visit_to_lead_rate: number | null
    spend: number
    ad_leads: number         // 광고 측 리드 합계
    leads: number            // CRM 측 리드 합계
    ad_cpl: number | null    // 광고비/광고 리드
    cpl: number | null       // 광고비/CRM 리드
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
  const trafficSummaryPromise = loadSiteTrafficSummary(range)

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

  // 2) ad_metrics — 기간 내 페이드 미디어 행.
  // 중단된 외부 매입형 source 로 남아 있는 과거 행은 집계에서 제외한다.
  const { data: adRows } = await admin
    .from('ad_metrics')
    .select('date, channel, impressions, clicks, conversions, spend, lead_qty, source')
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
  const trafficSummary = await trafficSummaryPromise

  // channel_code 기준 집계 컨테이너
  const byCode = new Map<string, ChannelPerformanceRow>()
  const ensureCode = (code: string): ChannelPerformanceRow => {
    let row = byCode.get(code)
    if (!row) {
      const info = channelInfoByCode.get(code)
      row = {
        channel_code: code,
        channel_label: info?.label ?? code,
        is_paid: info?.is_paid ?? false,
        traffic_group: trafficGroupFor(code, info?.is_paid ?? false),
        impressions: 0,
        clicks: 0,
        pageviews: 0,
        visits: 0,
        visitors: 0,
        spend: 0,
        ad_leads: 0,
        leads: 0,
        conversions: 0,
        revenue: 0,
        ctr: null,
        cvr: null,
        click_to_visit_rate: null,
        visit_to_lead_rate: null,
        ad_cpl: null,
        cpl: null,
        cpa: null,
        roas: null,
        lead_cvr: null,
      }
      byCode.set(code, row)
    }
    return row
  }

  // ad_metrics → 페이드 미디어 광고비/광고 측 리드만 합산
  for (const r of adRows ?? []) {
    const code = (r.channel as string) || 'unknown'
    const src = (r.source as string | null) ?? ''
    if (src === 'db_purchase' || src === 'retired_db_purchase') {
      continue
    }

    const row = ensureCode(code)
    row.is_paid = true
    row.traffic_group = 'paid'
    row.impressions += Number(r.impressions ?? 0)
    row.clicks += Number(r.clicks ?? 0)
    row.spend += Number(r.spend ?? 0)
    // ad_metrics.conversions = 광고 플랫폼이 보고한 결과 수 = 광고 측 리드
    // CRM 측 도착 리드는 consultations utm 매칭으로 별도 카운트 (row.leads)
    row.ad_leads += Number(r.conversions ?? 0)
  }

  // consultations → utm 정규화 → channel_code 카운트
  for (const c of consRows ?? []) {
    const src = ((c.utm_source as string | null) ?? '').trim()
    const med = ((c.utm_medium as string | null) ?? '').trim()
    const matched = resolveMappedChannel(mappingByKey, src, med)
    const code = matched?.channel_code ?? 'unmapped'
    if (!matched) {
      unmappedSet.add(`${src || '(none)'}/${med || '(none)'}`)
    }
    const row = ensureCode(code)
    row.leads += 1
  }

  // site_visits → 실제 도착 방문자/세션/페이지뷰
  for (const t of trafficSummary.byChannel) {
    const row = ensureCode(t.channel_code)
    row.channel_label = t.channel_label
    row.is_paid = t.is_paid
    row.traffic_group = trafficGroupFor(t.channel_code, t.is_paid)
    row.pageviews += t.pageviews
    row.visits += t.visits
    row.visitors += t.visitors
  }

  // revenue → utm 정규화 → channel_code 매출/전환 카운트
  const byDate = new Map<string, DailySeriesRow>()
  const ensureDate = (d: string): DailySeriesRow => {
    let row = byDate.get(d)
    if (!row) {
      row = {
        date: d,
        spend: 0,
        pageviews: 0,
        visits: 0,
        visitors: 0,
        ad_leads: 0,
        leads: 0,
        conversions: 0,
        revenue: 0,
      }
      byDate.set(d, row)
    }
    return row
  }

  for (const r of revRows ?? []) {
    const cons = revUtmByConsId.get(r.consultation_id as string)
    const src = (cons?.utm_source ?? '').trim()
    const med = (cons?.utm_medium ?? '').trim()
    const matched = resolveMappedChannel(mappingByKey, src, med)
    const code = matched?.channel_code ?? 'unmapped'
    const row = ensureCode(code)
    row.conversions += 1
    row.revenue += Number(r.amount ?? 0)

    // 일별 시계열 — 매출 + 전환
    const dRow = ensureDate(r.recognized_at as string)
    dRow.conversions += 1
    dRow.revenue += Number(r.amount ?? 0)
  }

  // 일별 — 페이드 광고비/광고측 리드
  for (const r of adRows ?? []) {
    const dRow = ensureDate(r.date as string)
    const src = (r.source as string | null) ?? ''
    if (src === 'db_purchase' || src === 'retired_db_purchase') {
      continue
    }
    dRow.spend += Number(r.spend ?? 0)
    dRow.ad_leads += Number(r.conversions ?? 0)
  }
  // 일별 — CRM 도착 리드
  for (const c of consRows ?? []) {
    const d = (c.created_at as string).slice(0, 10)
    const dRow = ensureDate(d)
    dRow.leads += 1
  }
  // 일별 — 실제 방문
  for (const t of trafficSummary.dailySeries) {
    const dRow = ensureDate(t.date)
    dRow.pageviews += t.pageviews
    dRow.visits += t.visits
    dRow.visitors += t.visitors
  }

  // 캠페인 드릴다운
  const byCampaign = new Map<string, CampaignRow>()
  for (const c of consRows ?? []) {
    const src = ((c.utm_source as string | null) ?? '').trim()
    const med = ((c.utm_medium as string | null) ?? '').trim()
    const camp = ((c.utm_campaign as string | null) ?? '').trim() || '(no campaign)'
    const matched = resolveMappedChannel(mappingByKey, src, med)
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
    const matched = resolveMappedChannel(mappingByKey, src, med)
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
    row.click_to_visit_rate = row.clicks > 0 ? (row.visits / row.clicks) * 100 : null
    row.visit_to_lead_rate  = row.visits > 0 ? (row.leads / row.visits) * 100 : null
    row.ad_cpl   = row.ad_leads    > 0 ? row.spend / row.ad_leads : null
    row.cpl      = row.leads       > 0 ? row.spend / row.leads : null
    row.cpa      = row.conversions > 0 ? row.spend / row.conversions : null
    row.roas     = row.spend       > 0 ? (row.revenue / row.spend) * 100 : null
    row.lead_cvr = row.leads       > 0 ? (row.conversions / row.leads) * 100 : null
  }

  // 트래픽 총합 — 오가닉/페이드/직접/추천/자체사이트 기준
  const trafficTotals = createTrafficTotals()
  for (const row of byCode.values()) {
    addTrafficBucket(trafficTotals, row)
  }

  // 페이드 미디어 총합
  const totals = {
    impressions: 0,
    clicks: 0,
    pageviews: 0,
    visits: 0,
    visitors: 0,
    ctr: null as number | null,
    click_to_visit_rate: null as number | null,
    visit_to_lead_rate: null as number | null,
    spend: 0,
    ad_leads: 0,
    leads: 0,
    ad_cpl: null as number | null,
    cpl: null as number | null,
    conversions: 0,
    cpa: null as number | null,
    revenue: 0,
    roas: null as number | null,
  }
  // totals 는 페이드 미디어 채널만 (organic/direct/site 제외) — 진짜 광고 성과만 측정
  for (const row of byCode.values()) {
    if (!row.is_paid) continue
    totals.impressions += row.impressions
    totals.clicks += row.clicks
    totals.pageviews += row.pageviews
    totals.visits += row.visits
    totals.visitors += row.visitors
    totals.spend += row.spend
    totals.ad_leads += row.ad_leads
    totals.leads += row.leads
    totals.conversions += row.conversions
    totals.revenue += row.revenue
  }
  totals.ctr    = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : null
  totals.click_to_visit_rate = totals.clicks > 0 ? (totals.visits / totals.clicks) * 100 : null
  totals.visit_to_lead_rate  = totals.visits > 0 ? (totals.leads / totals.visits) * 100 : null
  totals.ad_cpl = totals.ad_leads > 0 ? totals.spend / totals.ad_leads : null
  totals.cpl    = totals.leads > 0 ? totals.spend / totals.leads : null
  totals.cpa    = totals.conversions > 0 ? totals.spend / totals.conversions : null
  totals.roas   = totals.spend > 0 ? (totals.revenue / totals.spend) * 100 : null

  // 정렬
  const byChannel = Array.from(byCode.values()).sort((a, b) => {
    // 페이드 우선 + 방문/광고비 내림차순
    if (a.is_paid !== b.is_paid) return a.is_paid ? -1 : 1
    return b.spend - a.spend || b.visits - a.visits
  })

  const dailySeries = Array.from(byDate.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  )

  const byCampaignSorted = Array.from(byCampaign.values())
    .filter((r) => r.leads > 0 || r.conversions > 0)
    .sort((a, b) => b.leads - a.leads)
    .slice(0, 50)

  return {
    trafficTotals,
    totals,
    byChannel,
    dailySeries,
    byCampaign: byCampaignSorted,
    range,
    unmappedLeadKeys: Array.from(unmappedSet),
  }
}

function emptyTrafficBucket(): TrafficTotalBucket {
  return {
    pageviews: 0,
    visits: 0,
    visitors: 0,
    leads: 0,
    conversions: 0,
    revenue: 0,
  }
}

function createTrafficTotals(): PaidMediaSummary['trafficTotals'] {
  return {
    ...emptyTrafficBucket(),
    paid: emptyTrafficBucket(),
    organic: emptyTrafficBucket(),
    direct: emptyTrafficBucket(),
    referral: emptyTrafficBucket(),
    site: emptyTrafficBucket(),
    other: emptyTrafficBucket(),
  }
}

function addTrafficBucket(
  totals: PaidMediaSummary['trafficTotals'],
  row: ChannelPerformanceRow,
): void {
  totals.pageviews += row.pageviews
  totals.visits += row.visits
  totals.visitors += row.visitors
  totals.leads += row.leads
  totals.conversions += row.conversions
  totals.revenue += row.revenue

  const bucket = totals[row.traffic_group]
  bucket.pageviews += row.pageviews
  bucket.visits += row.visits
  bucket.visitors += row.visitors
  bucket.leads += row.leads
  bucket.conversions += row.conversions
  bucket.revenue += row.revenue
}

function trafficGroupFor(code: string, isPaid: boolean): TrafficGroup {
  const value = code.toLowerCase()
  if (isPaid) return 'paid'
  if (value === 'direct') return 'direct'
  if (value === 'site' || value === 'owned' || value.includes('cta') || value.includes('internal')) {
    return 'site'
  }
  if (value.includes('organic') || value.endsWith('-search') || value.includes('natural')) {
    return 'organic'
  }
  if (value.includes('referral') || value.includes('blog') || value.includes('social')) {
    return 'referral'
  }
  return 'other'
}

function makeKey(source: string, medium: string): string {
  return `${(source ?? '').toLowerCase().trim()}|${(medium ?? '').toLowerCase().trim()}`
}

function resolveMappedChannel(
  mappingByKey: Map<string, ChannelMappingRow>,
  source: string,
  medium: string,
): ChannelMappingRow | undefined {
  const src = (source ?? '').trim()
  const med = (medium ?? '').trim()

  // UTM 이 둘 다 비어 있으면 실제 의미는 직접 유입이다.
  // channel_mapping 에는 빈 source 를 저장할 수 없으므로 direct seed 로 치환한다.
  if (!src && !med) return mappingByKey.get(makeKey('direct', ''))

  return mappingByKey.get(makeKey(src, med)) ?? mappingByKey.get(makeKey(src, ''))
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
