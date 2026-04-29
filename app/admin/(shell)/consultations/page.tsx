// ─────────────────────────────────────────────
// /admin/consultations — 상담 신청 목록 (Phase A 강화)
//
// 강화 항목 :
//   · status_id JOIN → db_statuses 의 라벨·색상으로 동적 렌더
//   · 상태 필터를 db_statuses 동적 옵션으로
//   · 매체(utm_source) 필터 추가
//   · 상담사(counselor) 표시
//   · 즐겨찾기·블랙리스트 토글 표시
//   · 검색 (이름·연락처·매장명·내부메모)
// ─────────────────────────────────────────────
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireAdminProfile } from '@/lib/admin/auth-helpers'
import { ConsultationStatusActions } from '@/components/admin/ConsultationStatusActions'
import type { DbStatus } from '@/lib/admin/types'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 30

interface SP {
  q?: string
  status_id?: string
  channel?: string
  page?: string
}

interface ConsultationRow {
  id: string
  created_at: string
  name: string
  phone: string
  store_name: string | null
  industry: string | null
  region: string | null
  message: string | null
  internal_memo: string | null
  status: string | null
  status_id: number | null
  contacted_at: string | null
  done_at: string | null
  utm_source: string | null
  utm_campaign: string | null
  counselor_id: string | null
  is_favorite: boolean
  is_blacklisted: boolean
}

export default async function ConsultationsListPage({
  searchParams,
}: {
  searchParams: SP
}) {
  await requireAdminProfile()
  const supabase = createClient()

  const q = (searchParams.q ?? '').trim()
  const statusId = searchParams.status_id ?? ''
  const channel = (searchParams.channel ?? '').trim()
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // 상태 마스터 + 매체 옵션 (필터 드롭다운용)
  const [{ data: statusesData }, { data: channelsData }] = await Promise.all([
    supabase.from('db_statuses').select('*').order('sort_order'),
    supabase
      .from('consultations')
      .select('utm_source')
      .not('utm_source', 'is', null)
      .limit(500),
  ])
  const statuses = (statusesData as DbStatus[] | null) ?? []
  const channels = Array.from(
    new Set(
      (channelsData ?? [])
        .map((r: { utm_source: string | null }) => r.utm_source)
        .filter(Boolean) as string[],
    ),
  ).sort()

  let query = supabase
    .from('consultations')
    .select(
      `id, created_at, name, phone, store_name, industry, region, message, internal_memo,
       status, status_id, contacted_at, done_at, utm_source, utm_campaign,
       counselor_id, is_favorite, is_blacklisted`,
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(from, to)

  if (statusId) query = query.eq('status_id', parseInt(statusId, 10))
  if (channel) query = query.eq('utm_source', channel)
  if (q) {
    query = query.or(
      `name.ilike.%${q}%,phone.ilike.%${q}%,store_name.ilike.%${q}%,internal_memo.ilike.%${q}%`,
    )
  }

  const { data, count, error } = await query
  const items = (data as ConsultationRow[] | null) ?? []
  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // 상담사 ID → display 이름 매핑
  const counselorIds = Array.from(
    new Set(items.map((c) => c.counselor_id).filter(Boolean) as string[]),
  )
  const counselorMap = new Map<string, string>()
  if (counselorIds.length > 0) {
    const { data: counselors } = await supabase
      .from('admin_users')
      .select('user_id, display_name')
      .in('user_id', counselorIds)
    for (const c of counselors ?? []) {
      counselorMap.set(c.user_id, c.display_name ?? c.user_id.slice(0, 8))
    }
  }

  const statusMap = new Map<number, DbStatus>()
  for (const s of statuses) statusMap.set(s.id, s)

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-100">상담 신청</h1>
          <p className="text-sm text-ink-400 mt-1">
            총 {total.toLocaleString()}건 · {page} / {totalPages} 페이지
          </p>
        </div>
        <Link href="/admin" className="text-sm text-ink-400 hover:text-ink-100">
          ← 대시보드
        </Link>
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
        {(q || statusId || channel) && (
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

      <div className="bg-surface-darkSoft border border-ink-700 rounded-lg overflow-hidden">
        {items.length === 0 ? (
          <div className="p-12 text-center text-ink-500 text-sm">
            조건에 맞는 상담이 없습니다.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-ink-900 text-ink-400 text-xs">
              <tr>
                <th className="text-left px-3 py-3 font-semibold">접수</th>
                <th className="text-left px-3 py-3 font-semibold">매체</th>
                <th className="text-left px-3 py-3 font-semibold">신청자</th>
                <th className="text-left px-3 py-3 font-semibold">매장</th>
                <th className="text-left px-3 py-3 font-semibold">상태</th>
                <th className="text-left px-3 py-3 font-semibold">담당</th>
                <th className="text-left px-3 py-3 font-semibold">메모</th>
                <th className="text-right px-3 py-3 font-semibold">처리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700">
              {items.map((c) => {
                const st = c.status_id ? statusMap.get(c.status_id) : null
                return (
                  <tr key={c.id} className="hover:bg-ink-800/40 transition-colors">
                    <td className="px-3 py-3 align-top text-ink-400 text-xs whitespace-nowrap">
                      {formatKst(c.created_at)}
                    </td>
                    <td className="px-3 py-3 align-top text-xs">
                      {c.utm_source ? (
                        <span className="font-medium text-ink-200">{c.utm_source}</span>
                      ) : (
                        <span className="text-ink-600">-</span>
                      )}
                      {c.utm_campaign && (
                        <div className="text-ink-500 text-[10px] mt-0.5">
                          {c.utm_campaign}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 align-top whitespace-nowrap">
                      <div className="font-semibold text-ink-100 flex items-center gap-1">
                        {c.is_favorite && <span title="즐겨찾기">❤️</span>}
                        {c.is_blacklisted && <span title="블랙리스트">🚫</span>}
                        {c.name}
                      </div>
                      <div className="text-ink-400 text-xs mt-0.5">
                        <a href={`tel:${c.phone}`} className="hover:underline">
                          {c.phone}
                        </a>
                      </div>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <div className="text-ink-200">{c.store_name ?? '—'}</div>
                      <div className="text-ink-500 text-xs mt-0.5">
                        {[c.industry, c.region].filter(Boolean).join(' · ') || '—'}
                      </div>
                    </td>
                    <td className="px-3 py-3 align-top">
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
                      {c.contacted_at && (
                        <div className="text-[10px] text-ink-500 mt-1">
                          연락 {formatKstShort(c.contacted_at)}
                        </div>
                      )}
                      {c.done_at && (
                        <div className="text-[10px] text-ink-500 mt-1">
                          완료 {formatKstShort(c.done_at)}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 align-top text-xs">
                      {c.counselor_id ? (
                        <span className="text-ink-200">
                          {counselorMap.get(c.counselor_id) ?? '?'}
                        </span>
                      ) : (
                        <span className="text-ink-600">미배정</span>
                      )}
                    </td>
                    <td className="px-3 py-3 align-top max-w-xs">
                      <div className="text-ink-200 break-keep line-clamp-2 text-xs">
                        {c.message ?? '—'}
                      </div>
                      {c.internal_memo && (
                        <div className="text-ink-400 italic line-clamp-1 text-[11px] mt-1">
                          📝 {c.internal_memo}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 align-top text-right whitespace-nowrap">
                      <ConsultationStatusActions
                        id={c.id}
                        currentStatus={c.status ?? 'new'}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <PageLink
            disabled={page <= 1}
            href={makeHref({ q, status_id: statusId, channel, page: page - 1 })}
          >
            ← 이전
          </PageLink>
          <span className="text-ink-400 px-3">
            {page} / {totalPages}
          </span>
          <PageLink
            disabled={page >= totalPages}
            href={makeHref({ q, status_id: statusId, channel, page: page + 1 })}
          >
            다음 →
          </PageLink>
        </div>
      )}
    </div>
  )
}

// ----- 헬퍼 -----
function formatKst(iso: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))
}

function formatKstShort(iso: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso))
}

function makeHref(args: {
  q: string
  status_id: string
  channel: string
  page: number
}): string {
  const sp = new URLSearchParams()
  if (args.q) sp.set('q', args.q)
  if (args.status_id) sp.set('status_id', args.status_id)
  if (args.channel) sp.set('channel', args.channel)
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
