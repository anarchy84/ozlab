// ─────────────────────────────────────────────
// /admin/dashboard/sales — 매출 통합 성과 (경영자 뷰, 루커 Page 1 미러)
// 권한 : super_admin / marketing / tm_lead / admin / marketer
// ─────────────────────────────────────────────
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireAdminProfile } from '@/lib/admin/auth-helpers'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

interface ChannelRow {
  channel: string
  lead_count: number
  revenue_count: number | null
  converting_lead_count: number | null
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

export default async function SalesDashboardPage() {
  const profile = await requireAdminProfile()
  const allowed = ['super_admin', 'marketing', 'tm_lead', 'admin', 'marketer']
  if (!allowed.includes(profile.role)) {
    redirect('/admin?error=forbidden')
  }

  const admin = createAdminClient()
  const [channelRes, ltvRes, sumRes, adSpendRes] = await Promise.all([
    admin.from('v_revenue_by_channel').select('*'),
    admin.from('v_revenue_ltv_by_channel').select('*'),
    admin.from('revenue_records').select('amount, gift_amount, net_amount'),
    admin.from('ad_metrics').select('spend, conversions'),
  ])

  const channels = (channelRes.data ?? []) as ChannelRow[]
  const ltv      = (ltvRes.data ?? []) as LtvRow[]

  const totalAmount = (sumRes.data ?? []).reduce((s, r: { amount: number }) => s + Number(r.amount), 0)
  const totalGift   = (sumRes.data ?? []).reduce((s, r: { gift_amount: number }) => s + Number(r.gift_amount), 0)
  const totalNet    = (sumRes.data ?? []).reduce((s, r: { net_amount: number }) => s + Number(r.net_amount), 0)
  const totalSpend  = (adSpendRes.data ?? []).reduce((s, r: { spend: number }) => s + Number(r.spend), 0)
  const totalAdConv = (adSpendRes.data ?? []).reduce((s, r: { conversions: number }) => s + Number(r.conversions), 0)
  const roas = totalSpend > 0 ? (totalAmount / totalSpend) * 100 : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-100">매출 통합 성과</h1>
          <p className="text-sm text-ink-400 mt-1">
            경영자 뷰 — 매출·ROAS 중심. (루커 Page 1 미러)
          </p>
        </div>
        <Link
          href="/admin/dashboard/paid-media"
          className="text-sm text-naver-neon hover:underline"
        >
          → 광고 퍼포먼스 뷰
        </Link>
      </div>

      {/* KPI 카드 */}
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
        <Kpi label="매체측 전환" value={`${totalAdConv.toLocaleString()}건`} />
        <Kpi
          label="등록된 매출 건"
          value={`${(sumRes.data ?? []).length.toLocaleString()}건`}
        />
        <Kpi label="우리편 LTV" value="—" small="다음 단계" />
      </div>

      {/* 매체별 매출 + 코호트 */}
      <section className="bg-surface-darkSoft border border-ink-700 rounded-lg overflow-x-auto">
        <h2 className="text-lg font-bold text-ink-100 px-5 pt-4">
          매체별 매출 + 30/60/90일 코호트
        </h2>
        <table className="w-full text-sm mt-3">
          <thead className="bg-ink-900 text-ink-400 text-xs">
            <tr>
              <th className="text-left px-3 py-2">매체</th>
              <th className="text-right px-3 py-2">리드</th>
              <th className="text-right px-3 py-2">매출 건</th>
              <th className="text-right px-3 py-2">총매출</th>
              <th className="text-right px-3 py-2">순매출</th>
              <th className="text-right px-3 py-2">30일 누적</th>
              <th className="text-right px-3 py-2">60일 누적</th>
              <th className="text-right px-3 py-2">90일 누적</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-800">
            {channels.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-6 text-ink-500">
                  데이터 없음 — 매출 등록 후 다시 보세요
                </td>
              </tr>
            ) : (
              channels.map((c) => (
                <tr key={c.channel} className="hover:bg-ink-800/30">
                  <td className="px-3 py-2 text-ink-200">
                    {CHANNEL_LABEL[c.channel] ?? c.channel}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-ink-300">
                    {c.lead_count.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-ink-300">
                    {(c.revenue_count ?? 0).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-ink-100">
                    {Number(c.total_amount ?? 0).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-naver-neon">
                    {Number(c.total_net ?? 0).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-ink-400">
                    {Number(c.net_30d ?? 0).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-ink-400">
                    {Number(c.net_60d ?? 0).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-ink-400">
                    {Number(c.net_90d ?? 0).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* LTV / 평균 소요일 */}
      <section className="bg-surface-darkSoft border border-ink-700 rounded-lg overflow-x-auto">
        <h2 className="text-lg font-bold text-ink-100 px-5 pt-4">
          매체별 LTV + 평균 소요일
        </h2>
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
              <tr>
                <td colSpan={7} className="text-center py-6 text-ink-500">
                  데이터 없음
                </td>
              </tr>
            ) : (
              ltv.map((r) => (
                <tr key={r.channel} className="hover:bg-ink-800/30">
                  <td className="px-3 py-2 text-ink-200">
                    {CHANNEL_LABEL[r.channel] ?? r.channel}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-ink-300">
                    {r.lead_count.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-ink-300">
                    {r.converted_lead_count.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-ink-200">
                    {r.conversion_rate_pct ?? '—'}%
                  </td>
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
        ※ 골격만 — 차트(Recharts), 기간 필터, 일별 추이, 상품별 매출 표 등은 다음 세션에서 추가.
      </p>
    </div>
  )
}

function Kpi({
  label,
  value,
  accent,
  small,
}: {
  label: string
  value: string
  accent?: boolean
  small?: string
}) {
  return (
    <div className="bg-surface-darkSoft border border-ink-700 rounded-lg p-4">
      <div className="text-xs text-ink-400">{label}</div>
      <div
        className={`text-xl md:text-2xl font-bold mt-1 ${
          accent ? 'text-naver-neon' : 'text-ink-100'
        }`}
      >
        {value}
      </div>
      {small && <div className="text-[11px] text-ink-500 mt-1">{small}</div>}
    </div>
  )
}
