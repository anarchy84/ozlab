// ─────────────────────────────────────────────
// /admin/users — 사용자 관리 (super_admin 전용)
//
// 기능 :
//   - 사용자 목록 (이메일·역할·부서·활성·최근 로그인)
//   - [+ 사용자 초대] 모달 → /api/admin/users/invite
//   - 행 클릭 → 편집 / 비활성화 / 삭제
//   - 본인 강등·마지막 super_admin 가드 (서버 + UI 둘 다)
// ─────────────────────────────────────────────
import { requireSuperAdmin } from '@/lib/admin/auth-helpers'
import { UsersManager } from './UsersManager'
import type { AdminRole } from '@/lib/admin/types'

export const dynamic = 'force-dynamic'

export interface AdminUserRow {
  user_id: string
  role: AdminRole
  display_name: string | null
  department: string | null
  note: string | null
  is_active: boolean
  created_at: string
  email: string | null
  last_sign_in_at: string | null
  auth_created_at: string | null
}

export default async function UsersPage() {
  // super_admin 진입 게이트
  const profile = await requireSuperAdmin()

  // 초기 데이터는 클라이언트 컴포넌트에서 fetch (RSC 에서 service_role 호출 안 함)
  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-100">사용자 관리</h1>
          <p className="text-sm text-ink-400 mt-1">
            어드민 사용자를 초대·편집·비활성화·삭제합니다. super_admin 전용 페이지입니다.
          </p>
        </div>
      </header>

      <UsersManager myUserId={profile.user_id} />

      <section className="rounded border border-ink-700 bg-surface-darkSoft p-4 text-sm text-ink-300">
        <h2 className="font-semibold text-ink-100 mb-2">운영 정책</h2>
        <ul className="space-y-1 list-disc pl-5 text-ink-400">
          <li>입사 = 이메일 초대. 자율 가입은 차단되어 있습니다.</li>
          <li>퇴사 = 비활성화 토글. 데이터는 보존되며 30일 후 영구 삭제 검토.</li>
          <li>퇴사 시 배정된 상담은 자동으로 미배정(NULL) 처리됩니다.</li>
          <li>본인 강등·마지막 활성 super_admin 변경/삭제는 차단됩니다.</li>
        </ul>
      </section>
    </div>
  )
}
