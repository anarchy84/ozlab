import { createAdminClient } from '@/lib/supabase/admin'

export interface TrafficRange {
  from: string
  to: string
}

export interface TrafficBucketRow {
  key: string
  label: string
  pageviews: number
  visits: number
  visitors: number
}

export interface TrafficChannelRow extends TrafficBucketRow {
  channel_code: string
  channel_label: string
  is_paid: boolean
}

export interface TrafficDailyRow {
  date: string
  pageviews: number
  visits: number
  visitors: number
}

export interface SiteTrafficSummary {
  totals: {
    pageviews: number
    visits: number
    visitors: number
    ips: number
  }
  byChannel: TrafficChannelRow[]
  byCampaign: TrafficBucketRow[]
  byRegion: TrafficBucketRow[]
  byIp: TrafficBucketRow[]
  byDevice: TrafficBucketRow[]
  byBrowser: TrafficBucketRow[]
  byOs: TrafficBucketRow[]
  byLanguage: TrafficBucketRow[]
  dailySeries: TrafficDailyRow[]
}

interface ChannelMappingRow {
  utm_source: string
  utm_medium: string | null
  channel_code: string
  channel_label: string
  is_paid: boolean
}

interface SiteVisitRow {
  occurred_at: string
  visitor_id: string
  session_id: string
  page_path: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  inferred_channel: string | null
  ip_address: string | null
  ip_hash: string | null
  country_code: string | null
  country_name: string | null
  region: string | null
  city: string | null
  device_type: string | null
  browser_family: string | null
  os_family: string | null
  language: string | null
}

export async function loadSiteTrafficSummary(range: TrafficRange): Promise<SiteTrafficSummary> {
  const admin = createAdminClient()

  const [{ data: mappingRows }, { data: visitRows, error }] = await Promise.all([
    admin
      .from('channel_mapping')
      .select('utm_source, utm_medium, channel_code, channel_label, is_paid')
      .eq('is_active', true),
    admin
      .from('site_visits')
      .select(
        `occurred_at, visitor_id, session_id, page_path,
         utm_source, utm_medium, utm_campaign, inferred_channel,
         ip_address, ip_hash, country_code, country_name, region, city,
         device_type, browser_family, os_family, language`,
      )
      .gte('occurred_at', `${range.from}T00:00:00`)
      .lte('occurred_at', `${range.to}T23:59:59`)
      .order('occurred_at', { ascending: true })
      .limit(50000),
  ])

  if (error) {
    // site_visits 마이그레이션 적용 전에도 기존 대시보드가 죽지 않게 빈 값 반환.
    console.error('[site_traffic] load failed', error)
    return emptyTrafficSummary(range)
  }

  const mappings = (mappingRows ?? []) as ChannelMappingRow[]
  const visits = (visitRows ?? []) as SiteVisitRow[]
  const mappingByKey = new Map<string, ChannelMappingRow>()
  const infoByCode = new Map<string, { label: string; is_paid: boolean }>()
  for (const row of mappings) {
    mappingByKey.set(makeKey(row.utm_source, row.utm_medium ?? ''), row)
    if (!infoByCode.has(row.channel_code)) {
      infoByCode.set(row.channel_code, {
        label: row.channel_label,
        is_paid: row.is_paid,
      })
    }
  }

  const totals = {
    pageviews: visits.length,
    visits: new Set(visits.map((row) => row.session_id)).size,
    visitors: new Set(visits.map((row) => row.visitor_id)).size,
    ips: new Set(visits.map((row) => row.ip_hash).filter(Boolean)).size,
  }

  const byChannelMap = new Map<string, MutableTrafficChannel>()
  const byCampaignMap = new Map<string, MutableTrafficBucket>()
  const byRegionMap = new Map<string, MutableTrafficBucket>()
  const byIpMap = new Map<string, MutableTrafficBucket>()
  const byDeviceMap = new Map<string, MutableTrafficBucket>()
  const byBrowserMap = new Map<string, MutableTrafficBucket>()
  const byOsMap = new Map<string, MutableTrafficBucket>()
  const byLanguageMap = new Map<string, MutableTrafficBucket>()
  const byDateMap = new Map<string, MutableTrafficBucket>()

  for (const row of visits) {
    const channel = resolveVisitChannel(row, mappingByKey, infoByCode)
    addChannel(byChannelMap, channel.channel_code, channel.channel_label, channel.is_paid, row)
    addBucket(byCampaignMap, row.utm_campaign?.trim() || '(no campaign)', row)
    addBucket(byRegionMap, formatRegion(row), row)
    addBucket(byIpMap, formatIp(row), row)
    addBucket(byDeviceMap, normalizeLabel(row.device_type, '알 수 없음'), row)
    addBucket(byBrowserMap, normalizeLabel(row.browser_family, '알 수 없음'), row)
    addBucket(byOsMap, normalizeLabel(row.os_family, '알 수 없음'), row)
    addBucket(byLanguageMap, normalizeLabel(row.language, '알 수 없음'), row)
    addBucket(byDateMap, row.occurred_at.slice(0, 10), row)
  }

  return {
    totals,
    byChannel: Array.from(byChannelMap.values()).map(finalizeChannel).sort(sortTrafficRows),
    byCampaign: topBuckets(byCampaignMap, 30),
    byRegion: topBuckets(byRegionMap, 12),
    byIp: topBuckets(byIpMap, 15),
    byDevice: topBuckets(byDeviceMap, 8),
    byBrowser: topBuckets(byBrowserMap, 8),
    byOs: topBuckets(byOsMap, 8),
    byLanguage: topBuckets(byLanguageMap, 8),
    dailySeries: Array.from(byDateMap.values())
      .map((row) => ({
        date: row.key,
        pageviews: row.pageviews,
        visits: row.sessions.size,
        visitors: row.visitors.size,
      }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  }
}

function emptyTrafficSummary(range: TrafficRange): SiteTrafficSummary {
  return {
    totals: { pageviews: 0, visits: 0, visitors: 0, ips: 0 },
    byChannel: [],
    byCampaign: [],
    byRegion: [],
    byIp: [],
    byDevice: [],
    byBrowser: [],
    byOs: [],
    byLanguage: [],
    dailySeries: datesBetween(range.from, range.to).map((date) => ({
      date,
      pageviews: 0,
      visits: 0,
      visitors: 0,
    })),
  }
}

interface MutableTrafficBucket {
  key: string
  label: string
  pageviews: number
  sessions: Set<string>
  visitors: Set<string>
}

interface MutableTrafficChannel extends MutableTrafficBucket {
  channel_code: string
  channel_label: string
  is_paid: boolean
}

function addBucket(map: Map<string, MutableTrafficBucket>, label: string, row: SiteVisitRow): void {
  const key = label || '알 수 없음'
  let bucket = map.get(key)
  if (!bucket) {
    bucket = {
      key,
      label: key,
      pageviews: 0,
      sessions: new Set(),
      visitors: new Set(),
    }
    map.set(key, bucket)
  }
  bucket.pageviews += 1
  bucket.sessions.add(row.session_id)
  bucket.visitors.add(row.visitor_id)
}

function addChannel(
  map: Map<string, MutableTrafficChannel>,
  code: string,
  label: string,
  isPaid: boolean,
  row: SiteVisitRow,
): void {
  let bucket = map.get(code)
  if (!bucket) {
    bucket = {
      key: code,
      label,
      channel_code: code,
      channel_label: label,
      is_paid: isPaid,
      pageviews: 0,
      sessions: new Set(),
      visitors: new Set(),
    }
    map.set(code, bucket)
  }
  bucket.pageviews += 1
  bucket.sessions.add(row.session_id)
  bucket.visitors.add(row.visitor_id)
}

function finalizeBucket(row: MutableTrafficBucket): TrafficBucketRow {
  return {
    key: row.key,
    label: row.label,
    pageviews: row.pageviews,
    visits: row.sessions.size,
    visitors: row.visitors.size,
  }
}

function finalizeChannel(row: MutableTrafficChannel): TrafficChannelRow {
  return {
    ...finalizeBucket(row),
    channel_code: row.channel_code,
    channel_label: row.channel_label,
    is_paid: row.is_paid,
  }
}

function topBuckets(map: Map<string, MutableTrafficBucket>, limit: number): TrafficBucketRow[] {
  return Array.from(map.values()).map(finalizeBucket).sort(sortTrafficRows).slice(0, limit)
}

function sortTrafficRows(a: TrafficBucketRow, b: TrafficBucketRow): number {
  return b.visits - a.visits || b.visitors - a.visitors || b.pageviews - a.pageviews
}

function resolveVisitChannel(
  row: SiteVisitRow,
  mappingByKey: Map<string, ChannelMappingRow>,
  infoByCode: Map<string, { label: string; is_paid: boolean }>,
): { channel_code: string; channel_label: string; is_paid: boolean } {
  const src = row.utm_source?.trim() ?? ''
  const med = row.utm_medium?.trim() ?? ''
  const exact = mappingByKey.get(makeKey(src, med))
  const sourceOnly = mappingByKey.get(makeKey(src, ''))
  const mapped = exact ?? sourceOnly
  if (mapped) {
    return {
      channel_code: mapped.channel_code,
      channel_label: mapped.channel_label,
      is_paid: mapped.is_paid,
    }
  }

  const inferred = row.inferred_channel?.trim() || (!src && !med ? 'direct' : 'unmapped')
  if (!src && !med) {
    if (inferred === 'naver-search') {
      return { channel_code: 'naver-organic', channel_label: '네이버 자연유입', is_paid: false }
    }
    if (inferred === 'google-search') {
      return { channel_code: 'google-organic', channel_label: '구글 자연유입', is_paid: false }
    }
    if (inferred === 'daum-search') {
      return { channel_code: 'daum-search', channel_label: '다음 검색 유입', is_paid: false }
    }
    if (inferred === 'bing-search') {
      return { channel_code: 'bing-search', channel_label: '빙 검색 유입', is_paid: false }
    }
  }
  const info = infoByCode.get(inferred)
  return {
    channel_code: inferred,
    channel_label: info?.label ?? humanizeChannel(inferred),
    is_paid: info?.is_paid ?? isPaidLike(src, med, inferred),
  }
}

function makeKey(source: string, medium: string): string {
  return `${(source ?? '').toLowerCase().trim()}|${(medium ?? '').toLowerCase().trim()}`
}

function isPaidLike(source: string, medium: string, inferred: string): boolean {
  const value = `${source} ${medium} ${inferred}`.toLowerCase()
  return /ads|ad|cpc|paid|display|search-ads|powerlink|brand/.test(value)
}

function humanizeChannel(channel: string): string {
  const labels: Record<string, string> = {
    direct: '직접 유입',
    unmapped: '매핑 안 됨',
    internal: '내부 이동',
    'naver-search': '네이버 검색',
    'google-search': '구글 검색',
    'daum-search': '다음 검색',
    'bing-search': '빙 검색',
    'referral-blog': '블로그 유입',
    'referral-other': '외부 추천',
    'social-organic': '소셜 자연유입',
  }
  return labels[channel] ?? channel
}

function formatRegion(row: SiteVisitRow): string {
  const country = row.country_name || row.country_code || '알 수 없음'
  const parts = [country, row.region, row.city].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : '알 수 없음'
}

function formatIp(row: SiteVisitRow): string {
  const masked = maskIp(row.ip_address)
  const suffix = row.ip_hash ? row.ip_hash.slice(0, 8) : 'nohash'
  return `${masked} · ${suffix}`
}

function maskIp(ip: string | null): string {
  if (!ip) return '알 수 없음'
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
    const parts = ip.split('.')
    return `${parts[0]}.${parts[1]}.${parts[2]}.*`
  }
  if (ip.includes(':')) {
    return `${ip.split(':').slice(0, 3).join(':')}:*`
  }
  return ip
}

function normalizeLabel(value: string | null, fallback: string): string {
  const trimmed = value?.trim()
  return trimmed || fallback
}

function parseYmd(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function formatYmd(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function addDays(value: string, days: number): string {
  const date = parseYmd(value)
  date.setUTCDate(date.getUTCDate() + days)
  return formatYmd(date)
}

function datesBetween(from: string, to: string): string[] {
  const start = parseYmd(from)
  const end = parseYmd(to)
  const count = Math.max(Math.round((end.getTime() - start.getTime()) / 86400000) + 1, 1)
  return Array.from({ length: count }, (_, index) => addDays(from, index))
}
