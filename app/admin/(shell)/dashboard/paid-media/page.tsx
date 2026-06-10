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
  const mediaPerformanceRows = [
    ...summary.dbPurchaseByChannel.map((r) => ({
      key: `db_purchase:${r.channel}`,
      sourceType: 'db_purchase' as const,
      channelLabel: r.channel,
      isPaid: true,
      impressions: null,
      clicks: null,
      ctr: null,
      spend: r.spend,
      adLeads: r.lead_qty,
      adCpl: r.unit_cost,
      leads: null,
      cpl: null,
      conversions: null,
      cpa: null,
      revenue: null,
      roas: null,
      leadCvr: null,
    })),
    ...summary.byChannel.map((r) => ({
      key: `channel:${r.channel_code}`,
      sourceType: 'paid_media' as const,
      channelLabel: r.channel_label,
      isPaid: r.is_paid,
      impressions: r.impressions,
      clicks: r.clicks,
      ctr: r.ctr,
      spend: r.spend,
      adLeads: r.ad_leads,
      adCpl: r.ad_cpl,
      leads: r.leads,
      cpl: r.cpl,
      conversions: r.conversions,
      cpa: r.cpa,
      revenue: r.revenue,
      roas: r.roas,
      leadCvr: r.lead_cvr,
    })),
  ].sort((a, b) => {
    if (a.isPaid !== b.isPaid) return a.isPaid ? -1 : 1
    return b.spend - a.spend
  })

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

      {/* DB 매입 (시트 sync 기반 — 공급자 일괄 전달) */}
      {summary.dbPurchaseTotals.lead_qty > 0 || summary.dbPurchaseByChannel.length > 0 ? (
        <section className="bg-violet-900/10 border border-violet-700/40 rounded-lg p-4 space-y-3">
          <div className="flex items-baseline justify-between">
            <div>
              <h2 className="text-base font-bold text-violet-200">📦 DB 매입 (시트 sync)</h2>
              <p className="text-xs text-violet-300/70">
                공급자가 일괄 전달하는 DB. utm 어트리뷰션 없이 시트 수량이 공식 수치.
              </p>
            </div>
            <Link href="/admin/settings/ad-sync" className="text-xs text-violet-300 hover:text-violet-100 underline">
              시트 sync →
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Kpi label="총 매입수량" value={fmtInt(summary.dbPurchaseTotals.lead_qty) + '건'} highlight="blue" />
            <Kpi label="총 매입비"   value={fmtMoney(summary.dbPurchaseTotals.spend)} highlight="neon" />
            <Kpi label="평균 단가"   value={fmtCpl(summary.dbPurchaseTotals.avg_unit_cost)} highlight="amber" />
          </div>
          {summary.dbPurchaseByChannel.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm bg-ink-900/40 rounded">
                <thead className="text-xs text-violet-300/70">
                  <tr>
                    <th className="text-left px-3 py-2">출처</th>
                    <th className="text-right px-3 py-2">매입수량</th>
                    <th className="text-right px-3 py-2">총매입비</th>
                    <th className="text-right px-3 py-2">평균 단가</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-800">
                  {summary.dbPurchaseByChannel.map((r) => (
                    <tr key={r.channel} className="hover:bg-ink-800/30">
                      <td className="px-3 py-2 text-ink-200">{r.channel}</td>
                      <td className="px-3 py-2 text-right font-mono text-ink-100">{fmtInt(r.lead_qty)}건</td>
                      <td className="px-3 py-2 text-right font-mono text-brand-neon">{fmtMoney(r.spend)}</td>
                      <td className="px-3 py-2 text-right font-mono text-amber-300">{fmtCpl(r.unit_cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {/* 페이드미디어 합계 KPI 9종 */}
      <div>
        <h2 className="text-base font-bold text-ink-200 mb-2">📣 페이드 미디어 (네이버/메타/구글 등)</h2>
        <p className="text-xs text-ink-500 mb-2">utm 자동 어트리뷰션 + ad_metrics 광고비 (source=paid_media)</p>
      </div>
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
        <Kpi label="노출수"      value={fmtInt(summary.totals.impressions)} />
        <Kpi label="클릭수"      value={fmtInt(summary.totals.clicks)} />
        <Kpi label="CTR"         value={fmtPercent(summary.totals.ctr)} />
        <Kpi label="광고 리드"   value={fmtInt(summary.totals.ad_leads)} highlight="blue" />
        <Kpi label="광고 CPL"    value={fmtCpl(summary.totals.ad_cpl)} highlight="amber" />
        <Kpi label="CRM 리드"    value={fmtInt(summary.totals.leads)} highlight="blue" />
        <Kpi label="개통"        value={fmtInt(summary.totals.conversions)} />
        <Kpi label="CPA (개통기준)" value={fmtCpl(summary.totals.cpa)} highlight="amber" />
        <Kpi label="광고비"      value={fmtMoney(summary.totals.spend)} highlight="neon" />
        <Kpi label="ROAS"        value={fmtPercent(summary.totals.roas, 0)} highlight={roasColor(summary.totals.roas)} />
      </section>
      <p className="text-[11px] text-ink-500">
        ※ <strong>광고 리드</strong> = 광고 플랫폼이 보고한 결과(시트 전환수). <strong>CRM 리드</strong> = 우리 사이트에 utm 매칭으로 도착한 리드.
        둘 다 표시하면 광고측 어트리뷰션 갭을 한눈에 볼 수 있음. KPI 합산은 페이드 미디어만 (자연유입·자체사이트 제외).
      </p>

      {/* 매체별 종합 표 */}
      <section className="bg-surface-darkSoft border border-ink-700 rounded-lg overflow-x-auto">
        <div className="px-5 pt-4 pb-2 flex items-baseline justify-between">
          <h2 className="text-lg font-bold text-ink-100">매체별 성과</h2>
          <span className="text-xs text-ink-500">광고비 내림차순 · 페이드/DB 매입 통합</span>
        </div>
        {mediaPerformanceRows.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-ink-500">
            데이터 없음. <Link href="/admin/settings/ad-sync" className="text-brand-blue underline">시트 sync</Link> 또는 광고 트래픽 유입 후 확인.
          </p>
        ) : (
          <>
          <table className="w-full text-sm">
            <thead className="bg-ink-900 text-ink-400 text-xs">
              <tr>
                <th className="text-left px-3 py-2">매체</th>
                <th className="text-right px-3 py-2">노출</th>
                <th className="text-right px-3 py-2">클릭</th>
                <th className="text-right px-3 py-2">CTR</th>
                <th className="text-right px-3 py-2">광고비</th>
                <th className="text-right px-3 py-2 bg-violet-500/10" title="광고 플랫폼이 보고한 결과수 (시트 전환수)">광고 리드</th>
                <th className="text-right px-3 py-2 bg-violet-500/10 text-amber-300">광고 CPL</th>
                <th className="text-right px-3 py-2 bg-brand-blue/10" title="우리 사이트에 utm 매칭으로 도착한 리드">CRM 리드</th>
                <th className="text-right px-3 py-2 bg-brand-blue/10 text-amber-300">CRM CPL</th>
                <th className="text-right px-3 py-2">개통</th>
                <th className="text-right px-3 py-2 text-amber-300">CPA</th>
                <th className="text-right px-3 py-2">매출</th>
                <th className="text-right px-3 py-2">ROAS</th>
                <th className="text-right px-3 py-2 text-ink-500">개통률</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800">
              {mediaPerformanceRows.map((r) => (
                <tr key={r.key} className={`hover:bg-ink-800/30 ${!r.isPaid ? 'opacity-60' : ''}`}>
                  <td className="px-3 py-2 text-ink-200">
                    {r.channelLabel}
                    {r.sourceType === 'db_purchase' && (
                      <span className="ml-1 rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-violet-200">
                        DB 매입
                      </span>
                    )}
                    {!r.isPaid && (
                      <span className="ml-1 text-[10px] text-ink-500">(비유료)</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-ink-400">{fmtOptionalInt(r.impressions)}</td>
                  <td className="px-3 py-2 text-right font-mono text-ink-400">{fmtOptionalInt(r.clicks)}</td>
                  <td className="px-3 py-2 text-right font-mono text-ink-400">{fmtPercent(r.ctr)}</td>
                  <td className="px-3 py-2 text-right font-mono text-brand-blue">{fmtMoney(r.spend)}</td>
                  <td className="px-3 py-2 text-right font-mono text-violet-200 bg-violet-500/5">{fmtOptionalInt(r.adLeads)}</td>
                  <td className="px-3 py-2 text-right font-mono text-amber-300 bg-violet-500/5">{fmtCpl(r.adCpl)}</td>
                  <td className="px-3 py-2 text-right font-mono text-ink-100 bg-brand-blue/5">{fmtOptionalInt(r.leads)}</td>
                  <td className="px-3 py-2 text-right font-mono text-amber-300 bg-brand-blue/5">{fmtCpl(r.cpl)}</td>
                  <td className="px-3 py-2 text-right font-mono text-ink-200">{fmtOptionalInt(r.conversions)}</td>
                  <td className="px-3 py-2 text-right font-mono text-amber-300">{fmtCpl(r.cpa)}</td>
                  <td className="px-3 py-2 text-right font-mono text-ink-200">{fmtOptionalMoney(r.revenue)}</td>
                  <td className={`px-3 py-2 text-right font-mono font-bold ${roasTextClass(r.roas)}`}>
                    {fmtPercent(r.roas, 0)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-ink-500">{fmtPercent(r.leadCvr, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[11px] text-ink-500 px-5 py-2">
            <span className="text-violet-300">■ 보라 컬럼</span> = 광고 플랫폼 보고 기준 (시트 sync, ad_metrics.conversions) ·
            <span className="text-brand-blue ml-2">■ 블루 컬럼</span> = CRM 도착 기준 (consultations utm 매칭) ·
            <span className="ml-2">DB 매입 행</span> = source=db_purchase 시트 비용/수량을 같은 표에 표시
          </p>
          </>
        )}
      </section>

      {/* 일별 시계열 (간단 표 + 막대) */}
      {summary.dailySeries.length > 0 && (
        <section className="bg-surface-darkSoft border border-ink-700 rounded-lg overflow-x-auto">
          <div className="px-5 pt-4 pb-2">
            <h2 className="text-lg font-bold text-ink-100">일별 추이</h2>
            <p className="text-xs text-ink-500">페이드 광고비 / DB 매입비 / 광고 리드 / CRM 리드 / 개통 / 매출 시간순</p>
          </div>
          <DailySeriesTable rows={summary.dailySeries} />
        </section>
      )}

      {/* 캠페인 드릴다운 */}
      {summary.byCampaign.length > 0 && (
        <section className="bg-surface-darkSoft border border-ink-700 rounded-lg overflow-x-auto">
          <div className="px-5 pt-4 pb-2">
            <h2 className="text-lg font-bold text-ink-100">캠페인별 성과 <span className="text-xs font-normal text-ink-500">(CRM 기준)</span></h2>
            <p className="text-xs text-ink-500">utm_campaign 매칭 기준 · 상위 50개. 광고 플랫폼 캠페인 raw 는 ad_metrics 에 저장 안 됨 — 시트의 캠페인 단위 분석은 시트에서 직접.</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-ink-900 text-ink-400 text-xs">
              <tr>
                <th className="text-left px-3 py-2">매체</th>
                <th className="text-left px-3 py-2">캠페인 (utm_campaign)</th>
                <th className="text-right px-3 py-2 bg-brand-blue/10">CRM 리드</th>
                <th className="text-right px-3 py-2">개통</th>
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

function fmtOptionalInt(n: number | null): string {
  if (n === null) return '-'
  return fmtInt(n)
}

function fmtOptionalMoney(n: number | null): string {
  if (n === null) return '-'
  return fmtMoney(n)
}

// ─────────────────────────────────────────────
// 일별 추이 표 + 인라인 막대
// ─────────────────────────────────────────────
function DailySeriesTable({
  rows,
}: {
  rows: {
    date: string
    spend: number
    db_purchase_spend: number
    db_purchase_leads: number
    ad_leads: number
    leads: number
    conversions: number
    revenue: number
  }[]
}) {
  const maxSpend           = Math.max(1, ...rows.map((r) => r.spend))
  const maxDbPurchaseSpend = Math.max(1, ...rows.map((r) => r.db_purchase_spend))
  const maxAdLeads         = Math.max(1, ...rows.map((r) => r.ad_leads))
  const maxLeads           = Math.max(1, ...rows.map((r) => r.leads))

  return (
    <table className="w-full text-sm">
      <thead className="bg-ink-900 text-ink-400 text-xs">
        <tr>
          <th className="text-left px-3 py-2">일자</th>
          <th className="text-right px-3 py-2">페이드 광고비</th>
          <th className="text-left px-3 py-2 w-28">페이드 광고비 추이</th>
          <th className="text-right px-3 py-2 bg-violet-500/5">DB 매입비</th>
          <th className="text-left px-3 py-2 w-28 bg-violet-500/5">DB 매입비 추이</th>
          <th className="text-right px-3 py-2 bg-violet-500/5">DB 매입수</th>
          <th className="text-right px-3 py-2 bg-violet-500/10">광고 리드</th>
          <th className="text-left px-3 py-2 w-28 bg-violet-500/10">광고 리드 추이</th>
          <th className="text-right px-3 py-2 bg-brand-blue/10">CRM 리드</th>
          <th className="text-left px-3 py-2 w-28 bg-brand-blue/10">CRM 리드 추이</th>
          <th className="text-right px-3 py-2">개통</th>
          <th className="text-right px-3 py-2">매출</th>
          <th className="text-right px-3 py-2">광고 CPL</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-ink-800">
        {rows.map((r) => {
          const adCpl = r.ad_leads > 0 ? r.spend / r.ad_leads : null
          const spendBar           = (r.spend / maxSpend) * 100
          const dbPurchaseSpendBar = (r.db_purchase_spend / maxDbPurchaseSpend) * 100
          const adLeadBar          = (r.ad_leads / maxAdLeads) * 100
          const leadBar            = (r.leads / maxLeads) * 100
          return (
            <tr key={r.date} className="hover:bg-ink-800/30">
              <td className="px-3 py-2 text-ink-300 font-mono text-xs">{r.date}</td>
              <td className="px-3 py-2 text-right font-mono text-brand-blue">{fmtMoney(r.spend)}</td>
              <td className="px-3 py-2">
                <Bar pct={spendBar} color="bg-brand-blue/60" />
              </td>
              <td className="px-3 py-2 text-right font-mono text-violet-200 bg-violet-500/5">{fmtMoney(r.db_purchase_spend)}</td>
              <td className="px-3 py-2 bg-violet-500/5">
                <Bar pct={dbPurchaseSpendBar} color="bg-violet-400/60" />
              </td>
              <td className="px-3 py-2 text-right font-mono text-violet-200 bg-violet-500/5">{fmtInt(r.db_purchase_leads)}</td>
              <td className="px-3 py-2 text-right font-mono text-violet-200 bg-violet-500/5">{fmtInt(r.ad_leads)}</td>
              <td className="px-3 py-2 bg-violet-500/5">
                <Bar pct={adLeadBar} color="bg-violet-400/60" />
              </td>
              <td className="px-3 py-2 text-right font-mono text-ink-100 bg-brand-blue/5">{fmtInt(r.leads)}</td>
              <td className="px-3 py-2 bg-brand-blue/5">
                <Bar pct={leadBar} color="bg-emerald-500/60" />
              </td>
              <td className="px-3 py-2 text-right font-mono text-ink-200">{fmtInt(r.conversions)}</td>
              <td className="px-3 py-2 text-right font-mono text-ink-200">{fmtMoney(r.revenue)}</td>
              <td className="px-3 py-2 text-right font-mono text-amber-300">{fmtCpl(adCpl)}</td>
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
