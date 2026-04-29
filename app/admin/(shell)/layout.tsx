// ─────────────────────────────────────────────
// /admin/(shell) — 어드민 shell 레이아웃 (인증 + role 게이트 + 상단 네비)
//
// route group "(shell)" 안의 페이지만 이 layout 적용 :
//   · /admin                    → 대시보드
//   · /admin/consultations      → 상담 신청 목록
//   · /admin/users              → 사용자 관리 (super_admin 전용)
//   · /admin/settings/statuses  → 상태 관리 (super_admin 전용)
//
// 인증 흐름 :
//   1) Supabase auth 쿠키 확인 → 비로그인 → /admin/login
//   2) admin_users 등록 + is_active 확인 → 미등록 → /admin/login?error=no_access
//   3) role 별로 메뉴 필터 (super_admin 만 사용자/설정 메뉴 표시)
// ─────────────────────────────────────────────
import Link from 'next/link'
import { requireAdminProfile } from '@/lib/admin/auth-helpers'
import { ROLE_LABELS, ROLE_EMOJI, isSuperAdmin } from '@/lib/admin/permissions'
import { AdminSignOutButton } from '@/components/admin/AdminSignOutButton'

export const dynamic = 'force-dynamic'

export default async function AdminShellLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 인증 + role 체크 (admin_users 미등록이면 redirect)
  const profile = await requireAdminProfile()

  return (
    <div className="min-h-screen bg-surface-dark text-ink-100">
      <header className="bg-ink-900 border-b border-ink-700 sticky top-0 z-30">
        <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/admin" className="font-bold text-ink-100 flex items-center gap-2">
              <span className="text-naver-neon">●</span>
              오즈랩페이 어드민
            </Link>
            <nav className="flex items-center gap-5 text-sm">
              <Link
                href="/admin"
                className="text-ink-300 hover:text-ink-100 transition-colors"
              >
                대시보드
              </Link>
              <Link
                href="/admin/consultations"
                className="text-ink-300 hover:text-ink-100 transition-colors"
              >
                상담 신청
              </Link>
              {isSuperAdmin(profile.role) && (
                <>
                  <Link
                    href="/admin/users"
                    className="text-ink-300 hover:text-ink-100 transition-colors"
                  >
                    사용자 관리
                  </Link>
                  <Link
                    href="/admin/settings/statuses"
                    className="text-ink-300 hover:text-ink-100 transition-colors"
                  >
                    상태 관리
                  </Link>
                  <Link
                    href="/admin/settings/cta"
                    className="text-ink-300 hover:text-ink-100 transition-colors"
                  >
                    CTA 관리
                  </Link>
                </>
              )}
              <Link
                href="/"
                target="_blank"
                className="text-ink-400 hover:text-ink-100 transition-colors"
              >
                사이트 보기 ↗
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden sm:flex items-center gap-1.5 text-ink-200">
              <span title={ROLE_LABELS[profile.role]}>{ROLE_EMOJI[profile.role]}</span>
              <span className="font-medium">
                {profile.display_name ?? profile.email}
              </span>
              <span className="text-ink-600">·</span>
              <span className="text-ink-400">{ROLE_LABELS[profile.role]}</span>
            </span>
            <AdminSignOutButton />
          </div>
        </div>
      </header>
      <main className="max-w-[1200px] mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
