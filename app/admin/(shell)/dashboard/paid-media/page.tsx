// ─────────────────────────────────────────────
// /admin/dashboard/paid-media — 광고 퍼포먼스 (페이드미디어 분석)
//
// 데이터 소스 3개 조인 :
//   - ad_metrics (광고비, 시트 sync 입력)
//   - consultations (리드, utm 자동 캡쳐)
//   - revenue_records (개통/매출)
//
// 정규화 :
//   - channel_mapping 으로 utm_source/utm_medium → channel_code 표준화
//   - ad_metrics.channel 도 동일 channel_code 사용 (시트 입력 시 표준 코드)
//
// 지표 :
//   - 매체별 : 노출/클릭/CTR/리드/CPL/전환/CPA/광고비/매출/ROAS/lead→개통률
//   - 일별 시계열 (광고비/리드/전환/매출)
//   - 캠페인별 드릴다운 (utm_campaign)
// ─────────────────────────────────────────────

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireAdminProfile } from '@/lib/admin/auth-helpers'
import {
  loadPaidMediaSummary,
  fmtInt,
  fmtMoney,
  fmtPercent,
  fmtCpl,
  type PeriodPreset,
} from '@/lib/admin/paid-media'
import { PeriodControl } from './PeriodControl'

export const dynamic = 'force-dynamic'

export default async function PaidMediaDashboardPage({
  searchParams,
}: {
  searchParams?: { preset?: string }
}) {
  const profile = await requireAdminProfile()
  const allowed = ['super_admin', 'marketing', 'tm_lead', 'admin', 'marketer']
  if (!allowed.includes(profile.role)) {
    redirect('/admin?error=forbidden')
  }

  const preset = (searchParams?.preset ?? 'week') as PeriodPreset
  const summary = await loadPaidMediaSummary(preset)

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-100">광고 퍼포먼스</h1>
          <p className="text-sm text-ink-400 mt-1">
            ad_metrics(광고비) × consultations(리드) × revenue(매출) 3개 데이터 조인 분석.
            기간 <strong className="text-brand-blue">{summary.range.label}</strong>{' '}
            <span className="text-ink-500">({summary.range.from} ~ {summary.range.to})</span>
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link href="/admin/dashboard/sales" className="text-ink-400 hover:text-ink-100">
            매출 통합 →
          </Link>
          <Link href="/admin/settings/ad-sync" className="text-ink-400 hover:text-ink-100">
            시트 sync →
          </Link>
        </div>
      </header>

      <PeriodControl />

      {/* 페이드미디어 합계 KPI 9종 */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-9 gap-2">
        <Kpi label="노출수"   value={fmtInt(summary.totals.impressions)} />
        <Kpi label="클릭수"   value={fmtInt(summary.totals.clicks)} />
        <Kpi label="CTR"      value={fmtPercent(summary.totals.ctr)} />
        <Kpi label="리드"     value={fmtInt(summary.totals.leads)} highlight="blue" />
        <Kpi label="CPL"      value={fmtCpl(summary.totals.cpl)} highlight="amber" />
        <Kpi label="전환"     value={fmtInt(summary.totals.conversions)} />
        <Kpi label="CPA"      value={fmtCpl(summary.totals.cpa)} highlight="amber" />
        <Kpi label="광고비"   value={fmtMoney(summary.totals.spend)} highlight="neon" />
        <Kpi label="ROAS"     value={fmtPercent(summary.totals.roas, 0)} highlight={roasColor(summary.totals.roas)} />
      </section>
      <p className="text-[11px] text-ink-500">
        ※ KPI 카드는 <strong>페이드 미디어 채널만</strong> 합산. 자연유입·자체사이트·리퍼럴 제외. 매체별 표에서 전체 확인 가능.
      </p>

      {/* 매체별 종합 표 */}
      <section className="bg-surface-darkSoft border border-ink-700 rounded-lg overflow-x-auto">
        <div className="px-5 pt-4 pb-2 flex items-baseline justify-between">
          <h2 className="text-lg font-bold text-ink-100">매체별 성과</h2>
          <span className="text-xs text-ink-500">광고비 내림차순 · 페이드 우선</span>
        </div>
        {summary.byChannel.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-ink-500">
            데이터 없음. <Link href="/admin/settings/ad-sync" className="text-brand-blue underline">시트 sync</Link> 또는 광고 트래픽 유입 후 확인.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-ink-900 text-ink-400 text-xs">
              <tr>
                <th className="text-left px-3 py-2">매체</th>
                <th className="text-right px-3 py-2">노출</th>
                <th className="text-right px-3 py-2">클릭</th>
                <th className="text-right px-3 py-2">CTR</th>
                <th className="text-right px-3 py-2">광고비</th>
                <th className="text-right px-3 py-2 bg-brand-blue/10">리드</th>
                <th className="text-right px-3 py-2 bg-brand-blue/10 text-amber-300">CPL</th>
                <th className="text-right px-3 py-2">전환</th>
                <th className="text-right px-3 py-2 text-amber-300">CPA</th>
                <th className="text-right px-3 py-2">매출</th>
                <th className="text-right px-3 py-2">ROAS</th>
                <th className="text-right px-3 py-2 text-ink-500">개통률</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800">
              {summary.byChannel.map((r) => (
                <tr key={r.channel_code} className={`hover:bg-ink-800/30 ${!r.is_paid ? 'opacity-60' : ''}`}>
                  <td className="px-3 py-2 text-ink-200">
                    {r.channel_label}
                    {!r.is_paid && (
                      <span className="ml-1 text-[10px] text-ink-500">(비유료)</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-ink-400">{fmtInt(r.impressions)}</td>
                  <td className="px-3 py-2 text-right font-mono text-ink-400">{fmtInt(r.clicks)}</td>
                  <td className="px-3 py-2 text-right font-mono text-ink-400">{fmtPercent(r.ctr)}</td>
                  <td className="px-3 py-2 text-right font-mono text-brand-blue">{fmtMoney(r.spend)}</td>
                  <td className="px-3 py-2 text-right font-mono text-ink-100 bg-brand-blue/5">{fmtInt(r.leads)}</td>
                  <td className="px-3 py-2 text-right font-mono text-amber-300 bg-brand-blue/5">{fmtCpl(r.cpl)}</td>
                  <td className="px-3 py-2 text-right font-mono text-ink-200">{fmtInt(r.conversions)}</td>
                  <td className="px-3 py-2 text-right font-mono text-amber-300">{fmtCpl(r.cpa)}</td>
                  <td className="px-3 py-2 text-right font-mono text-ink-200">{fmtMoney(r.revenue)}</td>
                  <td className={`px-3 py-2 text-right font-mono font-bold ${roasTextClass(r.roas)}`}>
                    {fmtPercent(r.roas, 0)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-ink-500">{fmtPercent(r.lead_cvr, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* 일별 시계열 (간단 표 + 막대) */}
      {summary.dailySeries.length > 0 && (
        <section className="bg-surface-darkSoft border border-ink-700 rounded-lg overflow-x-auto">
          <div className="px-5 pt-4 pb-2">
            <h2 className="text-lg font-bold text-ink-100">일별 추이</h2>
            <p className="text-xs text-ink-500">광고비 / 리드 / 전환 / 매출 시간순</p>
          </div>
          <DailySeriesTable rows={summary.dailySeries} />
        </section>
      )}

      {/* 캠페인 드릴다운 */}
      {summary.byCampaign.length > 0 && (
        <section className="bg-surface-darkSoft border border-ink-700 rounded-lg overflow-x-auto">
          <div className="px-5 pt-4 pb-2">
            <h2 className="text-lg font-bold text-ink-100">캠페인별 성과</h2>
            <p className="text-xs text-ink-500">utm_campaign 기준 · 상위 50개</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-ink-900 text-ink-400 text-xs">
              <tr>
                <th className="text-left px-3 py-2">매체</th>
                <th className="text-left px-3 py-2">캠페인</th>
                <th className="text-right px-3 py-2">리드</th>
                <th className="text-right px-3 py-2">전환</th>
                <th className="text-right px-3 py-2">매출</th>
                <th className="text-right px-3 py-2">개통률</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800">
              {summary.byCampaign.map((r) => {
                const rate = r.leads > 0 ? (r.conversions / r.leads) * 100 : null
                return (
                  <tr key={`${r.channel_code}|${r.utm_campaign}`} className="hover:bg-ink-800/30">
                    <td className="px-3 py-2 text-ink-300">{r.channel_label}</td>
                    <td className="px-3 py-2 text-ink-200 font-mono text-xs">{r.utm_campaign}</td>
                    <td className="px-3 py-2 text-right font-mono text-ink-200">{fmtInt(r.leads)}</td>
                    <td className="px-3 py-2 text-right font-mono text-ink-200">{fmtInt(r.conversions)}</td>
                    <td className="px-3 py-2 text-right font-mono text-ink-200">{fmtMoney(r.revenue)}</td>
                    <td className="px-3 py-2 text-right font-mono text-ink-400">{fmtPercent(rate, 0)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      )}

      {/* 미매핑 utm 진단 */}
      {summary.unmappedLeadKeys.length > 0 && (
        <section className="bg-amber-900/20 border border-amber-700/40 rounded-lg p-4">
          <h3 className="text-sm font-bold text-amber-200 mb-2">
            ⚠️ 매핑 안 된 UTM 조합 ({summary.unmappedLeadKeys.length}개)
          </h3>
          <p className="text-xs text-amber-300/80 mb-2">
            아래 utm_source/utm_medium 조합이 channel_mapping 에 등록되지 않아 &quot;unmapped&quot; 로 집계됨.
            정확한 분석을 위해 SQL 또는 향후 어드민 매핑 페이지에서 추가하세요.
          </p>
          <code className="block bg-ink-900/50 rounded p-2 text-xs text-amber-100 font-mono whitespace-pre-wrap">
            {summary.unmappedLeadKeys.join('\n')}
          </code>
        </section>
      )}

      <p className="text-[11px] text-ink-500 pt-2">
        ※ 광고비는 시트 sync, 리드는 자동 어트리뷰션, 매출은 매출 등록 시 자동. 시트 sync는{' '}
        <Link href="/admin/settings/ad-sync" className="text-brand-blue underline">여기</Link> 에서.
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────
// 작은 컴포넌트들
// ─────────────────────────────────────────────
function Kpi({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: 'blue' | 'neon' | 'amber' | 'good' | 'warn' | 'bad' | null
}) {
  const color =
    highlight === 'blue'  ? 'text-brand-blue' :
    highlight === 'neon'  ? 'text-brand-neon' :
    highlight === 'amber' ? 'text-amber-300' :
    highlight === 'good'  ? 'text-emerald-300' :
    highlight === 'warn'  ? 'text-amber-300' :
    highlight === 'bad'   ? 'text-red-400' :
    'text-ink-100'
  return (
    <div className="bg-surface-darkSoft border border-ink-700 rounded-lg p-2.5">
      <div className="text-[10px] text-ink-500 uppercase tracking-wider">{label}</div>
      <div className={`text-base font-bold mt-1 font-mono ${color}`}>{value}</div>
    </div>
  )
}

function roasColor(roas: number | null): 'good' | 'warn' | 'bad' | null {
  if (roas === null) return null
  if (roas >= 200) return 'good'
  if (roas >= 100) return 'warn'
  return 'bad'
}

function roasTextClass(roas: number | null): string {
  if (roas === null) return 'text-ink-500'
  if (roas >= 200) return 'text-emerald-300'
  if (roas >= 100) return 'text-amber-300'
  return 'text-red-400'
}

// ─────────────────────────────────────────────
// 일별 추이 표 + 인라인 막대
// ─────────────────────────────────────────────
function DailySeriesTable({
  rows,
}: {
  rows: { date: string; spend: number; leads: number; conversions: number; revenue: number }[]
}) {
  const maxSpend = Math.max(1, ...rows.map((r) => r.spend))
  const maxLeads = Math.max(1, ...rows.map((r) => r.leads))

  return (
    <table className="w-full text-sm">
      <thead className="bg-ink-900 text-ink-400 text-xs">
        <tr>
          <th className="text-left px-3 py-2">일자</th>
          <th className="text-right px-3 py-2">광고비</th>
          <th className="text-left px-3 py-2 w-32">광고비 추이</th>
          <th className="text-right px-3 py-2">리드</th>
          <th className="text-left px-3 py-2 w-32">리드 추이</th>
          <th className="text-right px-3 py-2">전환</th>
          <th className="text-right px-3 py-2">매출</th>
          <th className="text-right px-3 py-2">CPL</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-ink-800">
        {rows.map((r) => {
          const cpl = r.leads > 0 ? r.spend / r.leads : null
          const spendBar = (r.spend / maxSpend) * 100
          const leadBar = (r.leads / maxLeads) * 100
          return (
            <tr key={r.date} className="hover:bg-ink-800/30">
              <td className="px-3 py-2 text-ink-300 font-mono text-xs">{r.date}</td>
              <td className="px-3 py-2 text-right font-mono text-brand-blue">{fmtMoney(r.spend)}</td>
              <td className="px-3 py-2">
                <Bar pct={spendBar} color="bg-brand-blue/60" />
              </td>
              <td className="px-3 py-2 text-right font-mono text-ink-100">{fmtInt(r.leads)}</td>
              <td className="px-3 py-2">
                <Bar pct={leadBar} color="bg-emerald-500/60" />
              </td>
              <td className="px-3 py-2 text-right font-mono text-ink-200">{fmtInt(r.conversions)}</td>
              <td className="px-3 py-2 text-right font-mono text-ink-200">{fmtMoney(r.revenue)}</td>
              <td className="px-3 py-2 text-right font-mono text-amber-300">{fmtCpl(cpl)}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full h-2 bg-ink-900 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
      />
    </div>
  )
}
