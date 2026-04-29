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
  ConsultationFunnelRow,
  ConsultationByChannelRow,
  CtaPerformanceRow,
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

export default async function AdminDashboardPage() {
  const profile = await requireAdminProfile()
  const supabase = createClient()

  // 병렬 쿼리 6개 (CTA 성과 추가)
  const [funnelRes, channelRes, statusesRes, recentRes, totalRes, ctaPerfRes] = await Promise.all([
    supabase.from('v_consultation_funnel').select('*'),
    supabase
      .from('v_consultation_by_channel')
      .select('*')
      .gte('day', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('day', { ascending: false }),
    supabase.from('db_statuses').select('*').order('sort_order'),
    supabase
      .from('consultations')
      .select('id, name, phone, store_name, status, status_id, created_at, utm_source')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('consultations').select('id', { count: 'exact', head: true }),
    supabase.from('v_cta_performance').select('*'),
  ])

  const funnel = (funnelRes.data as ConsultationFunnelRow[] | null) ?? []
  const channelRows =
    (channelRes.data as ConsultationByChannelRow[] | null) ?? []
  const statuses = (statusesRes.data as DbStatus[] | null) ?? []
  const recent = (recentRes.data as RecentRow[] | null) ?? []
  const total = totalRes.count ?? 0
  const ctaPerf = ((ctaPerfRes.data as CtaPerformanceRow[] | null) ?? [])
    .filter((c) => c.is_active)
    .sort((a, b) => (b.lead_count ?? 0) - (a.lead_count ?? 0))

  // 매체별 집계 (30일 누적) — channel별로 lead/conversion sum
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

      {/* 상태별 KPI 카드 */}
      <div>
        <h2 className="text-sm font-semibold text-ink-200 mb-2">
          상태별 신청
          <span className="text-xs text-ink-500 font-normal ml-2">
            (상태 마스터 자동 동기화)
          </span>
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {dashFunnel.map((f) => (
            <div
              key={f.status_code}
              className="bg-surface-darkSoft border border-ink-700 rounded-lg p-4 hover:border-ink-600 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="inline-block w-3 h-3 rounded-full"
                  style={{ backgroundColor: f.status_color }}
                  aria-hidden
                />
                <p className="text-xs text-ink-400">{f.status_label}</p>
              </div>
              <p className="text-2xl font-extrabold text-ink-100">
                {Number(f.total_count).toLocaleString()}
              </p>
              <p className="text-[10px] text-ink-500 mt-1">
                오늘 +{Number(f.today_count)} · 7일 +{Number(f.week_count)}
              </p>
            </div>
          ))}
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
                  <td className="px-4 py-2 text-right text-naver-neon font-semibold">
                    {r.conversions}
                  </td>
                  <td className="px-4 py-2 text-right text-naver-neon">
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

      {/* CTA별 전환율 (cta_buttons 마스터) */}
      <div>
        <div className="flex items-end justify-between mb-2">
          <h2 className="text-sm font-semibold text-ink-200">
            CTA별 성과 <span className="text-xs text-ink-500 font-normal">(전체 누적)</span>
          </h2>
          {isSuperAdmin(profile.role) && (
            <Link
              href="/admin/settings/cta"
              className="text-xs text-naver-neon hover:text-naver-green"
            >
              CTA 관리 →
            </Link>
          )}
        </div>
        <div className="bg-surface-darkSoft border border-ink-700 rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-900 text-ink-400 text-xs">
              <tr>
                <th className="text-left px-4 py-2 font-semibold">위치</th>
                <th className="text-left px-4 py-2 font-semibold">라벨</th>
                <th className="text-left px-4 py-2 font-semibold">UTM 캠페인</th>
                <th className="text-right px-4 py-2 font-semibold">신청</th>
                <th className="text-right px-4 py-2 font-semibold">전환</th>
                <th className="text-right px-4 py-2 font-semibold">전환율</th>
                <th className="text-right px-4 py-2 font-semibold">7일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700">
              {ctaPerf.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-ink-500 text-sm">
                    등록된 CTA가 없습니다.
                  </td>
                </tr>
              )}
              {ctaPerf.map((c) => (
                <tr key={c.cta_id} className="hover:bg-ink-800/40 transition-colors">
                  <td className="px-4 py-2 text-ink-200 font-medium">{c.placement}</td>
                  <td className="px-4 py-2 text-ink-200">{c.label}</td>
                  <td className="px-4 py-2 text-ink-400 text-xs font-mono">
                    {c.utm_campaign ?? '-'}
                  </td>
                  <td className="px-4 py-2 text-right text-ink-200">{c.lead_count}</td>
                  <td className="px-4 py-2 text-right text-naver-neon font-semibold">
                    {c.conversion_count}
                  </td>
                  <td className="px-4 py-2 text-right text-naver-neon">
                    {c.conversion_rate_pct ?? '0.00'}%
                  </td>
                  <td className="px-4 py-2 text-right text-ink-400">+{c.week_count}</td>
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
            className="text-sm text-naver-neon hover:text-naver-green transition-colors"
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
          className="bg-surface-darkSoft border border-ink-700 rounded-lg p-5 hover:border-naver-green/50 hover:bg-ink-800/50 transition-all"
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
              className="bg-surface-darkSoft border border-ink-700 rounded-lg p-5 hover:border-naver-green/50 hover:bg-ink-800/50 transition-all"
            >
              <p className="text-base font-bold text-ink-100">사용자 관리</p>
              <p className="text-sm text-ink-400 mt-1 break-keep">
                상담사·마케터를 초대하고 역할·활성을 관리합니다.
              </p>
            </Link>
            <Link
              href="/admin/settings/statuses"
              className="bg-surface-darkSoft border border-ink-700 rounded-lg p-5 hover:border-naver-green/50 hover:bg-ink-800/50 transition-all"
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
          className="bg-surface-darkSoft border border-ink-700 rounded-lg p-5 hover:border-naver-green/50 hover:bg-ink-800/50 transition-all"
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
