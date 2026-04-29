// ─────────────────────────────────────────────
// 어드민 로그아웃 버튼 (클라이언트)
//   - 어드민 헤더에서 사용
//   - Supabase auth.signOut() → 로그인 페이지로 이동
// ─────────────────────────────────────────────
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function AdminSignOutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleSignOut = async () => {
    if (loading) return
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      className="text-sm text-ink-400 hover:text-ink-100 transition-colors disabled:opacity-50"
    >
      {loading ? '로그아웃 중…' : '로그아웃'}
    </button>
  )
}
