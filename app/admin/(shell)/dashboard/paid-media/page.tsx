// ─────────────────────────────────────────────
// /admin/dashboard/paid-media — 트래픽·광고 퍼포먼스
//
// 데이터 소스 4개 조인 :
//   - site_visits (실제 방문, first-party tracking)
//   - ad_metrics (광고비, 페이드 미디어 시트 sync 입력)
//   - consultations (리드, utm 자동 캡쳐)
//   - revenue_records (개통/매출)
//
// 정규화 :
//   - channel_mapping 으로 utm_source/utm_medium → channel_code 표준화
//   - ad_metrics.channel 도 동일 channel_code 사용 (시트 입력 시 표준 코드)
//
// 지표 :
//   - 매체별 : 노출/클릭/CTR/리드/CPL/전환/CPA/광고비/매출/ROAS/lead→개통률
//   - 일별 시계열 (방문/광고비/리드/전환/매출)
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
    ...summary.byChannel.map((r) => ({
      key: `channel:${r.channel_code}`,
      channelLabel: r.channel_label,
      isPaid: r.is_paid,
      impressions: r.impressions,
      clicks: r.clicks,
      ctr: r.ctr,
      pageviews: r.pageviews,
      visits: r.visits,
      visitors: r.visitors,
      clickToVisitRate: r.click_to_visit_rate,
      spend: r.spend,
      adLeads: r.ad_leads,
      adCpl: r.ad_cpl,
      leads: r.leads,
      visitToLeadRate: r.visit_to_lead_rate,
      cpl: r.cpl,
      conversions: r.conversions,
      cpa: r.cpa,
      revenue: r.revenue,
      roas: r.roas,
      leadCvr: r.lead_cvr,
      trafficGroup: r.traffic_group,
    })),
  ].sort((a, b) => {
    if (a.isPaid !== b.isPaid) return a.isPaid ? -1 : 1
    return b.spend - a.spend || b.visits - a.visits
  })

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-100">트래픽·광고 퍼포먼스</h1>
          <p className="text-sm text-ink-400 mt-1">
            site_visits(방문) × ad_metrics(광고비) × consultations(리드) × revenue(매출) 통합 분석.
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

      {/* 트래픽 합계 KPI */}
      <section className="bg-surface-darkSoft border border-ink-700 rounded-lg p-4">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <div>
            <h2 className="text-lg font-bold text-ink-100">방문자 유입 요약</h2>
            <p className="text-xs text-ink-500 mt-0.5">
              사이트 자체 방문 로그 기준. 광고관리자 수치가 아니라 실제 웹사이트 도착 기준입니다.
            </p>
          </div>
          <span className="text-xs text-ink-500">오가닉·페이드·직접유입 분리</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          <Kpi label="전체 방문" value={fmtInt(summary.trafficTotals.visits)} highlight="blue" />
          <Kpi label="전체 방문자" value={fmtInt(summary.trafficTotals.visitors)} />
          <Kpi label="오가닉 방문" value={fmtInt(summary.trafficTotals.organic.visits)} highlight="good" />
          <Kpi label="페이드 방문" value={fmtInt(summary.trafficTotals.paid.visits)} highlight="blue" />
          <Kpi label="직접 유입" value={fmtInt(summary.trafficTotals.direct.visits)} />
          <Kpi
            label="추천/자체 유입"
            value={fmtInt(summary.trafficTotals.referral.visits + summary.trafficTotals.site.visits)}
          />
        </div>
      </section>

      {/* 페이드미디어 합계 KPI */}
      <div>
        <h2 className="text-base font-bold text-ink-200 mb-2">페이드 미디어 성과</h2>
        <p className="text-xs text-ink-500 mb-2">네이버/메타/구글 등 광고비가 들어간 유입만 별도로 합산합니다.</p>
      </div>
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
        <Kpi label="노출수"      value={fmtInt(summary.totals.impressions)} />
        <Kpi label="클릭수"      value={fmtInt(summary.totals.clicks)} />
        <Kpi label="CTR"         value={fmtPercent(summary.totals.ctr)} />
        <Kpi label="실제 방문"   value={fmtInt(summary.totals.visits)} highlight="blue" />
        <Kpi label="고유 방문자" value={fmtInt(summary.totals.visitors)} />
        <Kpi label="도착률"      value={fmtPercent(summary.totals.click_to_visit_rate)} highlight="good" />
        <Kpi label="광고 리드"   value={fmtInt(summary.totals.ad_leads)} highlight="blue" />
        <Kpi label="광고 CPL"    value={fmtCpl(summary.totals.ad_cpl)} highlight="amber" />
        <Kpi label="CRM 리드"    value={fmtInt(summary.totals.leads)} highlight="blue" />
        <Kpi label="방문→신청률" value={fmtPercent(summary.totals.visit_to_lead_rate)} highlight="good" />
        <Kpi label="개통"        value={fmtInt(summary.totals.conversions)} />
        <Kpi label="CPA (개통기준)" value={fmtCpl(summary.totals.cpa)} highlight="amber" />
        <Kpi label="광고비"      value={fmtMoney(summary.totals.spend)} highlight="neon" />
        <Kpi label="ROAS"        value={fmtPercent(summary.totals.roas, 0)} highlight={roasColor(summary.totals.roas)} />
      </section>
      <p className="text-[11px] text-ink-500">
        ※ <strong>광고 리드</strong> = 광고 플랫폼이 보고한 결과(시트 전환수). <strong>CRM 리드</strong> = 우리 사이트에 utm 매칭으로 도착한 리드.
        <strong>실제 방문</strong> = 오즈랩페이 first-party 방문 세션. 둘 다 표시하면 광고측 클릭과 사이트 도착 갭을 한눈에 볼 수 있음.
        KPI 합산은 페이드 미디어만 집계하며, 오가닉·직접·자체사이트 유입은 위 방문자 유입 요약과 매체별 성과에서 별도 확인합니다.
      </p>

      {/* 매체별 종합 표 */}
      <section className="bg-surface-darkSoft border border-ink-700 rounded-lg overflow-x-auto">
        <div className="px-5 pt-4 pb-2 flex items-baseline justify-between">
          <h2 className="text-lg font-bold text-ink-100">매체별 성과</h2>
          <span className="text-xs text-ink-500">오가닉 + 페이드 미디어 통합 · 광고비/방문 내림차순</span>
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
                <th className="text-left px-3 py-2">유입 유형</th>
                <th className="text-right px-3 py-2">노출</th>
                <th className="text-right px-3 py-2">클릭</th>
                <th className="text-right px-3 py-2">CTR</th>
                <th className="text-right px-3 py-2 bg-brand-blue/5">실제 방문</th>
                <th className="text-right px-3 py-2 bg-brand-blue/5">고유 방문자</th>
                <th className="text-right px-3 py-2 bg-brand-blue/5">도착률</th>
                <th className="text-right px-3 py-2">광고비</th>
                <th className="text-right px-3 py-2 bg-violet-500/10" title="광고 플랫폼이 보고한 결과수 (시트 전환수)">광고 리드</th>
                <th className="text-right px-3 py-2 bg-violet-500/10 text-amber-300">광고 CPL</th>
                <th className="text-right px-3 py-2 bg-brand-blue/10" title="우리 사이트에 utm 매칭으로 도착한 리드">CRM 리드</th>
                <th className="text-right px-3 py-2 bg-brand-blue/10">방문→신청</th>
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
                    {!r.isPaid && (
                      <span className="ml-1 text-[10px] text-ink-500">(비유료)</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <TrafficBadge group={r.trafficGroup} />
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-ink-400">{fmtOptionalInt(r.impressions)}</td>
                  <td className="px-3 py-2 text-right font-mono text-ink-400">{fmtOptionalInt(r.clicks)}</td>
                  <td className="px-3 py-2 text-right font-mono text-ink-400">{fmtPercent(r.ctr)}</td>
                  <td className="px-3 py-2 text-right font-mono text-ink-100 bg-brand-blue/5">{fmtOptionalInt(r.visits)}</td>
                  <td className="px-3 py-2 text-right font-mono text-ink-200 bg-brand-blue/5">{fmtOptionalInt(r.visitors)}</td>
                  <td className="px-3 py-2 text-right font-mono text-brand-blue bg-brand-blue/5">{fmtPercent(r.clickToVisitRate)}</td>
                  <td className="px-3 py-2 text-right font-mono text-brand-blue">{fmtMoney(r.spend)}</td>
                  <td className="px-3 py-2 text-right font-mono text-violet-200 bg-violet-500/5">{fmtOptionalInt(r.adLeads)}</td>
                  <td className="px-3 py-2 text-right font-mono text-amber-300 bg-violet-500/5">{fmtCpl(r.adCpl)}</td>
                  <td className="px-3 py-2 text-right font-mono text-ink-100 bg-brand-blue/5">{fmtOptionalInt(r.leads)}</td>
                  <td className="px-3 py-2 text-right font-mono text-brand-neon bg-brand-blue/5">{fmtPercent(r.visitToLeadRate)}</td>
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
            <span className="text-brand-blue ml-2">■ 블루 컬럼</span> = 실제 방문(site_visits) + CRM 도착 기준 (consultations utm 매칭) ·
            유입 유형은 UTM과 referrer 기반으로 paid / organic / direct / referral / site 로 구분
          </p>
          </>
        )}
      </section>

      {/* 일별 시계열 (간단 표 + 막대) */}
      {summary.dailySeries.length > 0 && (
        <section className="bg-surface-darkSoft border border-ink-700 rounded-lg overflow-x-auto">
          <div className="px-5 pt-4 pb-2">
            <h2 className="text-lg font-bold text-ink-100">일별 추이</h2>
            <p className="text-xs text-ink-500">페이드 광고비 / 실제 방문 / 광고 리드 / CRM 리드 / 개통 / 매출 시간순</p>
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
type TrafficGroup = 'paid' | 'organic' | 'direct' | 'referral' | 'site' | 'other'

function TrafficBadge({ group }: { group: TrafficGroup }) {
  const styles = {
    paid: 'bg-brand-blue/15 text-brand-blue border-brand-blue/30',
    organic: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    direct: 'bg-ink-700 text-ink-200 border-ink-600',
    referral: 'bg-violet-500/10 text-violet-200 border-violet-500/30',
    site: 'bg-cyan-500/10 text-cyan-200 border-cyan-500/30',
    other: 'bg-amber-500/10 text-amber-200 border-amber-500/30',
  } satisfies Record<TrafficGroup, string>
  const labels = {
    paid: '페이드',
    organic: '오가닉',
    direct: '직접',
    referral: '추천',
    site: '자체',
    other: '기타',
  } satisfies Record<TrafficGroup, string>

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${styles[group]}`}>
      {labels[group]}
    </span>
  )
}

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
    pageviews: number
    visits: number
    visitors: number
    ad_leads: number
    leads: number
    conversions: number
    revenue: number
  }[]
}) {
  const maxSpend           = Math.max(1, ...rows.map((r) => r.spend))
  const maxAdLeads         = Math.max(1, ...rows.map((r) => r.ad_leads))
  const maxLeads           = Math.max(1, ...rows.map((r) => r.leads))

  return (
    <table className="w-full text-sm">
      <thead className="bg-ink-900 text-ink-400 text-xs">
        <tr>
          <th className="text-left px-3 py-2">일자</th>
          <th className="text-right px-3 py-2">페이드 광고비</th>
          <th className="text-left px-3 py-2 w-28">페이드 광고비 추이</th>
          <th className="text-right px-3 py-2 bg-brand-blue/5">실제 방문</th>
          <th className="text-right px-3 py-2 bg-brand-blue/5">고유 방문자</th>
          <th className="text-right px-3 py-2 bg-brand-blue/5">페이지뷰</th>
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
          const adLeadBar          = (r.ad_leads / maxAdLeads) * 100
          const leadBar            = (r.leads / maxLeads) * 100
          return (
            <tr key={r.date} className="hover:bg-ink-800/30">
              <td className="px-3 py-2 text-ink-300 font-mono text-xs">{r.date}</td>
              <td className="px-3 py-2 text-right font-mono text-brand-blue">{fmtMoney(r.spend)}</td>
              <td className="px-3 py-2">
                <Bar pct={spendBar} color="bg-brand-blue/60" />
              </td>
              <td className="px-3 py-2 text-right font-mono text-ink-100 bg-brand-blue/5">{fmtInt(r.visits)}</td>
              <td className="px-3 py-2 text-right font-mono text-ink-200 bg-brand-blue/5">{fmtInt(r.visitors)}</td>
              <td className="px-3 py-2 text-right font-mono text-ink-300 bg-brand-blue/5">{fmtInt(r.pageviews)}</td>
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
