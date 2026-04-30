// ─────────────────────────────────────────────
// /admin/dashboard/paid-media — 광고 퍼포먼스 (마케터 뷰, 루커 Page 2 미러)
// ─────────────────────────────────────────────
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireAdminProfile } from '@/lib/admin/auth-helpers'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const CHANNEL_LABEL: Record<string, string> = {
  'naver-ads': '네이버 광고',
  'google-ads': '구글 광고',
  'meta-ads': '메타 광고',
  'naver-search': '네이버 검색광고',
  'meta': '메타',
  'naver': '네이버',
  'google': '구글',
  'daangn': '당근',
  'kakao': '카카오',
}

export default async function PaidMediaDashboardPage() {
  const profile = await requireAdminProfile()
  const allowed = ['super_admin', 'marketing', 'tm_lead', 'admin', 'marketer']
  if (!allowed.includes(profile.role)) {
    redirect('/admin?error=forbidden')
  }

  const admin = createAdminClient()
  const { data: metrics } = await admin
    .from('ad_metrics')
    .select('*')
    .order('date', { ascending: false })
    .limit(500)

  const rows = metrics ?? []

  // 매체별 합계
  const byChannel = new Map<string, {
    impressions: number
    clicks: number
    conversions: number
    spend: number
  }>()
  for (const r of rows) {
    const cur = byChannel.get(r.channel) ?? { impressions: 0, clicks: 0, conversions: 0, spend: 0 }
    cur.impressions += Number(r.impressions ?? 0)
    cur.clicks += Number(r.clicks ?? 0)
    cur.conversions += Number(r.conversions ?? 0)
    cur.spend += Number(r.spend ?? 0)
    byChannel.set(r.channel, cur)
  }

  // 총합
  const total = {
    impressions: 0, clicks: 0, conversions: 0, spend: 0,
  }
  byChannel.forEach((v) => {
    total.impressions += v.impressions
    total.clicks += v.clicks
    total.conversions += v.conversions
    total.spend += v.spend
  })
  const ctr = total.impressions > 0 ? (total.clicks / total.impressions) * 100 : 0
  const cvr = total.clicks > 0 ? (total.conversions / total.clicks) * 100 : 0
  const cpa = total.conversions > 0 ? total.spend / total.conversions : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-100">광고 퍼포먼스</h1>
          <p className="text-sm text-ink-400 mt-1">
            ad_metrics 기반 — 시트 sync 후 자동 집계 (루커 Page 2 미러)
          </p>
        </div>
        <Link
          href="/admin/dashboard/sales"
          className="text-sm text-naver-neon hover:underline"
        >
          ← 매출 통합 성과
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="bg-surface-darkSoft border border-ink-700 rounded-lg p-8 text-center">
          <p className="text-ink-300 mb-3">광고 성과 데이터 없음</p>
          <Link
            href="/admin/settings/ad-sync"
            className="text-naver-neon hover:underline text-sm"
          >
            → 시트 sync 설정으로 이동
          </Link>
        </div>
      ) : (
        <>
          {/* KPI 7개 */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <Kpi label="노출수" value={total.impressions.toLocaleString()} />
            <Kpi label="클릭수" value={total.clicks.toLocaleString()} />
            <Kpi label="CTR" value={`${ctr.toFixed(2)}%`} />
            <Kpi label="전환수" value={total.conversions.toLocaleString()} />
            <Kpi label="CVR" value={`${cvr.toFixed(2)}%`} />
            <Kpi label="CPA" value={`${Math.round(cpa).toLocaleString()}원`} />
            <Kpi label="총 광고비" value={`${total.spend.toLocaleString()}원`} accent />
          </div>

          {/* 매체별 합계 */}
          <section className="bg-surface-darkSoft border border-ink-700 rounded-lg overflow-x-auto">
            <h2 className="text-lg font-bold text-ink-100 px-5 pt-4">매체별 합계</h2>
            <table className="w-full text-sm mt-3">
              <thead className="bg-ink-900 text-ink-400 text-xs">
                <tr>
                  <th className="text-left px-3 py-2">매체</th>
                  <th className="text-right px-3 py-2">노출</th>
                  <th className="text-right px-3 py-2">클릭</th>
                  <th className="text-right px-3 py-2">CTR</th>
                  <th className="text-right px-3 py-2">전환</th>
                  <th className="text-right px-3 py-2">CVR</th>
                  <th className="text-right px-3 py-2">광고비</th>
                  <th className="text-right px-3 py-2">CPA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {Array.from(byChannel.entries())
                  .sort((a, b) => b[1].spend - a[1].spend)
                  .map(([ch, v]) => {
                    const ctrCh = v.impressions > 0 ? (v.clicks / v.impressions) * 100 : 0
                    const cvrCh = v.clicks > 0 ? (v.conversions / v.clicks) * 100 : 0
                    const cpaCh = v.conversions > 0 ? v.spend / v.conversions : 0
                    return (
                      <tr key={ch} className="hover:bg-ink-800/30">
                        <td className="px-3 py-2 text-ink-200">
                          {CHANNEL_LABEL[ch] ?? ch}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-ink-300">
                          {v.impressions.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-ink-300">
                          {v.clicks.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-ink-300">
                          {ctrCh.toFixed(2)}%
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-ink-200">
                          {v.conversions.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-ink-300">
                          {cvrCh.toFixed(2)}%
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-naver-neon">
                          {v.spend.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-amber-300">
                          {Math.round(cpaCh).toLocaleString()}
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </section>
        </>
      )}

      <p className="text-xs text-ink-500">
        ※ 골격 — 차트(시계열), 기간 필터, 서비스×매체 교차 표 등은 다음 단계에서 추가.
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
