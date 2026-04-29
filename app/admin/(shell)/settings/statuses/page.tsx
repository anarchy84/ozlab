// ─────────────────────────────────────────────
// /admin/settings/statuses — DB 상태 관리 (super_admin 전용)
//
// 기능 :
//   - 8개 기본 상태 + 추가된 상태 목록 표시
//   - 13개 자동화 플래그 토글 (인라인 편집)
//   - 색상 변경
//   - 정렬 순서 변경
//   - 신규 상태 추가
//   - 비활성/삭제 (사용 중이면 비활성만 가능)
// ─────────────────────────────────────────────
import { requireSuperAdmin } from '@/lib/admin/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import type { DbStatus } from '@/lib/admin/types'
import { StatusesManager } from './StatusesManager'

export const dynamic = 'force-dynamic'

export default async function StatusesPage() {
  // super_admin 만 진입
  await requireSuperAdmin()

  const supabase = createClient()
  const { data, error } = await supabase
    .from('db_statuses')
    .select('*')
    .order('sort_order', { ascending: true })

  const statuses: DbStatus[] = (data as DbStatus[] | null) ?? []

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-100">DB 상태 관리</h1>
          <p className="text-sm text-ink-500 mt-1">
            상담 상태를 추가/수정/삭제하고 13개 자동화 플래그를 설정합니다.
            super_admin 전용 페이지입니다.
          </p>
        </div>
      </header>

      {error && (
        <div className="rounded border border-red-800/50 bg-red-900/20 p-3 text-sm text-red-300">
          데이터를 불러오지 못했습니다: {error.message}
        </div>
      )}

      <StatusesManager initialStatuses={statuses} />

      <section className="rounded border border-ink-700 bg-surface-darkSoft p-4 text-sm text-ink-600">
        <h2 className="font-semibold text-ink-100 mb-2">자동화 플래그 설명</h2>
        <ul className="space-y-1 list-disc pl-5">
          <li><strong>알림톡</strong> — 이 상태로 변경 시 카카오 알림톡 자동 발송 (Phase B 활성화)</li>
          <li><strong>가망</strong> — "가망 고객" 자동 분류 (대시보드 KPI)</li>
          <li><strong>전환</strong> — 개통/매출 카운트 (ROAS 계산)</li>
          <li><strong>허수</strong> — 허수율 카운트</li>
          <li><strong>재통화</strong> — 재통화 큐 자동 등록</li>
          <li><strong>대시보드</strong> — 메인 대시보드 KPI 카드 노출 여부</li>
          <li>그 외: 진행중 / 개통불가 / 미승인 / GCL / 상담원확인 등</li>
        </ul>
      </section>
    </div>
  )
}
