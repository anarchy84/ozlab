// ─────────────────────────────────────────────
// /admin/dashboard/sales — 매출 통합 성과 (코호트 매트릭스)
//
// 핵심 KPI 정의 (마케팅팀 합의):
//   ▶ "이번달 전체매출" = 이번달 revenue_date 발생한 모든 매출 (코호트 무관)
//   ▶ "이번달 매출(코호트)" = 이번달 디비 + 이번달 발생
//   ▶ "지난달 디비 매출" = 지난달 들어온 리드 + 이번달 발생
//   ▶ "지지난달 디비 매출" = 지지난달 들어온 리드 + 이번달 발생
//   ▶ 오늘도 동일 패턴
//
// 광고 ROAS 시점차 보정 핵심 — 지난달 광고가 이번달 매출 만든 사실 시각화.
// ─────────────────────────────────────────────
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireAdminProfile } from '@/lib/admin/auth-helpers'
import { createAdminClient } from '@/lib/supabase/admin'
import { CohortBreakdown } from './CohortBreakdown'
import { CohortMatrix } from './CohortMatrix'
import { PeriodControl } from './PeriodControl'

export const dynamic = 'force-dynamic'

interface SP {
  from?: string
  to?: string
  preset?: string
}

interface MatrixRow {
  rev_month: string
  lead_month: string
  total_amount: number
  total_gift: number
  total_net: number
  revenue_count: number
  lead_count: number
}

// KST 기준 ymd
function ymd(d: Date): string {
  const kst = new Date(d.getTime() + 9 * 3600000)
  return kst.toISOString().slice(0, 10)
}

function startOfMonth(monthsAgo: number): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() - monthsAgo + 1).padStart(2, '0')}-01`
    .replace(/(\d{4})-(\d+)-/, (_, y, m) => {
      const mm = parseInt(m, 10)
      const yy = parseInt(y, 10)
      const realY = yy + Math.floor((mm - 1) / 12)
      const realM = ((mm - 1) % 12 + 12) % 12 + 1
      return `${realY}-${String(realM).padStart(2, '0')}-`
    })
}

function monthLabel(monthStart: string): string {
  const [y, m] = monthStart.split('-')
  return `${y}-${m}`
}

export default async function SalesDashboardPage({ searchParams }: { searchParams: SP }) {
  const profile = await requireAdminProfile()
  const allowed = ['super_admin', 'marketing', 'tm_lead', 'admin', 'marketer']
  if (!allowed.includes(profile.role)) {
    redirect('/admin?error=forbidden')
  }

  const admin = createAdminClient()
  const today = ymd(new Date())

  // 6개월 매트릭스 + 누적
  const [matrixRes, sumAllRes, adSpendRes, todayCohortRes] = await Promise.all([
    admin
      .from('v_revenue_cohort_matrix')
      .select('*')
      .gte('rev_month', startOfMonth(5)) // 최근 6개월
      .order('rev_month', { ascending: false })
      .order('lead_month', { ascending: false }),
    admin.from('revenue_records').select('amount, gift_amount, net_amount'),
    admin.from('ad_metrics').select('spend, conversions'),
    // 오늘 매출 (revenue_date = today)
    admin
      .from('v_revenue_cohort_daily')
      .select('*')
      .eq('rev_date', today),
  ])

  const matrix: MatrixRow[] = (matrixRes.data ?? []) as MatrixRow[]

  // 누적
  const totalAmount = (sumAllRes.data ?? []).reduce((s, r: { amount: number }) => s + Number(r.amount), 0)
  const totalGift = (sumAllRes.data ?? []).reduce((s, r: { gift_amount: number }) => s + Number(r.gift_amount), 0)
  const totalNet = (sumAllRes.data ?? []).reduce((s, r: { net_amount: number }) => s + Number(r.net_amount), 0)
  const totalSpend = (adSpendRes.data ?? []).reduce((s, r: { spend: number }) => s + Number(r.spend), 0)
  const roas = totalSpend > 0 ? (totalAmount / totalSpend) * 100 : null

  // 이번달 / 지난달 / 지지난달 코호트 카드 데이터
  const curMonth = startOfMonth(0)
  const lastMonth = startOfMonth(1)
  const lastLastMonth = startOfMonth(2)

  // 이번달 발생 매출 (revenue_date 가 이번달) — 코호트별 분해
  const curMonthRows = matrix.filter((r) => r.rev_month === curMonth)
  const curMonthTotal = curMonthRows.reduce((s, r) => s + Number(r.total_amount ?? 0), 0)
  const curMonthNet = curMonthRows.reduce((s, r) => s + Number(r.total_net ?? 0), 0)

  const curMonthBreakdown = [
    {
      label: `당월 디비 (${monthLabel(curMonth)} 코호트)`,
      hint: '이번달 들어온 리드의 이번달 매출',
      amount: curMonthRows.find((r) => r.lead_month === curMonth)?.total_amount ?? 0,
      net: curMonthRows.find((r) => r.lead_month === curMonth)?.total_net ?? 0,
    },
    {
      label: `지난달 디비 (${monthLabel(lastMonth)} 코호트)`,
      hint: '지난달 리드 → 이번달 개통',
      amount: curMonthRows.find((r) => r.lead_month === lastMonth)?.total_amount ?? 0,
      net: curMonthRows.find((r) => r.lead_month === lastMonth)?.total_net ?? 0,
    },
    {
      label: `지지난달 디비 (${monthLabel(lastLastMonth)} 코호트)`,
      hint: '지지난달 리드 → 이번달 개통',
      amount: curMonthRows.find((r) => r.lead_month === lastLastMonth)?.total_amount ?? 0,
      net: curMonthRows.find((r) => r.lead_month === lastLastMonth)?.total_net ?? 0,
    },
    {
      label: '그 이전 코호트 (3개월+ 오래된 디비)',
      hint: '장기 누적형 매체의 회수',
      amount: curMonthRows
        .filter((r) => r.lead_month < lastLastMonth)
        .reduce((s, r) => s + Number(r.total_amount ?? 0), 0),
      net: curMonthRows
        .filter((r) => r.lead_month < lastLastMonth)
        .reduce((s, r) => s + Number(r.total_net ?? 0), 0),
    },
  ]

  // 오늘 매출 코호트 분해
  type DailyCohort = {
    rev_date: string
    lead_month: string
    lead_date: string
    total_amount: number
    total_net: number
  }
  const todayRows = (todayCohortRes.data ?? []) as DailyCohort[]
  const todayTotal = todayRows.reduce((s, r) => s + Number(r.total_amount ?? 0), 0)
  const todayNet = todayRows.reduce((s, r) => s + Number(r.total_net ?? 0), 0)

  const todayBreakdown = [
    {
      label: '오늘 디비',
      hint: '오늘 들어온 리드 + 오늘 개통 (즉시 회수)',
      amount: todayRows.filter((r) => r.lead_date === today).reduce((s, r) => s + Number(r.total_amount ?? 0), 0),
      net: todayRows.filter((r) => r.lead_date === today).reduce((s, r) => s + Number(r.total_net ?? 0), 0),
    },
    {
      label: '이번달 디비',
      hint: '이번달 다른 날 들어온 리드 → 오늘 개통',
      amount: todayRows
        .filter((r) => r.lead_date !== today && r.lead_month === curMonth)
        .reduce((s, r) => s + Number(r.total_amount ?? 0), 0),
      net: todayRows
        .filter((r) => r.lead_date !== today && r.lead_month === curMonth)
        .reduce((s, r) => s + Number(r.total_net ?? 0), 0),
    },
    {
      label: '지난달 디비',
      hint: '지난달 리드 → 오늘 개통',
      amount: todayRows.filter((r) => r.lead_month === lastMonth).reduce((s, r) => s + Number(r.total_amount ?? 0), 0),
      net: todayRows.filter((r) => r.lead_month === lastMonth).reduce((s, r) => s + Number(r.total_net ?? 0), 0),
    },
    {
      label: '그 이전 디비',
      hint: '2개월+ 오래된 리드 → 오늘 회수',
      amount: todayRows.filter((r) => r.lead_month < lastMonth).reduce((s, r) => s + Number(r.total_amount ?? 0), 0),
      net: todayRows.filter((r) => r.lead_month < lastMonth).reduce((s, r) => s + Number(r.total_net ?? 0), 0),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-100">매출 통합 성과</h1>
          <p className="text-sm text-ink-400 mt-1">
            매출 발생 시점 × 리드 코호트 — 광고 ROAS 시점차 보정
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/api/admin/revenue/export"
            className="text-xs px-3 py-1.5 bg-ink-800 hover:bg-ink-700 text-ink-200 rounded border border-ink-700"
          >
            📥 CSV 다운로드
          </a>
          <Link
            href="/admin/dashboard/paid-media"
            className="text-sm text-naver-neon hover:underline"
          >
            → 광고 퍼포먼스 뷰
          </Link>
        </div>
      </div>

      {/* 기간 컨트롤 */}
      <PeriodControl />

      {/* 메인 카드 — 이번달 통장 매출 코호트 분해 */}
      <CohortBreakdown
        title={`📅 이번달 (${monthLabel(curMonth)}) 통장 매출`}
        subtitle="revenue_date 기준 — 회사 통장 들어온 돈을 리드 코호트별 분해"
        totalAmount={curMonthTotal}
        totalNet={curMonthNet}
        breakdown={curMonthBreakdown}
        accent
      />

      {/* 오늘 카드 */}
      <CohortBreakdown
        title={`📆 오늘 (${today}) 통장 매출`}
        subtitle="오늘 발생한 매출을 리드 들어온 시점별 분해"
        totalAmount={todayTotal}
        totalNet={todayNet}
        breakdown={todayBreakdown}
        compact
      />

      {/* 코호트 매트릭스 6×6 */}
      <CohortMatrix
        rows={matrix}
        currentMonth={curMonth}
      />

      {/* 누적 KPI */}
      <section>
        <h2 className="text-sm font-bold text-ink-300 mb-2">📊 누적 (전체)</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="총 매출" value={`${totalAmount.toLocaleString()}원`} />
          <Kpi label="총 광고비" value={`${totalSpend.toLocaleString()}원`} />
          <Kpi label="총 사은품" value={`${totalGift.toLocaleString()}원`} />
          <Kpi
            label="ROAS (시점 무관)"
            value={roas != null ? `${roas.toFixed(2)}%` : '—'}
            accent={roas != null && roas >= 100}
          />
          <Kpi label="순매출" value={`${totalNet.toLocaleString()}원`} />
        </div>
        <p className="text-[11px] text-ink-500 mt-1">
          ※ 누적 ROAS 는 시점 무관 — 진짜 매체 평가는 위 매트릭스의 코호트 회수율로
        </p>
      </section>

      {/* 운영 가이드 박스 */}
      <section className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-5">
        <h2 className="text-base font-bold text-amber-300 mb-3">
          💡 마케팅팀 운영 룰 (시점차 보정 의사결정)
        </h2>
        <ol className="space-y-2 text-sm text-ink-200 list-decimal list-inside">
          <li>
            신규 광고 매체는 <strong className="text-amber-300">3개월 누적 ROAS</strong> 로 평가 (당월 ROAS 단발 평가 금지)
          </li>
          <li>
            <strong>단발성 매체</strong> (당근·이벤트 광고 등 — 당월 회수형) → 당월 ROAS 150%+ 미달 시 즉시 컷
          </li>
          <li>
            <strong>누적형 매체</strong> (네이버 검색·자체 블로그 등) → ROAS 200%+ 회수까지 인내
          </li>
          <li>
            매트릭스 <strong>대각선</strong> (당월 코호트 = 당월 회수) 약하면 단발성 매체 비중 ↑ 검토 / <strong>우측 상단</strong> (과거 코호트 → 이번달 회수) 강하면 누적형 매체 잘 굴러가는 신호
          </li>
        </ol>
      </section>

      <p className="text-xs text-ink-500">
        ※ 다음 단계 : 매체별 코호트 ROAS (매체 × 발생월 × 코호트월 3차원), 차트(시계열 라인)
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
