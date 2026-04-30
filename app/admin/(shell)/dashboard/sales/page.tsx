// ─────────────────────────────────────────────
// /admin/dashboard/sales — 매출 통합 성과 (경영자 뷰)
//
// KPI 분리 :
//   1) 이번달 매출 (revenue_date 기준)        — "이번 달 회사 통장 들어온 돈"
//   2) 지난달 디비 매출 (consultation 코호트)  — "지난달 들어온 리드의 누적 매출"
//   3) 지지난달 디비 매출 (코호트)             — "지지난달 들어온 리드의 누적 매출"
//   4) 누적 (전체)
//
// 기간 필터 : preset (이번달/지난달/3개월/전체) + from/to 자유 입력
// ─────────────────────────────────────────────
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireAdminProfile } from '@/lib/admin/auth-helpers'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

interface SP {
  from?: string
  to?: string
  preset?: string
}

interface ChannelRow {
  channel: string
  lead_count: number
  revenue_count: number | null
  total_amount: number | null
  total_gift: number | null
  total_net: number | null
  net_30d: number | null
  net_60d: number | null
  net_90d: number | null
}

interface LtvRow {
  channel: string
  lead_count: number
  converted_lead_count: number
  conversion_rate_pct: string | null
  avg_ltv: number | null
  total_revenue: number | null
  avg_days_to_first_revenue: number | null
}

const CHANNEL_LABEL: Record<string, string> = {
  'naver-ads': '네이버 광고',
  'google-ads': '구글 광고',
  'meta-ads': '메타 광고',
  'naver-search': '네이버 검색',
  'google-search': '구글 검색',
  'internal-blog': '자체 블로그',
  'referral-blog': '외부 블로그',
  'social-organic': 'SNS',
  'kakao': '카카오',
  'direct': '직접 진입',
  'referral-other': '외부 사이트',
}

// 월 경계 헬퍼 — KST 기준
function ymd(d: Date) {
  // KST (UTC+9) 보정
  const kst = new Date(d.getTime() + 9 * 3600000)
  return kst.toISOString().slice(0, 10)
}

function monthRange(monthsAgo: number): { from: string; to: string; label: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() - monthsAgo
  const start = new Date(y, m, 1)
  const end = new Date(y, m + 1, 0)
  const label = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`
  return { from: ymd(start), to: ymd(end), label }
}

export default async function SalesDashboardPage({ searchParams }: { searchParams: SP }) {
  const profile = await requireAdminProfile()
  const allowed = ['super_admin', 'marketing', 'tm_lead', 'admin', 'marketer']
  if (!allowed.includes(profile.role)) {
    redirect('/admin?error=forbidden')
  }

  // 기간 필터
  const dateFrom = (searchParams.from ?? '').trim()
  const dateTo = (searchParams.to ?? '').trim()
  const preset = (searchParams.preset ?? '').trim()

  let effectiveFrom = dateFrom
  let effectiveTo = dateTo
  if (preset && !dateFrom && !dateTo) {
    const now = new Date()
    const today = ymd(now)
    if (preset === 'today') { effectiveFrom = today; effectiveTo = today }
    else if (preset === 'week') { effectiveFrom = ymd(new Date(now.getTime() - 7 * 86400000)); effectiveTo = today }
    else if (preset === 'month') { const r = monthRange(0); effectiveFrom = r.from; effectiveTo = today }
    else if (preset === 'last_month') { const r = monthRange(1); effectiveFrom = r.from; effectiveTo = r.to }
    else if (preset === 'last_3m') { const r = monthRange(2); effectiveFrom = r.from; effectiveTo = today }
  }

  const admin = createAdminClient()

  // 월 코호트 3종
  const cur = monthRange(0)
  const last = monthRange(1)
  const lastlast = monthRange(2)

  // 코호트 쿼리 — consultation_id 기준 JOIN
  async function cohortRevenue(monthFrom: string, monthTo: string) {
    const { data } = await admin
      .from('consultations')
      .select('id, revenue_records(net_amount)')
      .gte('created_at', monthFrom + 'T00:00:00')
      .lte('created_at', monthTo + 'T23:59:59')
    return (data ?? []).reduce(
      (s: number, c: { revenue_records?: { net_amount: number }[] }) => {
        const recs = c.revenue_records ?? []
        return s + recs.reduce((ss, r) => ss + Number(r.net_amount ?? 0), 0)
      },
      0
    )
  }

  const [
    sumAllRes,
    adSpendRes,
    cohortCurMonthRes,
    lastMonthCohortNet,
    lastLastMonthCohortNet,
    channelRes,
    ltvRes,
    filteredRevRes,
    filteredLeadRes,
  ] = await Promise.all([
    admin.from('revenue_records').select('amount, gift_amount, net_amount'),
    admin.from('ad_metrics').select('spend, conversions'),
    admin.from('revenue_records')
      .select('amount, gift_amount, net_amount')
      .gte('revenue_date', cur.from)
      .lte('revenue_date', cur.to),
    cohortRevenue(last.from, last.to),
    cohortRevenue(lastlast.from, lastlast.to),
    admin.from('v_revenue_by_channel').select('*'),
    admin.from('v_revenue_ltv_by_channel').select('*'),
    effectiveFrom || effectiveTo
      ? admin.from('revenue_records')
          .select('amount, gift_amount, net_amount, revenue_date')
          .gte('revenue_date', effectiveFrom || '1900-01-01')
          .lte('revenue_date', effectiveTo || '2999-12-31')
      : Promise.resolve({ data: [] as { amount: number; gift_amount: number; net_amount: number; revenue_date: string }[] }),
    effectiveFrom || effectiveTo
      ? admin.from('consultations')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', (effectiveFrom || '1900-01-01') + 'T00:00:00')
          .lte('created_at', (effectiveTo || '2999-12-31') + 'T23:59:59')
      : Promise.resolve({ count: 0 as number | null }),
  ])

  const channels = (channelRes.data ?? []) as ChannelRow[]
  const ltv = (ltvRes.data ?? []) as LtvRow[]

  const totalAmount = (sumAllRes.data ?? []).reduce((s, r: { amount: number }) => s + Number(r.amount), 0)
  const totalGift = (sumAllRes.data ?? []).reduce((s, r: { gift_amount: number }) => s + Number(r.gift_amount), 0)
  const totalNet = (sumAllRes.data ?? []).reduce((s, r: { net_amount: number }) => s + Number(r.net_amount), 0)
  const totalSpend = (adSpendRes.data ?? []).reduce((s, r: { spend: number }) => s + Number(r.spend), 0)
  const roas = totalSpend > 0 ? (totalAmount / totalSpend) * 100 : null

  const curMonthAmount = (cohortCurMonthRes.data ?? []).reduce((s, r: { amount: number }) => s + Number(r.amount), 0)
  const curMonthNet = (cohortCurMonthRes.data ?? []).reduce((s, r: { net_amount: number }) => s + Number(r.net_amount), 0)

  // 기간 필터 합계
  const filteredRevs = filteredRevRes.data ?? []
  const filteredAmount = filteredRevs.reduce((s, r: { amount: number }) => s + Number(r.amount), 0)
  const filteredNet = filteredRevs.reduce((s, r: { net_amount: number }) => s + Number(r.net_amount), 0)
  const filteredLeadCount = filteredLeadRes.count ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-100">매출 통합 성과</h1>
          <p className="text-sm text-ink-400 mt-1">
            매출 발생 기준(이번달) + 리드 코호트 기준(지난달·지지난달 디비) 분리 표시
          </p>
        </div>
        <Link href="/admin/dashboard/paid-media" className="text-sm text-naver-neon hover:underline">
          → 광고 퍼포먼스 뷰
        </Link>
      </div>

      {/* 월별 KPI — 핵심 */}
      <section>
        <h2 className="text-sm font-bold text-ink-300 mb-2">📅 월별 매출</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <KpiCard
            label={`이번 달 (${cur.label}) 발생 매출`}
            sub="revenue_date 기준 — 회사 통장 기준"
            value={`${curMonthAmount.toLocaleString()}원`}
            net={`순 ${curMonthNet.toLocaleString()}원`}
            accent
          />
          <KpiCard
            label={`지난 달 (${last.label}) 디비 매출`}
            sub="지난달 들어온 리드의 누적 매출 (코호트)"
            value={`${lastMonthCohortNet.toLocaleString()}원`}
          />
          <KpiCard
            label={`지지난 달 (${lastlast.label}) 디비 매출`}
            sub="지지난달 리드 코호트 누적"
            value={`${lastLastMonthCohortNet.toLocaleString()}원`}
          />
        </div>
        <p className="text-[11px] text-ink-500 mt-2">
          ※ "이번달 매출" = 이번달 영업일에 개통된 모든 매출 합계 (리드 들어온 시점 무관) · "지난달 디비 매출" = 지난달 들어온 리드들이 시점 무관하게 만든 누적 매출
        </p>
      </section>

      {/* 누적 KPI */}
      <section>
        <h2 className="text-sm font-bold text-ink-300 mb-2">📊 누적 (전체)</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="총 매출" value={`${totalAmount.toLocaleString()}원`} />
          <Kpi label="총 광고비" value={`${totalSpend.toLocaleString()}원`} />
          <Kpi label="총 사은품" value={`${totalGift.toLocaleString()}원`} />
          <Kpi
            label="ROAS"
            value={roas != null ? `${roas.toFixed(2)}%` : '—'}
            accent={roas != null && roas >= 100}
          />
          <Kpi label="순매출" value={`${totalNet.toLocaleString()}원`} />
          <Kpi label="등록된 매출 건" value={`${(sumAllRes.data ?? []).length.toLocaleString()}건`} />
        </div>
      </section>

      {/* 기간 필터 */}
      <section className="bg-surface-darkSoft border border-ink-700 rounded-lg p-4">
        <h2 className="text-sm font-bold text-ink-300 mb-3">🔎 기간 필터 (자유 정렬)</h2>
        <div className="flex flex-wrap gap-2 mb-3">
          {[
            { code: '', label: '전체' },
            { code: 'today', label: '오늘' },
            { code: 'week', label: '최근 7일' },
            { code: 'month', label: '이번 달' },
            { code: 'last_month', label: '지난 달' },
            { code: 'last_3m', label: '최근 3개월' },
          ].map((p) => {
            const isActive = preset === p.code && !dateFrom && !dateTo
            const sp = new URLSearchParams()
            if (p.code) sp.set('preset', p.code)
            const href = `/admin/dashboard/sales${sp.toString() ? `?${sp.toString()}` : ''}`
            return (
              <Link
                key={p.code || 'all'}
                href={href}
                className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                  isActive
                    ? 'bg-naver-green text-white border-naver-green font-bold'
                    : 'bg-ink-800 text-ink-300 border-ink-700 hover:bg-ink-700'
                }`}
              >
                {p.label}
              </Link>
            )
          })}
        </div>
        <form method="get" className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="block text-xs text-ink-400 mb-1">시작일</label>
            <input type="date" name="from" defaultValue={dateFrom}
              className="px-3 py-2 bg-ink-900 border border-ink-700 text-ink-100 rounded-md text-sm" />
          </div>
          <div>
            <label className="block text-xs text-ink-400 mb-1">종료일</label>
            <input type="date" name="to" defaultValue={dateTo}
              className="px-3 py-2 bg-ink-900 border border-ink-700 text-ink-100 rounded-md text-sm" />
          </div>
          <button type="submit"
            className="px-4 py-2 bg-naver-green text-white rounded-md text-sm font-bold hover:bg-naver-dark">
            적용
          </button>
          {(dateFrom || dateTo || preset) && (
            <Link href="/admin/dashboard/sales"
              className="px-4 py-2 border border-ink-700 rounded-md text-sm text-ink-300 hover:bg-ink-800">
              초기화
            </Link>
          )}
        </form>

        {(effectiveFrom || effectiveTo) && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi
              label={`기간 매출 (${effectiveFrom || '∞'} ~ ${effectiveTo || '∞'})`}
              value={`${filteredAmount.toLocaleString()}원`}
              accent
            />
            <Kpi label="기간 순매출" value={`${filteredNet.toLocaleString()}원`} />
            <Kpi label="기간 신규 리드" value={`${filteredLeadCount.toLocaleString()}건`} />
            <Kpi label="기간 매출 건" value={`${filteredRevs.length.toLocaleString()}건`} />
          </div>
        )}
      </section>

      {/* 매체별 매출 + 코호트 */}
      <section className="bg-surface-darkSoft border border-ink-700 rounded-lg overflow-x-auto">
        <h2 className="text-lg font-bold text-ink-100 px-5 pt-4">매체별 매출 + 30/60/90일 코호트</h2>
        <table className="w-full text-sm mt-3">
          <thead className="bg-ink-900 text-ink-400 text-xs">
            <tr>
              <th className="text-left px-3 py-2">매체</th>
              <th className="text-right px-3 py-2">리드</th>
              <th className="text-right px-3 py-2">매출 건</th>
              <th className="text-right px-3 py-2">총매출</th>
              <th className="text-right px-3 py-2">순매출</th>
              <th className="text-right px-3 py-2">30일</th>
              <th className="text-right px-3 py-2">60일</th>
              <th className="text-right px-3 py-2">90일</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-800">
            {channels.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-6 text-ink-500">데이터 없음</td></tr>
            ) : (
              channels.map((c) => (
                <tr key={c.channel} className="hover:bg-ink-800/30">
                  <td className="px-3 py-2 text-ink-200">{CHANNEL_LABEL[c.channel] ?? c.channel}</td>
                  <td className="px-3 py-2 text-right font-mono text-ink-300">{c.lead_count.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right font-mono text-ink-300">{(c.revenue_count ?? 0).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right font-mono text-ink-100">{Number(c.total_amount ?? 0).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right font-mono text-naver-neon">{Number(c.total_net ?? 0).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right font-mono text-ink-400">{Number(c.net_30d ?? 0).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right font-mono text-ink-400">{Number(c.net_60d ?? 0).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right font-mono text-ink-400">{Number(c.net_90d ?? 0).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* LTV */}
      <section className="bg-surface-darkSoft border border-ink-700 rounded-lg overflow-x-auto">
        <h2 className="text-lg font-bold text-ink-100 px-5 pt-4">매체별 LTV + 평균 소요일</h2>
        <table className="w-full text-sm mt-3">
          <thead className="bg-ink-900 text-ink-400 text-xs">
            <tr>
              <th className="text-left px-3 py-2">매체</th>
              <th className="text-right px-3 py-2">리드</th>
              <th className="text-right px-3 py-2">전환 리드</th>
              <th className="text-right px-3 py-2">전환율</th>
              <th className="text-right px-3 py-2">평균 LTV</th>
              <th className="text-right px-3 py-2">총매출</th>
              <th className="text-right px-3 py-2">첫매출까지(일)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-800">
            {ltv.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-6 text-ink-500">데이터 없음</td></tr>
            ) : (
              ltv.map((r) => (
                <tr key={r.channel} className="hover:bg-ink-800/30">
                  <td className="px-3 py-2 text-ink-200">{CHANNEL_LABEL[r.channel] ?? r.channel}</td>
                  <td className="px-3 py-2 text-right font-mono text-ink-300">{r.lead_count.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right font-mono text-ink-300">{r.converted_lead_count.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right font-mono text-ink-200">{r.conversion_rate_pct ?? '—'}%</td>
                  <td className="px-3 py-2 text-right font-mono text-naver-neon">
                    {r.avg_ltv != null ? Number(r.avg_ltv).toLocaleString() : '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-ink-100">
                    {r.total_revenue != null ? Number(r.total_revenue).toLocaleString() : '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-ink-400">
                    {r.avg_days_to_first_revenue != null
                      ? `${Math.round(Number(r.avg_days_to_first_revenue))}일`
                      : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <p className="text-xs text-ink-500">
        ※ 다음 단계 : 차트 (월별 추이 라인 / 매체별 도넛) + 상품별 매출 표 + 사은품 비율 분석
      </p>
    </div>
  )
}

function Kpi({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="bg-surface-darkSoft border border-ink-700 rounded-lg p-3">
      <div className="text-[11px] text-ink-400">{label}</div>
      <div className={`text-lg font-bold mt-0.5 ${accent ? 'text-naver-neon' : 'text-ink-100'}`}>
        {value}
      </div>
    </div>
  )
}

function KpiCard({
  label,
  sub,
  value,
  net,
  accent,
}: {
  label: string
  sub?: string
  value: string
  net?: string
  accent?: boolean
}) {
  return (
    <div className={`border rounded-lg p-4 ${
      accent ? 'bg-naver-green/10 border-naver-green/40' : 'bg-surface-darkSoft border-ink-700'
    }`}>
      <div className="text-xs text-ink-300 font-medium">{label}</div>
      {sub && <div className="text-[11px] text-ink-500 mt-0.5">{sub}</div>}
      <div className={`text-2xl font-bold mt-2 ${accent ? 'text-naver-neon' : 'text-ink-100'}`}>
        {value}
      </div>
      {net && <div className="text-xs text-ink-400 mt-1">{net}</div>}
    </div>
  )
}
