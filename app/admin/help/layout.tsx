// ─────────────────────────────────────────────
// /admin/help/* — 도움말 라우트 (shell 밖, 인증 게이트만)
// ─────────────────────────────────────────────
import { requireAdminProfile } from '@/lib/admin/auth-helpers'

export const dynamic = 'force-dynamic'

export default async function HelpLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdminProfile() // 인증 체크만
  return <>{children}</>
}
