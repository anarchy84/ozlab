// ─────────────────────────────────────────────
// /admin 루트 레이아웃 — 메타데이터만
//   · 인증 게이트와 어드민 shell 은 /admin/(shell)/layout.tsx 가 담당
//   · /admin/login 은 인증 없이 접근 가능 (자체 디자인)
// ─────────────────────────────────────────────
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '관리자',
  robots: { index: false, follow: false },
}

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
