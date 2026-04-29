'use client'

import { Suspense, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/admin'
  const errorParam = searchParams.get('error')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      setLoading(false)
      return
    }

    router.push(redirect)
    router.refresh()
  }

  // URL 에 ?error=no_access 가 붙어 들어온 경우 (admin_users 미등록)
  const noAccessHint =
    errorParam === 'no_access'
      ? '이 계정은 어드민 사용자로 등록되어 있지 않습니다. super_admin 에게 초대를 요청하세요.'
      : null

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      {noAccessHint && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-amber-300 text-xs">
          {noAccessHint}
        </div>
      )}

      {error && (
        <div className="bg-accent-red/10 border border-accent-red/30 rounded-lg p-3 text-accent-red text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm text-ink-300 mb-1.5">
          이메일
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2.5 bg-ink-900 border border-ink-700 rounded-lg text-ink-100 placeholder-ink-500 focus:outline-none focus:ring-2 focus:ring-naver-green/50 focus:border-naver-green"
          placeholder="ourteam.kr@gmail.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm text-ink-300 mb-1.5">
          비밀번호
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-3 py-2.5 bg-ink-900 border border-ink-700 rounded-lg text-ink-100 placeholder-ink-500 focus:outline-none focus:ring-2 focus:ring-naver-green/50 focus:border-naver-green"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 bg-naver-green hover:bg-naver-dark disabled:opacity-50 text-white font-bold rounded-lg transition-colors"
      >
        {loading ? '로그인 중...' : '로그인'}
      </button>
    </form>
  )
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-surface-dark flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-ink-100 flex items-center justify-center gap-2">
            <span className="text-naver-neon">●</span>
            오즈랩페이
          </h1>
          <p className="text-ink-400 text-sm mt-1">관리자 로그인</p>
        </div>

        <Suspense
          fallback={
            <div className="text-center py-8 text-ink-500">로딩 중...</div>
          }
        >
          <LoginForm />
        </Suspense>

        <p className="text-center text-ink-600 text-xs mt-6">
          © 2026 오즈랩페이. 관리자 전용 페이지입니다.
        </p>
      </div>
    </div>
  )
}
