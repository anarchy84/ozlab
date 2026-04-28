// ─────────────────────────────────────────────
// /admin — 어드민 메인 대시보드
//   · KPI 카드 4개 (전체 신청 / 오늘 / 신규(미처리) / 오늘 신규)
//   · 최근 상담 신청 5건 미리보기 + "상담 목록 전체 보기" 링크
//   · 빠른 메뉴 (상담 목록 / 사이트 편집)
//
// SSR — Supabase 에서 카운트 + 최근 5건 조회
// ─────────────────────────────────────────────
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

// 캐시 금지 — 어드민 데이터는 항상 실시간
export const dynamic = 'force-dynamic'

// KST 기준 오늘 자정 (UTC ISO 문자열)
function todayStartIsoKst(): string {
  // 서버 타임존이 다를 수 있어서 KST(+9)로 직접 계산
  const now = new Date()
  // KST 자정 = UTC 기준 (today 00:00 KST) = UTC 전날 15:00
  const utcToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  )
  // KST 00:00 → UTC 전일 15:00
  const kstMidnightUtc = new Date(utcToday.getTime() - 9 * 60 * 60 * 1000)
  return kstMidnightUtc.toISOString()
}

export default async function AdminDashboardPage() {
  const supabase = createClient()
  const todayIso = todayStartIsoKst()

  // 4개 카운트 + 최근 5건 — 병렬 쿼리
  const [allRes, todayRes, newRes, todayNewRes, recentRes] = await Promise.all([
    supabase.from('consultations').select('id', { count: 'exact', head: true }),
    supabase
      .from('consultations')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayIso),
    supabase
      .from('consultations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'new'),
    supabase
      .from('consultations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'new')
      .gte('created_at', todayIso),
    supabase
      .from('consultations')
      .select('id, name, phone, store_name, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const stats = [
    { label: '전체 상담', value: allRes.count ?? 0, hint: '누적' },
    { label: '오늘 신청', value: todayRes.count ?? 0, hint: 'KST 자정 기준' },
    { label: '신규 (미처리)', value: newRes.count ?? 0, hint: '응답 필요' },
    { label: '오늘 신규', value: todayNewRes.count ?? 0, hint: '오늘 들어온 미처리' },
  ]

  const recent = recentRes.data ?? []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">대시보드</h1>
        <p className="text-sm text-ink-500 mt-1">상담 현황을 한눈에 확인하세요.</p>
      </div>

      {/* KPI 카드 4개 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-white border border-ink-150 rounded-lg p-5 shadow-sm"
          >
            <p className="text-xs text-ink-500">{s.label}</p>
            <p className="text-3xl font-extrabold text-ink-900 mt-2">
              {s.value.toLocaleString()}
            </p>
            <p className="text-[11px] text-ink-400 mt-1">{s.hint}</p>
          </div>
        ))}
      </div>

      {/* 최근 신청 5건 */}
      <div className="bg-white border border-ink-150 rounded-lg shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-100">
          <h2 className="font-bold text-ink-900">최근 신청</h2>
          <Link
            href="/admin/consultations"
            className="text-sm text-naver-deep hover:underline"
          >
            전체 보기 →
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="p-8 text-center text-ink-400 text-sm">
            아직 들어온 상담이 없습니다.
          </div>
        ) : (
          <ul className="divide-y divide-ink-100">
            {recent.map((c) => (
              <li key={c.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3 text-sm">
                  <StatusBadge status={c.status} />
                  <span className="font-semibold text-ink-900">{c.name}</span>
                  <span className="text-ink-500">{c.phone}</span>
                  {c.store_name && (
                    <span className="text-ink-400">· {c.store_name}</span>
                  )}
                </div>
                <span className="text-xs text-ink-400">
                  {formatKstShort(c.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 빠른 메뉴 */}
      <div className="grid md:grid-cols-2 gap-4">
        <Link
          href="/admin/consultations"
          className="bg-white border border-ink-150 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <p className="text-base font-bold text-ink-900">상담 목록 관리</p>
          <p className="text-sm text-ink-500 mt-1 break-keep">
            신청을 검색·필터링하고 처리 상태를 변경합니다.
          </p>
        </Link>
        <Link
          href="/"
          target="_blank"
          className="bg-white border border-ink-150 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <p className="text-base font-bold text-ink-900">사이트 보기 / 편집</p>
          <p className="text-sm text-ink-500 mt-1 break-keep">
            랜딩 페이지에서 텍스트·이미지에 hover하면 ✏️ 아이콘으로 인라인 편집 가능합니다.
          </p>
        </Link>
      </div>
    </div>
  )
}

// -------------------------------------------------------------
// 헬퍼 — 상태 배지
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
    <span className={`inline-block ${c.bg} ${c.fg} text-[11px] font-bold px-2 py-0.5 rounded-sm`}>
      {c.label}
    </span>
  )
}

// 짧은 KST 시각 표기 (오늘이면 시·분, 아니면 MM/DD)
function formatKstShort(iso: string): string {
  const d = new Date(iso)
  const fmt = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  return fmt.format(d)
}
