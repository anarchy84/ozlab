'use client'

// ─────────────────────────────────────────────
// DB 자동배분 정책 + 재분배 트리거 골격
//   - is_enabled 토글
//   - mode : round_robin / manual_only
//   - eligible_roles : 어떤 role 에게 배정할지 (체크박스)
//   - 재분배 버튼 (미배정 / 전체 / 특정 상담사로부터)
// ─────────────────────────────────────────────

import { useEffect, useState, useCallback } from 'react'

interface Rule {
  id: number
  is_enabled: boolean
  mode: 'round_robin' | 'manual_only'
  eligible_roles: string[]
  last_assigned: string | null
  updated_at: string
}

const ROLE_OPTIONS = [
  { code: 'counselor', label: '상담사' },
  { code: 'tm_lead', label: 'TM실장' },
  { code: 'marketing', label: '마케팅팀' },
  { code: 'admin', label: '관리자(레거시)' },
]

export default function DistributionManager() {
  const [rule, setRule] = useState<Rule | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [redistResult, setRedistResult] = useState<string>('')

  const fetchRule = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/distribution', { cache: 'no-store' })
    if (res.ok) setRule(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchRule()
  }, [fetchRule])

  const updateRule = async (patch: Partial<Rule>) => {
    if (!rule) return
    setSaving(true)
    const res = await fetch('/api/admin/distribution', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (res.ok) setRule(await res.json())
    else alert('저장 실패')
    setSaving(false)
  }

  const redistribute = async (mode: 'unassigned' | 'all') => {
    const confirmText =
      mode === 'unassigned'
        ? '미배정 리드를 모두 라운드로빈으로 재분배할까요?'
        : '⚠️ 전체 리드를 다시 분배합니다. 진행할까요?'
    if (!confirm(confirmText)) return

    setSaving(true)
    setRedistResult('')
    const res = await fetch('/api/admin/distribution/redistribute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, limit: 500 }),
    })
    if (res.ok) {
      const j = await res.json()
      setRedistResult(`✅ ${j.assigned}건 재분배 완료`)
    } else {
      setRedistResult('❌ 재분배 실패')
    }
    setSaving(false)
  }

  if (loading || !rule) {
    return <div className="text-center py-12 text-ink-500">로딩 중...</div>
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-ink-100">DB 자동배분</h1>
        <p className="text-sm text-ink-400 mt-1">
          새 리드 들어올 때 자동으로 상담사에게 배정. 라운드로빈으로 공평 분배.
        </p>
      </div>

      <section className="bg-surface-darkSoft border border-ink-700 rounded-lg p-5 space-y-4">
        <h2 className="text-lg font-bold text-ink-100">정책</h2>

        <label className="flex items-center justify-between gap-4">
          <span className="text-ink-200">자동 배정 활성</span>
          <input
            type="checkbox"
            checked={rule.is_enabled}
            onChange={(e) => updateRule({ is_enabled: e.target.checked })}
            disabled={saving}
            className="w-5 h-5 accent-naver-green"
          />
        </label>

        <div>
          <label className="block text-xs text-ink-400 mb-1">분배 방식</label>
          <select
            value={rule.mode}
            onChange={(e) => updateRule({ mode: e.target.value as Rule['mode'] })}
            disabled={saving}
            className="w-full px-3 py-2 bg-ink-900 border border-ink-700 text-ink-100 rounded text-sm"
          >
            <option value="round_robin">라운드로빈 (공평 순환)</option>
            <option value="manual_only">수동 배정만 (자동 X)</option>
          </select>
          <p className="text-[11px] text-ink-500 mt-1">
            ※ 가중치/시간대별 분배는 다음 버전에서 추가 예정
          </p>
        </div>

        <div>
          <label className="block text-xs text-ink-400 mb-2">배정 대상 role (다중 선택)</label>
          <div className="flex flex-wrap gap-2">
            {ROLE_OPTIONS.map((r) => {
              const checked = rule.eligible_roles.includes(r.code)
              return (
                <label
                  key={r.code}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded cursor-pointer text-sm border ${
                    checked
                      ? 'bg-naver-green/20 text-naver-neon border-naver-green/40'
                      : 'bg-ink-800 text-ink-300 border-ink-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...rule.eligible_roles, r.code]
                        : rule.eligible_roles.filter((x) => x !== r.code)
                      updateRule({ eligible_roles: next })
                    }}
                    disabled={saving}
                    className="hidden"
                  />
                  {r.label}
                </label>
              )
            })}
          </div>
        </div>
      </section>

      <section className="bg-surface-darkSoft border border-ink-700 rounded-lg p-5 space-y-3">
        <h2 className="text-lg font-bold text-ink-100">재분배</h2>
        <p className="text-xs text-ink-400">
          기존 리드를 다시 라운드로빈으로 분배합니다. 자동 배정 ON 일 때만 동작.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => redistribute('unassigned')}
            disabled={saving || !rule.is_enabled}
            className="px-4 py-2 bg-naver-green text-white text-sm font-bold rounded hover:bg-naver-dark disabled:opacity-50"
          >
            미배정 리드만 재분배
          </button>
          <button
            type="button"
            onClick={() => redistribute('all')}
            disabled={saving || !rule.is_enabled}
            className="px-4 py-2 bg-amber-600 text-white text-sm font-bold rounded hover:bg-amber-700 disabled:opacity-50"
          >
            ⚠️ 전체 재분배 (덮어씀)
          </button>
        </div>
        {redistResult && (
          <div className="text-sm text-ink-200 mt-2">{redistResult}</div>
        )}
        {rule.last_assigned && (
          <p className="text-[11px] text-ink-500">
            마지막 배정 user_id: <code>{rule.last_assigned.slice(0, 8)}…</code>
          </p>
        )}
      </section>

      <p className="text-xs text-ink-500">
        ※ 가중치 기반 분배 / 시간대별 분배 / 상담사별 일일 한도 등은 다음 세션 추가 예정.
      </p>
    </div>
  )
}
