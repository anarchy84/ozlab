'use client'

// ─────────────────────────────────────────────
// DB 정책 + 자동분배 관리
//   - 중복 DB 인정기간
//   - 전체 자동분배 on/off
//   - role 기반 후보군
//   - 담당자별 분배 제외/연차/부재 상태
// ─────────────────────────────────────────────

import { useEffect, useState, useCallback } from 'react'
import ConsultationPolicyManager from '../consultation-policy/ConsultationPolicyManager'
import type { ConsultationPolicySettings } from '@/lib/consultation-policy-server'

interface Rule {
  id: number
  is_enabled: boolean
  mode: 'round_robin' | 'manual_only'
  eligible_roles: string[]
  last_assigned: string | null
  updated_at: string
}

type PauseReason = 'manual' | 'leave' | 'busy' | 'other'

interface DistributionMember {
  user_id: string
  role: string
  display_name: string | null
  department: string | null
  is_active: boolean
  distribution_enabled: boolean
  distribution_pause_reason: PauseReason | null
  distribution_paused_until: string | null
  distribution_note: string | null
}

interface DistributionPayload {
  rule: Rule
  members: DistributionMember[]
}

interface Props {
  initialPolicySettings: ConsultationPolicySettings
}

const ROLE_OPTIONS = [
  { code: 'counselor', label: '상담사' },
  { code: 'tm_lead', label: 'TM실장' },
  { code: 'marketing', label: '마케팅팀' },
  { code: 'admin', label: '관리자' },
]

const REASON_OPTIONS: { value: PauseReason; label: string }[] = [
  { value: 'manual', label: '수동 제외' },
  { value: 'leave', label: '연차/휴가' },
  { value: 'busy', label: '업무 불가' },
  { value: 'other', label: '기타' },
]

export default function DistributionManager({ initialPolicySettings }: Props) {
  const [rule, setRule] = useState<Rule | null>(null)
  const [members, setMembers] = useState<DistributionMember[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingMember, setSavingMember] = useState<string | null>(null)
  const [redistResult, setRedistResult] = useState<string>('')

  const fetchRule = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/distribution', { cache: 'no-store' })
    if (res.ok) {
      const data = (await res.json()) as DistributionPayload
      setRule(data.rule)
      setMembers(data.members ?? [])
    }
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
    if (res.ok) {
      const data = (await res.json()) as { rule: Rule }
      setRule(data.rule)
    } else {
      alert('저장 실패')
    }
    setSaving(false)
  }

  const updateMember = async (userId: string, patch: Partial<DistributionMember>) => {
    setSavingMember(userId)
    const res = await fetch(`/api/admin/distribution/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (res.ok) {
      const data = (await res.json()) as { member: DistributionMember }
      setMembers((curr) => curr.map((m) => (m.user_id === userId ? data.member : m)))
    } else {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      alert(data.error ?? '담당자 분배 상태 저장 실패')
    }
    setSavingMember(null)
  }

  const redistribute = async (mode: 'unassigned' | 'all') => {
    const confirmText =
      mode === 'unassigned'
        ? '미배정 리드를 현재 분배 가능 담당자에게 재분배할까요?'
        : '전체 리드를 현재 분배 가능 담당자에게 다시 분배합니다. 진행할까요?'
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
      setRedistResult(`${j.assigned}건 재분배 완료`)
      await fetchRule()
    } else {
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      setRedistResult(`재분배 실패${j.error ? `: ${j.error}` : ''}`)
    }
    setSaving(false)
  }

  if (loading || !rule) {
    return <div className="py-12 text-center text-ink-500">로딩 중...</div>
  }

  const availableCount = members.filter(
    (m) => rule.eligible_roles.includes(m.role) && isDistributionAvailable(m),
  ).length

  return (
    <div className="max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-ink-100">DB 정책·분배</h1>
        <p className="mt-1 text-sm text-ink-400">
          중복 접수 기준과 신규 DB 자동 배정 규칙을 한 곳에서 관리합니다.
        </p>
      </header>

      <ConsultationPolicyManager initialSettings={initialPolicySettings} embedded />

      <section className="rounded-lg border border-ink-700 bg-surface-darkSoft p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink-100">자동분배 정책</h2>
            <p className="mt-1 text-sm text-ink-400">
              신규 상담 DB를 분배 가능 담당자에게 라운드로빈으로 배정합니다.
            </p>
          </div>
          <span
            className={`w-fit rounded-full px-3 py-1.5 text-sm font-bold ${
              rule.is_enabled
                ? 'bg-naver-green/15 text-naver-neon'
                : 'bg-amber-500/15 text-amber-300'
            }`}
          >
            {rule.is_enabled ? `분배 ON · 가능 ${availableCount}명` : '분배 OFF'}
          </span>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-4">
            <label className="flex items-center justify-between gap-4 rounded-lg border border-ink-700 bg-ink-900/60 px-4 py-3">
              <span>
                <span className="block font-semibold text-ink-100">자동 배정 활성</span>
                <span className="text-xs text-ink-500">끄면 신규 DB는 미배정 상태로 남습니다.</span>
              </span>
              <input
                type="checkbox"
                checked={rule.is_enabled}
                onChange={(e) => updateRule({ is_enabled: e.target.checked })}
                disabled={saving}
                className="h-5 w-5 accent-naver-green"
              />
            </label>

            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-400">
                분배 방식
              </label>
              <select
                value={rule.mode}
                onChange={(e) => updateRule({ mode: e.target.value as Rule['mode'] })}
                disabled={saving}
                className="w-full rounded border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100"
              >
                <option value="round_robin">라운드로빈</option>
                <option value="manual_only">수동 배정만</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-ink-400">
              배정 대상 role
            </label>
            <div className="flex flex-wrap gap-2">
              {ROLE_OPTIONS.map((r) => {
                const checked = rule.eligible_roles.includes(r.code)
                return (
                  <label
                    key={r.code}
                    className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${
                      checked
                        ? 'border-naver-green/40 bg-naver-green/20 text-naver-neon'
                        : 'border-ink-700 bg-ink-800 text-ink-300'
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
            <p className="mt-2 text-xs text-ink-500">
              role 대상에 포함되어도 담당자별 상태가 OFF 또는 연차/부재 기간이면 배정되지 않습니다.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-ink-700 bg-surface-darkSoft p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink-100">담당자별 분배 상태</h2>
            <p className="mt-1 text-sm text-ink-400">
              연차, 부재, 특정 사유로 잠시 분배에서 제외할 담당자를 관리합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchRule}
            className="w-fit rounded-full border border-ink-700 px-4 py-2 text-sm font-semibold text-ink-300 hover:border-ink-500 hover:text-ink-100"
          >
            새로고침
          </button>
        </div>

        <div className="mt-5 overflow-hidden rounded-lg border border-ink-700">
          <div className="grid grid-cols-[1.1fr_0.8fr_1.5fr] gap-3 border-b border-ink-700 bg-ink-900 px-4 py-3 text-xs font-bold text-ink-400 max-lg:hidden">
            <span>담당자</span>
            <span>상태</span>
            <span>분배 제어</span>
          </div>
          <div className="divide-y divide-ink-700">
            {members.map((member) => (
              <MemberRow
                key={member.user_id}
                member={member}
                saving={savingMember === member.user_id}
                onSave={(patch) => updateMember(member.user_id, patch)}
              />
            ))}
            {members.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-ink-500">
                분배 대상으로 관리할 담당자가 없습니다.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-ink-700 bg-surface-darkSoft p-5">
        <h2 className="text-lg font-bold text-ink-100">재분배</h2>
        <p className="mt-1 text-sm text-ink-400">
          기존 리드를 현재 분배 가능 담당자 기준으로 다시 배정합니다.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => redistribute('unassigned')}
            disabled={saving || !rule.is_enabled}
            className="rounded-full bg-naver-green px-4 py-2 text-sm font-bold text-white hover:bg-naver-dark disabled:opacity-50"
          >
            미배정 리드만 재분배
          </button>
          <button
            type="button"
            onClick={() => redistribute('all')}
            disabled={saving || !rule.is_enabled}
            className="rounded-full bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50"
          >
            전체 재분배
          </button>
        </div>
        {redistResult && <div className="mt-3 text-sm text-ink-200">{redistResult}</div>}
      </section>
    </div>
  )
}

function MemberRow({
  member,
  saving,
  onSave,
}: {
  member: DistributionMember
  saving: boolean
  onSave: (patch: Partial<DistributionMember>) => Promise<void>
}) {
  const [enabled, setEnabled] = useState(member.distribution_enabled)
  const [reason, setReason] = useState<PauseReason | ''>(member.distribution_pause_reason ?? '')
  const [until, setUntil] = useState(toLocalDateTimeInput(member.distribution_paused_until))
  const [note, setNote] = useState(member.distribution_note ?? '')

  useEffect(() => {
    setEnabled(member.distribution_enabled)
    setReason(member.distribution_pause_reason ?? '')
    setUntil(toLocalDateTimeInput(member.distribution_paused_until))
    setNote(member.distribution_note ?? '')
  }, [member])

  const status = getDistributionStatus(member)
  const dirty =
    enabled !== member.distribution_enabled ||
    reason !== (member.distribution_pause_reason ?? '') ||
    until !== toLocalDateTimeInput(member.distribution_paused_until) ||
    note !== (member.distribution_note ?? '')

  return (
    <div className="grid gap-3 px-4 py-4 lg:grid-cols-[1.1fr_0.8fr_1.5fr] lg:items-center">
      <div>
        <div className="font-semibold text-ink-100">
          {member.display_name ?? member.user_id.slice(0, 8)}
        </div>
        <div className="mt-0.5 text-xs text-ink-500">
          {roleLabel(member.role)}
          {member.department ? ` · ${member.department}` : ''}
        </div>
      </div>

      <div>
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${status.className}`}>
          {status.label}
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-[0.7fr_1fr_1fr_auto]">
        <label className="flex items-center gap-2 rounded border border-ink-700 px-3 py-2 text-sm text-ink-200">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => {
              setEnabled(e.target.checked)
              if (!e.target.checked && !reason) setReason('manual')
            }}
            className="h-4 w-4 accent-naver-green"
          />
          분배
        </label>

        <select
          value={reason}
          onChange={(e) => setReason(e.target.value as PauseReason | '')}
          className="rounded border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100"
        >
          <option value="">사유 없음</option>
          {REASON_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <input
          type="datetime-local"
          value={until}
          onChange={(e) => setUntil(e.target.value)}
          className="rounded border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100"
        />

        <button
          type="button"
          onClick={() =>
            onSave({
              distribution_enabled: enabled,
              distribution_pause_reason: reason || null,
              distribution_paused_until: until ? new Date(until).toISOString() : null,
              distribution_note: note,
            })
          }
          disabled={saving || !dirty}
          className="rounded-full bg-naver-green px-4 py-2 text-sm font-bold text-white hover:bg-naver-dark disabled:opacity-50"
        >
          {saving ? '저장 중' : '저장'}
        </button>

        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="메모"
          className="rounded border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 sm:col-span-full"
          maxLength={500}
        />
      </div>
    </div>
  )
}

function getDistributionStatus(member: DistributionMember) {
  if (!member.is_active) {
    return { label: '계정 비활성', className: 'bg-ink-700 text-ink-300' }
  }
  if (!member.distribution_enabled) {
    return { label: '분배 제외', className: 'bg-red-500/15 text-red-300' }
  }
  if (isFuture(member.distribution_paused_until)) {
    return { label: '기간 중지', className: 'bg-amber-500/15 text-amber-300' }
  }
  return { label: '분배 가능', className: 'bg-naver-green/15 text-naver-neon' }
}

function isDistributionAvailable(member: DistributionMember) {
  return member.is_active && member.distribution_enabled && !isFuture(member.distribution_paused_until)
}

function isFuture(value: string | null) {
  if (!value) return false
  return new Date(value).getTime() > Date.now()
}

function toLocalDateTimeInput(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60 * 1000)
  return local.toISOString().slice(0, 16)
}

function roleLabel(role: string) {
  return ROLE_OPTIONS.find((r) => r.code === role)?.label ?? role
}
