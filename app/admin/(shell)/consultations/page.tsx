// ─────────────────────────────────────────────
// /admin/consultations — 상담 신청 목록
//   · 검색 (이름/연락처/매장명) + 상태 필터 + 페이지네이션
//   · 표 한 행 = 신청 한 건. 우측에 상태 변경 버튼 (클라이언트 컴포넌트)
//   · 상세보기는 모달 대신 같은 페이지에서 펼침/접힘 (단순 UI)
// ─────────────────────────────────────────────
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ConsultationStatusActions } from '@/components/admin/ConsultationStatusActions'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 30

interface SP {
  q?: string
  status?: string
  page?: string
}

export default async function ConsultationsListPage({
  searchParams,
}: {
  searchParams: SP
}) {
  const supabase = createClient()

  const q = (searchParams.q ?? '').trim()
  const status = searchParams.status ?? '' // '', 'new', 'contacted', 'done', 'rejected'
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('consultations')
    .select(
      'id, created_at, name, phone, store_name, industry, region, message, status, contacted_at, done_at, assignee_note',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status) query = query.eq('status', status)
  if (q) {
    // 이름·연락처·매장명 부분 일치 (or 조합)
    query = query.or(
      `name.ilike.%${q}%,phone.ilike.%${q}%,store_name.ilike.%${q}%`
    )
  }

  const { data, count, error } = await query
  const items = data ?? []
  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">상담 신청</h1>
          <p className="text-sm text-ink-500 mt-1">
            총 {total.toLocaleString()}건 · {page} / {totalPages} 페이지
          </p>
        </div>
        <Link href="/admin" className="text-sm text-ink-500 hover:text-ink-900">
          ← 대시보드
        </Link>
      </div>

      {/* 검색 / 필터 — GET form (서버 라우팅) */}
      <form
        method="get"
        className="bg-white border border-ink-150 rounded-lg p-4 flex flex-wrap gap-3 items-end"
      >
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="q" className="block text-xs text-ink-500 mb-1">
            검색 (이름·연락처·매장명)
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="홍길동 / 010-1234 / 강남식당"
            className="w-full px-3 py-2 border border-ink-200 rounded-md text-sm focus:outline-none focus:border-naver-green"
          />
        </div>
        <div>
          <label htmlFor="status" className="block text-xs text-ink-500 mb-1">
            상태
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status}
            className="px-3 py-2 border border-ink-200 rounded-md text-sm focus:outline-none focus:border-naver-green"
          >
            <option value="">전체</option>
            <option value="new">신규</option>
            <option value="contacted">연락중</option>
            <option value="done">완료</option>
            <option value="rejected">반려</option>
          </select>
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-naver-green text-white rounded-md text-sm font-bold hover:bg-naver-dark transition-colors"
        >
          적용
        </button>
        {(q || status) && (
          <Link
            href="/admin/consultations"
            className="px-4 py-2 border border-ink-200 rounded-md text-sm text-ink-600 hover:bg-ink-50 transition-colors"
          >
            초기화
          </Link>
        )}
      </form>

      {/* 에러 (RLS / DB) */}
      {error && (
        <div className="bg-accent-red/10 border border-accent-red/30 text-accent-red px-4 py-3 rounded-md text-sm">
          데이터 조회 오류: {error.message}
        </div>
      )}

      {/* 목록 */}
      <div className="bg-white border border-ink-150 rounded-lg shadow-sm overflow-hidden">
        {items.length === 0 ? (
          <div className="p-12 text-center text-ink-400 text-sm">
            조건에 맞는 상담이 없습니다.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-ink-500 text-xs">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">접수</th>
                <th className="text-left px-4 py-3 font-semibold">신청자</th>
                <th className="text-left px-4 py-3 font-semibold">매장</th>
                <th className="text-left px-4 py-3 font-semibold">메시지</th>
                <th className="text-left px-4 py-3 font-semibold">상태</th>
                <th className="text-right px-4 py-3 font-semibold">처리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {items.map((c) => (
                <tr key={c.id} className="hover:bg-ink-50/50">
                  <td className="px-4 py-3 align-top text-ink-500 text-xs whitespace-nowrap">
                    {formatKst(c.created_at)}
                  </td>
                  <td className="px-4 py-3 align-top whitespace-nowrap">
                    <div className="font-semibold text-ink-900">{c.name}</div>
                    <div className="text-ink-500 text-xs mt-0.5">
                      <a
                        href={`tel:${c.phone}`}
                        className="hover:underline"
                      >
                        {c.phone}
                      </a>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="text-ink-700">{c.store_name ?? '—'}</div>
                    <div className="text-ink-400 text-xs mt-0.5">
                      {[c.industry, c.region].filter(Boolean).join(' · ') || '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top max-w-xs">
                    <div className="text-ink-700 break-keep line-clamp-3">
                      {c.message ?? '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <StatusBadge status={c.status} />
                    {c.contacted_at && (
                      <div className="text-[11px] text-ink-400 mt-1">
                        연락 {formatKstShort(c.contacted_at)}
                      </div>
                    )}
                    {c.done_at && (
                      <div className="text-[11px] text-ink-400 mt-1">
                        완료 {formatKstShort(c.done_at)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                    <ConsultationStatusActions
                      id={c.id}
                      currentStatus={c.status}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <PageLink
            disabled={page <= 1}
            href={makeHref({ q, status, page: page - 1 })}
          >
            ← 이전
          </PageLink>
          <span className="text-ink-500 px-3">
            {page} / {totalPages}
          </span>
          <PageLink
            disabled={page >= totalPages}
            href={makeHref({ q, status, page: page + 1 })}
          >
            다음 →
          </PageLink>
        </div>
      )}
    </div>
  )
}

// -------------------------------------------------------------
// 헬퍼들
// -------------------------------------------------------------
function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; bg: string; fg: string }> = {
    new: { label: '신규', bg: 'bg-naver-soft', fg: 'text-naver-deep' },
    contacted: { label: '연락중', bg: 'bg-blue-100', fg: 'text-blue-700' },
    done: { label: '완료', bg: 'bg-ink-100', fg: 'text-ink-600' },
    rejected: { label: '반려', bg: 'bg-accent-red/10', fg: 'text-accent-red' },
  }
  const c = cfg[status] ?? cfg.new
  return (
    <span
      className={`inline-block ${c.bg} ${c.fg} text-[11px] font-bold px-2 py-0.5 rounded-sm`}
    >
      {c.label}
    </span>
  )
}

function formatKst(iso: string): string {
  const d = new Date(iso)
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d)
}

function formatKstShort(iso: string): string {
  const d = new Date(iso)
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

function makeHref(args: { q: string; status: string; page: number }): string {
  const sp = new URLSearchParams()
  if (args.q) sp.set('q', args.q)
  if (args.status) sp.set('status', args.status)
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
      <span className="px-3 py-1.5 border border-ink-200 rounded-md text-ink-300 cursor-not-allowed">
        {children}
      </span>
    )
  }
  return (
    <Link
      href={href}
      className="px-3 py-1.5 border border-ink-200 rounded-md text-ink-700 hover:bg-ink-50 transition-colors"
    >
      {children}
    </Link>
  )
}
