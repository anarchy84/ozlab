// ─────────────────────────────────────────────
// /admin/consultations — 상담 신청 목록
//
// 구조 :
//   server (이 파일) : SSR 데이터 fetch + 검색/필터 GET form
//   client (ConsultationsListClient) : 표 + 상세 모달 트리거
//
// 강화 :
//   · status_id JOIN → db_statuses 색상으로 동적 렌더
//   · 상태 필터 동적 옵션 (db_statuses)
//   · 매체(utm_source) 필터
//   · 상담사 표시
//   · 행 클릭 → ConsultationDetailModal (메모/상태/이력/페이지네이션)
// ─────────────────────────────────────────────
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireAdminProfile } from '@/lib/admin/auth-helpers'
import type { DbStatus } from '@/lib/admin/types'
import { ConsultationsListClient, type ConsultationRow } from './ConsultationsListClient'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 30

interface SP {
  q?: string
  status_id?: string
  channel?: string
  from?: string       // YYYY-MM-DD
  to?: string         // YYYY-MM-DD
  preset?: string     // 'today' | 'week' | 'month' | 'last_month' | 'last_3m'
  page?: string
}

export default async function ConsultationsListPage({
  searchParams,
}: {
  searchParams: SP
}) {
  const profile = await requireAdminProfile()
  const supabase = createClient()

  const q = (searchParams.q ?? '').trim()
  const statusId = searchParams.status_id ?? ''
  const channel = (searchParams.channel ?? '').trim()
  const dateFrom = (searchParams.from ?? '').trim()
  const dateTo = (searchParams.to ?? '').trim()
  const preset = (searchParams.preset ?? '').trim()

  // preset → from/to 자동 계산 (직접 from/to 입력 시 우선)
  let effectiveFrom = dateFrom
  let effectiveTo = dateTo
  if (preset && !dateFrom && !dateTo) {
    const now = new Date()
    const today = now.toISOString().slice(0, 10)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10)
    const start7d = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10)
    const start3m = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().slice(0, 10)
    if (preset === 'today') { effectiveFrom = today; effectiveTo = today }
    else if (preset === 'week') { effectiveFrom = start7d; effectiveTo = today }
    else if (preset === 'month') { effectiveFrom = startOfMonth; effectiveTo = today }
    else if (preset === 'last_month') { effectiveFrom = startOfLastMonth; effectiveTo = endOfLastMonth }
    else if (preset === 'last_3m') { effectiveFrom = start3m; effectiveTo = today }
  }

  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // 상태 마스터 + 매체 옵션 + 상담사 목록 (필터/모달용)
  const [{ data: statusesData }, { data: channelsData }, { data: counselorsData }] =
    await Promise.all([
      supabase.from('db_statuses').select('*').order('sort_order'),
      supabase
        .from('consultations')
        .select('utm_source')
        .not('utm_source', 'is', null)
        .limit(500),
      supabase
        .from('admin_users')
        .select('user_id, display_name')
        .eq('is_active', true)
        .in('role', ['super_admin', 'admin', 'counselor']),
    ])
  const statuses = (statusesData as DbStatus[] | null) ?? []
  const channels = Array.from(
    new Set(
      (channelsData ?? [])
        .map((r: { utm_source: string | null }) => r.utm_source)
        .filter(Boolean) as string[],
    ),
  ).sort()
  const counselors = (counselorsData ?? []) as {
    user_id: string
    display_name: string | null
  }[]

  // 본 목록
  let query = supabase
    .from('consultations')
    .select(
      `id, created_at, name, phone, store_name, industry, region, message, internal_memo,
       status, status_id, contacted_at, done_at,
       utm_source, utm_medium, utm_campaign, utm_term, utm_content,
       gclid, fbclid, referer, landing_page_path,
       inferred_channel, inferred_keyword, inferred_creative, inferred_landing_title, referer_domain,
       db_group_label, counselor_id, callable_time, device_type, contract_period,
       is_favorite, is_blacklisted, ip_address, last_contacted_at`,
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(from, to)

  if (statusId) query = query.eq('status_id', parseInt(statusId, 10))
  if (channel) query = query.eq('utm_source', channel)
  if (effectiveFrom) query = query.gte('created_at', effectiveFrom + 'T00:00:00')
  if (effectiveTo) query = query.lte('created_at', effectiveTo + 'T23:59:59')
  if (q) {
    query = query.or(
      `name.ilike.%${q}%,phone.ilike.%${q}%,store_name.ilike.%${q}%,internal_memo.ilike.%${q}%`,
    )
  }

  const { data, count, error } = await query
  const items = (data as ConsultationRow[] | null) ?? []
  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // counselor display_name 매핑
  const counselorMap: Record<string, string> = {}
  for (const c of counselors) {
    counselorMap[c.user_id] = c.display_name ?? c.user_id.slice(0, 8)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-100">상담 신청</h1>
          <p className="text-sm text-ink-400 mt-1">
            총 {total.toLocaleString()}건 · {page} / {totalPages} 페이지 · 행 클릭으로 상세
          </p>
        </div>
        <Link href="/admin" className="text-sm text-ink-400 hover:text-ink-100">
          ← 대시보드
        </Link>
      </div>

      {/* 빠른 기간 preset */}
      <div className="flex flex-wrap gap-2">
        {[
          { code: '', label: '전체 기간' },
          { code: 'today', label: '오늘' },
          { code: 'week', label: '최근 7일' },
          { code: 'month', label: '이번 달' },
          { code: 'last_month', label: '지난 달' },
          { code: 'last_3m', label: '최근 3개월' },
        ].map((p) => {
          const isActive = preset === p.code && !dateFrom && !dateTo
          const sp = new URLSearchParams()
          if (q) sp.set('q', q)
          if (statusId) sp.set('status_id', statusId)
          if (channel) sp.set('channel', channel)
          if (p.code) sp.set('preset', p.code)
          const href = `/admin/consultations${sp.toString() ? `?${sp.toString()}` : ''}`
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

      {/* 검색 / 필터 */}
      <form
        method="get"
        className="bg-surface-darkSoft border border-ink-700 rounded-lg p-4 flex flex-wrap gap-3 items-end"
      >
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="q" className="block text-xs text-ink-400 mb-1">
            검색 (이름·연락처·매장명·내부메모)
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="홍길동 / 010-1234 / 강남식당"
            className="w-full px-3 py-2 bg-ink-900 border border-ink-700 text-ink-100 placeholder-ink-500 rounded-md text-sm focus:outline-none focus:border-naver-green"
          />
        </div>
        <div>
          <label htmlFor="from" className="block text-xs text-ink-400 mb-1">
            시작일
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={dateFrom}
            className="px-3 py-2 bg-ink-900 border border-ink-700 text-ink-100 rounded-md text-sm focus:outline-none focus:border-naver-green"
          />
        </div>
        <div>
          <label htmlFor="to" className="block text-xs text-ink-400 mb-1">
            종료일
          </label>
          <input
            id="to"
            name="to"
            type="date"
            defaultValue={dateTo}
            className="px-3 py-2 bg-ink-900 border border-ink-700 text-ink-100 rounded-md text-sm focus:outline-none focus:border-naver-green"
          />
        </div>
        <div>
          <label htmlFor="status_id" className="block text-xs text-ink-400 mb-1">
            상태
          </label>
          <select
            id="status_id"
            name="status_id"
            defaultValue={statusId}
            className="px-3 py-2 bg-ink-900 border border-ink-700 text-ink-100 rounded-md text-sm focus:outline-none focus:border-naver-green"
          >
            <option value="">전체</option>
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="channel" className="block text-xs text-ink-400 mb-1">
            매체
          </label>
          <select
            id="channel"
            name="channel"
            defaultValue={channel}
            className="px-3 py-2 bg-ink-900 border border-ink-700 text-ink-100 rounded-md text-sm focus:outline-none focus:border-naver-green"
          >
            <option value="">전체</option>
            {channels.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-naver-green text-white rounded-md text-sm font-bold hover:bg-naver-dark transition-colors"
        >
          적용
        </button>
        {(q || statusId || channel || dateFrom || dateTo || preset) && (
          <Link
            href="/admin/consultations"
            className="px-4 py-2 border border-ink-700 rounded-md text-sm text-ink-300 hover:bg-ink-800 transition-colors"
          >
            초기화
          </Link>
        )}
      </form>

      {error && (
        <div className="bg-accent-red/15 border border-accent-red/40 text-accent-red px-4 py-3 rounded-md text-sm">
          데이터 조회 오류: {error.message}
        </div>
      )}

      <ConsultationsListClient
        items={items}
        statuses={statuses}
        counselors={counselors}
        counselorMap={counselorMap}
        myRole={profile.role}
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <PageLink
            disabled={page <= 1}
            href={makeHref({ q, status_id: statusId, channel, from: dateFrom, to: dateTo, preset, page: page - 1 })}
          >
            ← 이전
          </PageLink>
          <span className="text-ink-400 px-3">
            {page} / {totalPages}
          </span>
          <PageLink
            disabled={page >= totalPages}
            href={makeHref({ q, status_id: statusId, channel, from: dateFrom, to: dateTo, preset, page: page + 1 })}
          >
            다음 →
          </PageLink>
        </div>
      )}
    </div>
  )
}

function makeHref(args: {
  q: string
  status_id: string
  channel: string
  from: string
  to: string
  preset: string
  page: number
}): string {
  const sp = new URLSearchParams()
  if (args.q) sp.set('q', args.q)
  if (args.status_id) sp.set('status_id', args.status_id)
  if (args.channel) sp.set('channel', args.channel)
  if (args.from) sp.set('from', args.from)
  if (args.to) sp.set('to', args.to)
  if (args.preset && !args.from && !args.to) sp.set('preset', args.preset)
  if (args.page > 1) sp.set('page', String(args.page))
  const qs = sp.toString()
  return qs ? `/admin/consultations?${qs}` : '/admin/consultations'
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string
  disabled: boolean
  children: React.ReactNode
}) {
  if (disabled) {
    return (
      <span className="px-3 py-1.5 border border-ink-700 rounded-md text-ink-600 cursor-not-allowed">
        {children}
      </span>
    )
  }
  return (
    <Link
      href={href}
      className="px-3 py-1.5 border border-ink-700 rounded-md text-ink-200 hover:bg-ink-800 transition-colors"
    >
      {children}
    </Link>
  )
}
