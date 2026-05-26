// ─────────────────────────────────────────────
// /admin — 어드민 메인 대시보드 (Phase A 강화)
//
// 강화 :
//   · v_consultation_funnel 활용 → 상태별 KPI 카드 (자동 색상)
//   · v_consultation_by_channel 활용 → 매체별 전환율 표
//   · 최근 신청 5건 (status_id 색상 적용)
//   · 빠른 메뉴 (super_admin 만 사용자/상태 관리 표시)
// ─────────────────────────────────────────────
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireAdminProfile } from '@/lib/admin/auth-helpers'
import { isSuperAdmin } from '@/lib/admin/permissions'
import type {
  AdminRole,
  ConsultationFunnelRow,
  ConsultationByChannelRow,
  DbStatus,
} from '@/lib/admin/types'

export const dynamic = 'force-dynamic'

interface RecentRow {
  id: string
  name: string
  phone: string
  store_name: string | null
  status: string | null
  status_id: number | null
  created_at: string
  utm_source: string | null
}

interface AdminDashboardSearchParams {
  from?: string | string[]
  to?: string | string[]
  sort?: string | string[]
  compare?: string | string[]
}

interface RevenueRow {
  id: string
  consultation_id: string
  product_label: string | null
  amount: number | string | null
  gift_amount: number | string | null
  net_amount: number | string | null
  revenue_date: string
}

interface ConsultationOwnerRow {
  id: string
  counselor_id: string | null
}

interface AdminUserMini {
  user_id: string
  display_name: string | null
  role: AdminRole | null
  department: string | null
}

interface AdMetricRow {
  date: string
  spend: number | string | null
}

interface EnrichedRevenueRow {
  id: string
  consultation_id: string
  product_label: string
  amount: number
  net_amount: number
  revenue_date: string
  counselor_id: string | null
  counselor_name: string
}

type DashboardSortMode = 'revenue' | 'count' | 'name'

interface DashboardPeriod {
  from: string
  to: string
  previousFrom: string
  previousTo: string
  compare: boolean
  sort: DashboardSortMode
  isDefaultToday: boolean
}

interface RevenueSummary {
  revenueAmount: number | null
  previousRevenueAmount: number | null
  adSpendAmount: number | null
  previousAdSpendAmount: number | null
  unpaidAmount: number | null
  incentivePointAmount: number | null
  compare: boolean
}

interface ChartSeries {
  label: string
  color: string
  totalNet: number
  count: number
  points: number[]
}

export default async function AdminDashboardPage({
  searchParams = {},
}: {
  searchParams?: AdminDashboardSearchParams
}) {
  const profile = await requireAdminProfile()
  const supabase = createClient()
  const period = resolveDashboardPeriod(searchParams)

  // 병렬 쿼리 — 대시보드 기본 지표 + 기간별 매출/광고비
  const [
    funnelRes,
    channelRes,
    statusesRes,
    recentRes,
    totalRes,
    revenueRes,
    previousRevenueRes,
    adSpendRes,
    previousAdSpendRes,
  ] = await Promise.all([
    supabase.from('v_consultation_funnel').select('*'),
    supabase
      .from('v_consultation_by_channel')
      .select('*')
      .gte('day', period.from)
      .lte('day', period.to)
      .order('day', { ascending: false }),
    supabase.from('db_statuses').select('*').order('sort_order'),
    supabase
      .from('consultations')
      .select('id, name, phone, store_name, status, status_id, created_at, utm_source')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('consultations').select('id', { count: 'exact', head: true }),
    supabase
      .from('revenue_records')
      .select('id, consultation_id, product_label, amount, gift_amount, net_amount, revenue_date')
      .gte('revenue_date', period.from)
      .lte('revenue_date', period.to)
      .order('revenue_date', { ascending: true }),
    supabase
      .from('revenue_records')
      .select('id, consultation_id, product_label, amount, gift_amount, net_amount, revenue_date')
      .gte('revenue_date', period.previousFrom)
      .lte('revenue_date', period.previousTo)
      .order('revenue_date', { ascending: true }),
    supabase
      .from('ad_metrics')
      .select('date, spend')
      .gte('date', period.from)
      .lte('date', period.to),
    supabase
      .from('ad_metrics')
      .select('date, spend')
      .gte('date', period.previousFrom)
      .lte('date', period.previousTo),
  ])

  const funnel = (funnelRes.data as ConsultationFunnelRow[] | null) ?? []
  const channelRows =
    (channelRes.data as ConsultationByChannelRow[] | null) ?? []
  const statuses = (statusesRes.data as DbStatus[] | null) ?? []
  const recent = (recentRes.data as RecentRow[] | null) ?? []
  const total = totalRes.count ?? 0
  const revenueRows = (revenueRes.data as RevenueRow[] | null) ?? []
  const previousRevenueRows = (previousRevenueRes.data as RevenueRow[] | null) ?? []
  const ownerIds = Array.from(
    new Set([...revenueRows, ...previousRevenueRows].map((row) => row.consultation_id))
  )
  const [ownersRes, adminUsersRes] = await Promise.all([
    ownerIds.length > 0
      ? supabase.from('consultations').select('id, counselor_id').in('id', ownerIds)
      : Promise.resolve({ data: [] as ConsultationOwnerRow[] }),
    supabase
      .from('admin_users')
      .select('user_id, display_name, role, department')
      .in('role', ['counselor', 'tm_lead']),
  ])
  const ownerMap = new Map(
    ((ownersRes.data as ConsultationOwnerRow[] | null) ?? []).map((row) => [
      row.id,
      row.counselor_id,
    ])
  )
  const adminUserMap = new Map(
    ((adminUsersRes.data as AdminUserMini[] | null) ?? []).map((user) => [
      user.user_id,
      user,
    ])
  )
  const enrichedRevenueRows = enrichRevenueRows(revenueRows, ownerMap, adminUserMap)
  const enrichedPreviousRevenueRows = enrichRevenueRows(
    previousRevenueRows,
    ownerMap,
    adminUserMap
  )
  const visibleRevenueRows =
    profile.role === 'counselor'
      ? enrichedRevenueRows.filter((row) => row.counselor_id === profile.user_id)
      : enrichedRevenueRows
  const visiblePreviousRevenueRows =
    profile.role === 'counselor'
      ? enrichedPreviousRevenueRows.filter((row) => row.counselor_id === profile.user_id)
      : enrichedPreviousRevenueRows
  const adSpendRows = (adSpendRes.data as AdMetricRow[] | null) ?? []
  const previousAdSpendRows = (previousAdSpendRes.data as AdMetricRow[] | null) ?? []
  const dateLabels = datesBetween(period.from, period.to)
  const counselorSeries = buildRevenueSeries(
    visibleRevenueRows,
    dateLabels,
    'counselor',
    period.sort
  )
  const productSeries = buildRevenueSeries(
    visibleRevenueRows,
    dateLabels,
    'product',
    period.sort
  )
  const revenueSummary: RevenueSummary = {
    revenueAmount: sumBy(visibleRevenueRows, (row) => row.amount),
    previousRevenueAmount: sumBy(visiblePreviousRevenueRows, (row) => row.amount),
    adSpendAmount: profile.role === 'counselor' ? null : sumAdSpend(adSpendRows),
    previousAdSpendAmount:
      profile.role === 'counselor' ? null : sumAdSpend(previousAdSpendRows),
    unpaidAmount: null,
    incentivePointAmount: null,
    compare: period.compare,
  }

  // 매체별 집계 (선택 기간 누적) — channel별로 lead/conversion sum
  const channelAgg = new Map<
    string,
    { leads: number; conversions: number; unapproved: number }
  >()
  for (const r of channelRows) {
    const cur = channelAgg.get(r.channel) ?? {
      leads: 0,
      conversions: 0,
      unapproved: 0,
    }
    cur.leads += r.lead_count
    cur.conversions += r.conversion_count
    cur.unapproved += r.unapproved_count
    channelAgg.set(r.channel, cur)
  }
  const channelTable = Array.from(channelAgg.entries())
    .map(([ch, v]) => ({
      channel: ch,
      ...v,
      cvr: v.leads > 0 ? Math.round((v.conversions / v.leads) * 10000) / 100 : 0,
      junkRate:
        v.leads > 0 ? Math.round((v.unapproved / v.leads) * 10000) / 100 : 0,
    }))
    .sort((a, b) => b.leads - a.leads)

  // KPI 카드 (대시보드 노출 상태만)
  const dashFunnel = funnel.filter((f) => {
    const st = statuses.find((s) => s.code === f.status_code)
    return st?.show_in_dashboard ?? true
  })
  const orderedDashboardRows = dashFunnel
    .map((row, index) => ({ row, index, order: getDashboardStatusOrder(row) }))
    .sort((a, b) => a.order.group - b.order.group || a.order.rank - b.order.rank || a.index - b.index)
  const contactActionRows = orderedDashboardRows
    .filter((item) => item.order.group === 0)
    .map((item) => item.row)
  const pipelineRows = orderedDashboardRows
    .filter((item) => item.order.group === 1)
    .map((item) => item.row)
  const etcRows = orderedDashboardRows
    .filter((item) => item.order.group > 1)
    .map((item) => item.row)

  const statusMap = new Map<number, DbStatus>()
  for (const s of statuses) statusMap.set(s.id, s)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ink-100">대시보드</h1>
        <p className="text-sm text-ink-400 mt-1">
          상담 현황을 한눈에 확인하세요. 누적 {total.toLocaleString()}건.
        </p>
      </div>

      <DashboardPeriodFilter period={period} />

      <RoleRevenueOverview
        role={profile.role}
        displayName={profile.display_name ?? profile.email}
        summary={revenueSummary}
        period={period}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <PerformanceLineChart
          title={profile.role === 'counselor' ? '내 매출 추이' : '상담사별 실적'}
          subtitle="매출액 기준 상위 5명 · 일자별 매출 흐름"
          series={counselorSeries}
          dates={dateLabels}
          emptyText="선택한 기간에 상담사별 매출 데이터가 없습니다."
        />
        <PerformanceLineChart
          title="상품별 실적"
          subtitle="상품 기준 상위 5개 · 일자별 매출 흐름"
          series={productSeries}
          dates={dateLabels}
          emptyText="선택한 기간에 상품별 매출 데이터가 없습니다."
        />
      </div>

      {/* 상태별 KPI 카드 */}
      <div>
        <h2 className="text-sm font-semibold text-ink-200 mb-2">
          상태별 신청
          <span className="text-xs text-ink-500 font-normal ml-2">
            (상태 마스터 자동 동기화)
          </span>
        </h2>
        <div className="space-y-3">
          {contactActionRows.length > 0 && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              {contactActionRows.map((f) => <KpiCard key={f.status_code} row={f} />)}
            </div>
          )}
          {pipelineRows.length > 0 && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
              {pipelineRows.map((f) => <KpiCard key={f.status_code} row={f} />)}
            </div>
          )}
          {etcRows.length > 0 && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
              {etcRows.map((f) => <KpiCard key={f.status_code} row={f} />)}
            </div>
          )}
        </div>
      </div>

      {/* 매체별 전환율 표 (최근 30일) */}
      <div>
        <div className="flex items-end justify-between mb-2">
          <h2 className="text-sm font-semibold text-ink-200">
            매체별 성과 <span className="text-xs text-ink-500 font-normal">(최근 30일)</span>
          </h2>
          <span className="text-xs text-ink-500">
            전환·허수 = db_statuses 플래그 기준
          </span>
        </div>
        <div className="bg-surface-darkSoft border border-ink-700 rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-900 text-ink-400 text-xs">
              <tr>
                <th className="text-left px-4 py-2 font-semibold">매체</th>
                <th className="text-right px-4 py-2 font-semibold">신청</th>
                <th className="text-right px-4 py-2 font-semibold">전환</th>
                <th className="text-right px-4 py-2 font-semibold">전환율</th>
                <th className="text-right px-4 py-2 font-semibold">허수</th>
                <th className="text-right px-4 py-2 font-semibold">허수율</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700">
              {channelTable.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-ink-500 text-sm">
                    최근 30일 데이터 없음
                  </td>
                </tr>
              )}
              {channelTable.map((r) => (
                <tr key={r.channel} className="hover:bg-ink-800/40 transition-colors">
                  <td className="px-4 py-2 text-ink-200 font-medium">{r.channel}</td>
                  <td className="px-4 py-2 text-right text-ink-200">{r.leads}</td>
                  <td className="px-4 py-2 text-right text-brand-neon font-semibold">
                    {r.conversions}
                  </td>
                  <td className="px-4 py-2 text-right text-brand-neon">
                    {r.cvr.toFixed(2)}%
                  </td>
                  <td className="px-4 py-2 text-right text-ink-400">{r.unapproved}</td>
                  <td className="px-4 py-2 text-right text-ink-400">
                    {r.junkRate.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 최근 신청 5건 */}
      <div className="bg-surface-darkSoft border border-ink-700 rounded-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-700">
          <h2 className="font-bold text-ink-100">최근 신청</h2>
          <Link
            href="/admin/consultations"
            className="text-sm text-brand-neon hover:text-brand-blue transition-colors"
          >
            전체 보기 →
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="p-8 text-center text-ink-500 text-sm">
            아직 들어온 상담이 없습니다.
          </div>
        ) : (
          <ul className="divide-y divide-ink-700">
            {recent.map((c) => {
              const st = c.status_id ? statusMap.get(c.status_id) : null
              return (
                <li key={c.id} className="px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-sm">
                    {st ? (
                      <span
                        className="inline-block text-[11px] font-bold px-2 py-0.5 rounded"
                        style={{ backgroundColor: st.bg_color, color: st.text_color }}
                      >
                        {st.label}
                      </span>
                    ) : (
                      <span className="inline-block text-[11px] text-ink-500">
                        {c.status ?? '-'}
                      </span>
                    )}
                    <span className="font-semibold text-ink-100">{c.name}</span>
                    <span className="text-ink-400">{c.phone}</span>
                    {c.store_name && <span className="text-ink-500">· {c.store_name}</span>}
                    {c.utm_source && (
                      <span className="text-[11px] text-ink-500">· {c.utm_source}</span>
                    )}
                  </div>
                  <span className="text-xs text-ink-500">{formatKstShort(c.created_at)}</span>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* 빠른 메뉴 */}
      <div
        className={`grid gap-4 ${
          isSuperAdmin(profile.role) ? 'md:grid-cols-3' : 'md:grid-cols-2'
        }`}
      >
        <Link
          href="/admin/consultations"
          className="bg-surface-darkSoft border border-ink-700 rounded-lg p-5 hover:border-brand-blue/50 hover:bg-ink-800/50 transition-all"
        >
          <p className="text-base font-bold text-ink-100">상담 목록 관리</p>
          <p className="text-sm text-ink-400 mt-1 break-keep">
            신청을 검색·필터링하고 처리 상태를 변경합니다.
          </p>
        </Link>
        {isSuperAdmin(profile.role) && (
          <>
            <Link
              href="/admin/users"
              className="bg-surface-darkSoft border border-ink-700 rounded-lg p-5 hover:border-brand-blue/50 hover:bg-ink-800/50 transition-all"
            >
              <p className="text-base font-bold text-ink-100">사용자 관리</p>
              <p className="text-sm text-ink-400 mt-1 break-keep">
                상담사·마케터를 초대하고 역할·활성을 관리합니다.
              </p>
            </Link>
            <Link
              href="/admin/settings/statuses"
              className="bg-surface-darkSoft border border-ink-700 rounded-lg p-5 hover:border-brand-blue/50 hover:bg-ink-800/50 transition-all"
            >
              <p className="text-base font-bold text-ink-100">상태 관리</p>
              <p className="text-sm text-ink-400 mt-1 break-keep">
                상담 상태를 추가/수정하고 자동화 플래그를 설정합니다.
              </p>
            </Link>
          </>
        )}
        <Link
          href="/"
          target="_blank"
          className="bg-surface-darkSoft border border-ink-700 rounded-lg p-5 hover:border-brand-blue/50 hover:bg-ink-800/50 transition-all"
        >
          <p className="text-base font-bold text-ink-100">사이트 보기 / 편집</p>
          <p className="text-sm text-ink-400 mt-1 break-keep">
            랜딩 페이지에서 hover하면 ✏️ 아이콘으로 인라인 편집 가능.
          </p>
        </Link>
      </div>
    </div>
  )
}

const ORGANIZATION_REVENUE_ROLES: AdminRole[] = [
  'super_admin',
  'marketing',
  'tm_lead',
  'admin',
  'marketer',
]

const CHART_COLORS = ['#4f7cff', '#8b5cf6', '#f59e0b', '#14b8a6', '#f43f5e']

function DashboardPeriodFilter({ period }: { period: DashboardPeriod }) {
  const today = kstTodayYmd()
  const last7 = addDays(today, -6)
  const last30 = addDays(today, -29)
  const quickRanges = [
    { label: '오늘', href: dashboardHref(today, today, period.sort, period.compare) },
    { label: '최근 7일', href: dashboardHref(last7, today, period.sort, period.compare) },
    { label: '최근 30일', href: dashboardHref(last30, today, period.sort, period.compare) },
  ]

  return (
    <section className="rounded-2xl border border-ink-700 bg-surface-darkSoft/95 p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-base font-bold text-ink-100">조회 기간</h2>
          <p className="mt-1 text-sm text-ink-400">
            기간을 비워두면 오늘자 데이터가 기본으로 표시됩니다.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {quickRanges.map((range) => (
              <Link
                key={range.label}
                href={range.href}
                className="rounded-full border border-ink-700 bg-ink-900 px-3 py-1.5 text-xs font-semibold text-ink-300 hover:border-brand-blue/60 hover:text-brand-blue"
              >
                {range.label}
              </Link>
            ))}
          </div>
        </div>

        <form action="/admin" className="grid gap-3 sm:grid-cols-2 lg:flex lg:items-end">
          <FieldControl label="시작일">
            <input
              type="date"
              name="from"
              defaultValue={period.from}
              className="w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 outline-none focus:border-brand-blue"
            />
          </FieldControl>
          <FieldControl label="종료일">
            <input
              type="date"
              name="to"
              defaultValue={period.to}
              className="w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 outline-none focus:border-brand-blue"
            />
          </FieldControl>
          <FieldControl label="정렬">
            <select
              name="sort"
              defaultValue={period.sort}
              className="w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 outline-none focus:border-brand-blue"
            >
              <option value="revenue">매출액순</option>
              <option value="count">건수순</option>
              <option value="name">이름순</option>
            </select>
          </FieldControl>
          <label className="flex h-10 items-center gap-2 rounded-lg border border-ink-700 bg-ink-900 px-3 text-sm text-ink-300">
            <input
              type="checkbox"
              name="compare"
              value="1"
              defaultChecked={period.compare}
              className="h-4 w-4 accent-brand-blue"
            />
            이전기간 비교
          </label>
          <button
            type="submit"
            className="h-10 rounded-lg bg-brand-blue px-4 text-sm font-bold text-white hover:bg-brand-blue/90"
          >
            적용
          </button>
        </form>
      </div>
      <p className="mt-4 text-xs text-ink-500">
        현재 조회: {formatYmdLabel(period.from)} ~ {formatYmdLabel(period.to)}
        {period.compare && (
          <>
            {' '}
            · 비교: {formatYmdLabel(period.previousFrom)} ~ {formatYmdLabel(period.previousTo)}
          </>
        )}
      </p>
    </section>
  )
}

function FieldControl({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block min-w-[150px]">
      <span className="mb-1 block text-xs font-semibold text-ink-400">{label}</span>
      {children}
    </label>
  )
}

function RoleRevenueOverview({
  role,
  displayName,
  summary,
  period,
}: {
  role: AdminRole
  displayName: string
  summary: RevenueSummary
  period: DashboardPeriod
}) {
  const isCounselor = role === 'counselor'
  const isOrganizationView = ORGANIZATION_REVENUE_ROLES.includes(role)

  if (!isCounselor && !isOrganizationView) return null

  const title = isCounselor ? '내 매출 요약' : '전체 매출 요약'
  const description = isCounselor
    ? `${displayName} 상담사 기준 매출, 인센티브 포인트, 미수금 현황입니다.`
    : '전체 매출액, 광고비 소진액, 미수금 내역을 빠르게 확인합니다.'
  const unpaidTitle = isCounselor ? '내 미수금 내역' : '미수금 내역'
  const cards = isCounselor
    ? [
        {
          label: '내 매출액',
          value: formatWon(summary.revenueAmount),
          helper: '선택 기간 내 담당자로 배정된 개통 매출 합계',
          comparison: formatComparison(summary.revenueAmount, summary.previousRevenueAmount, period),
          tone: 'blue' as const,
        },
        {
          label: '내 인센티브 포인트',
          value: formatPending(summary.incentivePointAmount),
          helper: '인센티브 정책 연결 후 자동 계산',
          comparison: null,
          tone: 'violet' as const,
        },
        {
          label: '내 미수금',
          value: formatPending(summary.unpaidAmount),
          helper: '내 담당 DB 중 미수 상태 합계',
          comparison: null,
          tone: 'amber' as const,
        },
      ]
    : [
        {
          label: '전체 매출액',
          value: formatWon(summary.revenueAmount),
          helper: '선택 기간 내 전체 개통 매출 총합',
          comparison: formatComparison(summary.revenueAmount, summary.previousRevenueAmount, period),
          tone: 'blue' as const,
        },
        {
          label: '광고비 소진액',
          value: formatWon(summary.adSpendAmount),
          helper: '선택 기간 내 광고 매체별 spend 합계',
          comparison: formatComparison(summary.adSpendAmount, summary.previousAdSpendAmount, period),
          tone: 'violet' as const,
        },
        {
          label: '미수금',
          value: formatPending(summary.unpaidAmount),
          helper: '미입금/부분입금 잔액 합계',
          comparison: null,
          tone: 'amber' as const,
        },
      ]

  return (
    <section className="rounded-2xl border border-ink-700 bg-surface-darkSoft/95 p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-ink-100">{title}</h2>
          <p className="mt-1 text-sm text-ink-400 break-keep">{description}</p>
        </div>
        <span className="w-fit rounded-full border border-brand-blue/40 bg-brand-blue/10 px-3 py-1 text-xs font-semibold text-brand-blue">
          {formatYmdLabel(period.from)} ~ {formatYmdLabel(period.to)}
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="grid gap-3 sm:grid-cols-3">
          {cards.map((card) => (
            <RevenueSummaryCard key={card.label} {...card} />
          ))}
        </div>

        <div className="rounded-xl border border-ink-700 bg-ink-900/55 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-ink-100">{unpaidTitle}</p>
              <p className="mt-1 text-xs text-ink-500">
                고객명, 담당자, 미수 상태, 금액, 예정일 표시 영역
              </p>
            </div>
            <span className="rounded-full bg-ink-800 px-2.5 py-1 text-[11px] font-semibold text-ink-400">
              0건
            </span>
          </div>
          <div className="mt-4 rounded-lg border border-dashed border-ink-700 bg-surface-dark/60 px-4 py-5 text-center">
            <p className="text-sm font-semibold text-ink-300">미수금 데이터 연결 대기</p>
            <p className="mt-1 text-xs text-ink-500 break-keep">
              클로드 작업 시 실제 미수금 목록 API 또는 뷰를 연결하면 이 영역에 리스트가 표시됩니다.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function RevenueSummaryCard({
  label,
  value,
  helper,
  comparison,
  tone,
}: {
  label: string
  value: string
  helper: string
  comparison: { text: string; tone: 'up' | 'down' | 'flat' } | null
  tone: 'blue' | 'violet' | 'amber'
}) {
  const toneClass = {
    blue: 'from-brand-blue/20 to-brand-blue/5 text-brand-blue border-brand-blue/30',
    violet: 'from-indigo-400/20 to-indigo-400/5 text-indigo-300 border-indigo-400/30',
    amber: 'from-amber-400/20 to-amber-400/5 text-amber-300 border-amber-400/30',
  }[tone]

  return (
    <article className={`rounded-xl border bg-gradient-to-br p-4 ${toneClass}`}>
      <p className="text-xs font-semibold text-ink-400">{label}</p>
      <p className="mt-2 text-xl font-extrabold text-ink-100 sm:text-2xl">{value}</p>
      {comparison && (
        <p
          className={`mt-1 text-[11px] font-semibold ${
            comparison.tone === 'up'
              ? 'text-brand-neon'
              : comparison.tone === 'down'
                ? 'text-red-300'
                : 'text-ink-500'
          }`}
        >
          {comparison.text}
        </p>
      )}
      <p className="mt-2 text-xs leading-relaxed text-ink-500 break-keep">{helper}</p>
    </article>
  )
}

function PerformanceLineChart({
  title,
  subtitle,
  series,
  dates,
  emptyText,
}: {
  title: string
  subtitle: string
  series: ChartSeries[]
  dates: string[]
  emptyText: string
}) {
  const width = 760
  const height = 280
  const pad = { top: 22, right: 28, bottom: 38, left: 58 }
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom
  const maxValue = Math.max(...series.flatMap((item) => item.points), 1)
  const tickValues = [0, 0.25, 0.5, 0.75, 1].map((rate) => Math.round(maxValue * rate))
  const gradientId = title === '상품별 실적' ? 'productPerformanceGlow' : 'counselorPerformanceGlow'

  return (
    <section className="rounded-2xl border border-ink-700 bg-surface-darkSoft/95 p-4 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-ink-100">{title}</h2>
          <p className="mt-1 text-sm text-ink-400">{subtitle}</p>
        </div>
        <span className="w-fit rounded-full bg-ink-900 px-3 py-1 text-xs font-semibold text-ink-400">
          선그래프
        </span>
      </div>

      {series.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-ink-700 bg-surface-dark/60 px-4 py-12 text-center">
          <p className="text-sm font-semibold text-ink-300">{emptyText}</p>
          <p className="mt-1 text-xs text-ink-500">기간을 넓히거나 매출 등록 여부를 확인하세요.</p>
        </div>
      ) : (
        <>
          <div className="mt-4 overflow-hidden rounded-xl border border-ink-700 bg-ink-950/40">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="h-[260px] w-full"
              role="img"
              aria-label={`${title} 선그래프`}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="#4f7cff" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.08" />
                </linearGradient>
              </defs>
              <rect x="0" y="0" width={width} height={height} fill={`url(#${gradientId})`} />
              {tickValues.map((tick, index) => {
                const y = pad.top + innerH - (tick / maxValue) * innerH
                return (
                  <g key={`${tick}-${index}`}>
                    <line
                      x1={pad.left}
                      x2={width - pad.right}
                      y1={y}
                      y2={y}
                      stroke="#334155"
                      strokeDasharray="4 6"
                      strokeOpacity="0.55"
                    />
                    <text
                      x={pad.left - 10}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-ink-500 text-[11px]"
                    >
                      {compactWon(tick)}
                    </text>
                  </g>
                )
              })}
              {dateTickIndexes(dates).map((index) => {
                const x = chartX(index, dates.length, pad.left, innerW)
                return (
                  <text
                    key={`${dates[index]}-${index}`}
                    x={x}
                    y={height - 12}
                    textAnchor="middle"
                    className="fill-ink-500 text-[11px]"
                  >
                    {formatShortDate(dates[index])}
                  </text>
                )
              })}
              {series.map((item) => {
                const path = item.points
                  .map((point, index) => {
                    const x = chartX(index, dates.length, pad.left, innerW)
                    const y = pad.top + innerH - (point / maxValue) * innerH
                    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
                  })
                  .join(' ')
                return (
                  <g key={item.label}>
                    <path
                      d={path}
                      fill="none"
                      stroke={item.color}
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.95"
                    />
                    {item.points.map((point, index) => {
                      if (point <= 0) return null
                      const x = chartX(index, dates.length, pad.left, innerW)
                      const y = pad.top + innerH - (point / maxValue) * innerH
                      return (
                        <circle
                          key={`${item.label}-${dates[index]}`}
                          cx={x}
                          cy={y}
                          r="4"
                          fill={item.color}
                          stroke="#0b1020"
                          strokeWidth="2"
                        />
                      )
                    })}
                  </g>
                )
              })}
            </svg>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {series.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between gap-3 rounded-lg bg-ink-900/70 px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                    aria-hidden
                  />
                  <span className="truncate text-sm font-semibold text-ink-200">{item.label}</span>
                </div>
                <span className="shrink-0 text-xs text-ink-400">
                  {formatWon(item.totalNet)} · {item.count}건
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}

function enrichRevenueRows(
  rows: RevenueRow[],
  ownerMap: Map<string, string | null>,
  adminUserMap: Map<string, AdminUserMini>
): EnrichedRevenueRow[] {
  return rows.map((row) => {
    const counselorId = ownerMap.get(row.consultation_id) ?? null
    const user = counselorId ? adminUserMap.get(counselorId) : null
    return {
      id: row.id,
      consultation_id: row.consultation_id,
      product_label: row.product_label?.trim() || '직접입력',
      amount: Number(row.amount ?? 0),
      net_amount: Number(row.net_amount ?? 0),
      revenue_date: row.revenue_date,
      counselor_id: counselorId,
      counselor_name: user?.display_name?.trim() || (counselorId ? '이름 미등록' : '미배정'),
    }
  })
}

function buildRevenueSeries(
  rows: EnrichedRevenueRow[],
  dates: string[],
  dimension: 'counselor' | 'product',
  sort: DashboardSortMode
): ChartSeries[] {
  const dateSet = new Set(dates)
  const grouped = new Map<string, { totalNet: number; count: number; daily: Map<string, number> }>()

  for (const row of rows) {
    if (!dateSet.has(row.revenue_date)) continue
    const key = dimension === 'counselor' ? row.counselor_name : row.product_label
    const current = grouped.get(key) ?? { totalNet: 0, count: 0, daily: new Map<string, number>() }
    current.totalNet += row.amount
    current.count += 1
    current.daily.set(row.revenue_date, (current.daily.get(row.revenue_date) ?? 0) + row.amount)
    grouped.set(key, current)
  }

  return Array.from(grouped.entries())
    .sort(([labelA, a], [labelB, b]) => {
      if (sort === 'count') return b.count - a.count || b.totalNet - a.totalNet
      if (sort === 'name') return labelA.localeCompare(labelB, 'ko')
      return b.totalNet - a.totalNet || b.count - a.count
    })
    .slice(0, 5)
    .map(([label, value], index) => ({
      label,
      color: CHART_COLORS[index % CHART_COLORS.length],
      totalNet: value.totalNet,
      count: value.count,
      points: dates.map((date) => value.daily.get(date) ?? 0),
    }))
}

function resolveDashboardPeriod(searchParams: AdminDashboardSearchParams): DashboardPeriod {
  const today = kstTodayYmd()
  const rawFrom = normalizeYmd(firstParam(searchParams.from))
  const rawTo = normalizeYmd(firstParam(searchParams.to))
  let from = rawFrom ?? rawTo ?? today
  let to = rawTo ?? rawFrom ?? today
  const isDefaultToday = !rawFrom && !rawTo

  if (from > to) [from, to] = [to, from]

  const days = Math.max(daysBetween(from, to) + 1, 1)
  const previousTo = addDays(from, -1)
  const previousFrom = addDays(previousTo, -(days - 1))

  return {
    from,
    to,
    previousFrom,
    previousTo,
    compare: firstParam(searchParams.compare) === '1',
    sort: normalizeSort(firstParam(searchParams.sort)),
    isDefaultToday,
  }
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function normalizeSort(value: string | undefined): DashboardSortMode {
  if (value === 'count' || value === 'name') return value
  return 'revenue'
}

function normalizeYmd(value: string | undefined): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = parseYmd(value)
  return Number.isNaN(date.getTime()) ? null : value
}

function kstTodayYmd(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
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

function daysBetween(from: string, to: string): number {
  return Math.round((parseYmd(to).getTime() - parseYmd(from).getTime()) / 86400000)
}

function datesBetween(from: string, to: string): string[] {
  const count = Math.max(daysBetween(from, to) + 1, 1)
  return Array.from({ length: count }, (_, index) => addDays(from, index))
}

function dashboardHref(
  from: string,
  to: string,
  sort: DashboardSortMode,
  compare: boolean
): string {
  const params = new URLSearchParams({ from, to, sort })
  if (compare) params.set('compare', '1')
  return `/admin?${params.toString()}`
}

function chartX(index: number, count: number, left: number, width: number): number {
  if (count <= 1) return left + width / 2
  return left + (width * index) / (count - 1)
}

function dateTickIndexes(dates: string[]): number[] {
  if (dates.length <= 1) return [0]
  if (dates.length <= 6) return dates.map((_, index) => index)
  const last = dates.length - 1
  return Array.from(new Set([0, Math.floor(last / 3), Math.floor((last * 2) / 3), last]))
}

function sumBy<T>(items: T[], picker: (item: T) => number): number {
  return items.reduce((sum, item) => sum + picker(item), 0)
}

function sumAdSpend(rows: AdMetricRow[]): number {
  return rows.reduce((sum, row) => sum + Number(row.spend ?? 0), 0)
}

function formatWon(value: number | null): string {
  if (value === null) return '연동 대기'
  return `${Math.round(value).toLocaleString()}원`
}

function formatPending(value: number | null): string {
  return value === null ? '연동 대기' : formatWon(value)
}

function compactWon(value: number): string {
  if (value >= 100000000) return `${Math.round(value / 100000000)}억`
  if (value >= 10000) return `${Math.round(value / 10000)}만`
  return `${Math.round(value).toLocaleString()}`
}

function formatComparison(
  current: number | null,
  previous: number | null,
  period: DashboardPeriod
): { text: string; tone: 'up' | 'down' | 'flat' } | null {
  if (!period.compare || current === null || previous === null) return null
  const diff = current - previous
  const tone = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat'
  const rate = previous > 0 ? `${Math.abs((diff / previous) * 100).toFixed(1)}%` : null
  const direction = diff > 0 ? '증가' : diff < 0 ? '감소' : '변동 없음'
  const amount = diff === 0 ? '0원' : formatWon(Math.abs(diff))
  return {
    text: rate ? `이전기간 대비 ${amount} ${direction} (${rate})` : `이전기간 대비 ${amount} ${direction}`,
    tone,
  }
}

function formatYmdLabel(value: string): string {
  const [, month, day] = value.split('-')
  return `${Number(month)}.${Number(day)}`
}

function formatShortDate(value: string): string {
  const [, month, day] = value.split('-')
  return `${Number(month)}/${Number(day)}`
}

function getDashboardStatusOrder(row: ConsultationFunnelRow): { group: number; rank: number } {
  const code = row.status_code
  const label = row.status_label.replace(/\s/g, '')
  const contactOrder = [
    ['absent_1', 'no_answer_1', '부재1'],
    ['absent_2', 'no_answer_2', '부재2'],
    ['absent_3', 'no_answer_3', '부재3'],
    ['absent_4', 'no_answer_4', '부재4'],
    ['absent_5_plus', 'absent_5', 'no_answer_5', '부재5+', '부재5'],
    ['recall', 'recall_wait', '재통화대기'],
  ]
  const pipelineOrder = [
    ['new', '신규'],
    ['promising', '가망'],
    ['contacted', '연락중'],
    ['consulting', '상담중'],
    ['done', 'conversion', '개통완료'],
  ]

  const contactRank = contactOrder.findIndex((keys) => keys.includes(code) || keys.includes(label))
  if (contactRank >= 0) return { group: 0, rank: contactRank }
  if (code === 'no_answer' || label === '부재') return { group: 0, rank: 0 }

  const pipelineRank = pipelineOrder.findIndex((keys) => keys.includes(code) || keys.includes(label))
  if (pipelineRank >= 0) return { group: 1, rank: pipelineRank }

  return { group: 2, rank: 999 }
}

function KpiCard({ row }: { row: ConsultationFunnelRow }) {
  return (
    <div className="bg-surface-darkSoft border border-ink-700 rounded-lg p-4 hover:border-ink-600 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <span
          className="inline-block w-3 h-3 rounded-full"
          style={{ backgroundColor: row.status_color }}
          aria-hidden
        />
        <p className="text-xs text-ink-400">{row.status_label}</p>
      </div>
      <p className="text-2xl font-extrabold text-ink-100">
        {Number(row.total_count).toLocaleString()}
      </p>
      <p className="text-[10px] text-ink-500 mt-1">
        오늘 +{Number(row.today_count)} · 7일 +{Number(row.week_count)}
      </p>
    </div>
  )
}

function formatKstShort(iso: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))
}
