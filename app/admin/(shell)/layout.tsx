// ─────────────────────────────────────────────
// /admin/(shell) — 어드민 shell 레이아웃 (인증 게이트 + 상단 네비)
//
// route group "(shell)" 안의 페이지만 이 layout 적용 :
//   · /admin            → /admin/(shell)/page.tsx
//   · /admin/consultations → /admin/(shell)/consultations/page.tsx
//
// /admin/login 은 (shell) 외부라 인증 게이트 통과 X (자체 디자인 그대로 사용)
//
// SSR 시점에 Supabase auth 검사 → 비로그인이면 /admin/login 으로 리다이렉트
// ─────────────────────────────────────────────
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AdminSignOutButton } from '@/components/admin/AdminSignOutButton'

// 어드민 페이지 캐시 금지 — 항상 최신 데이터
export const dynamic = 'force-dynamic'

export default async function AdminShellLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 인증 체크 — 비로그인이면 로그인 페이지로 redirect
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="bg-white border-b border-ink-150 sticky top-0 z-30">
        <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/admin" className="font-bold text-ink-900">
              오즈랩페이 어드민
            </Link>
            <nav className="flex items-center gap-5 text-sm">
              <Link
                href="/admin"
                className="text-ink-600 hover:text-ink-900 transition-colors"
              >
                대시보드
              </Link>
              <Link
                href="/admin/consultations"
                className="text-ink-600 hover:text-ink-900 transition-colors"
              >
                상담 신청
              </Link>
              <Link
                href="/"
                target="_blank"
                className="text-ink-600 hover:text-ink-900 transition-colors"
              >
                사이트 보기 ↗
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-ink-500 hidden sm:inline">{user.email}</span>
            <AdminSignOutButton />
          </div>
        </div>
      </header>
      <main className="max-w-[1200px] mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
