'use client'

// ─────────────────────────────────────────────
// DB 정책 + 자동분배 관리
//   - 중복 DB 인정기간
//   - 전체 자동분배 on/off
//   - TM 상담사별 on/off + 분배 배수
//   - 특정 상담사 DB 회수 후 재분배
// ─────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from 'react'
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

type DistributionWeight = 0.5 | 1 | 2

interface DistributionMember {
  user_id: string
  role: string
  display_name: string | null
  department: string | null
  is_active: boolean
  distribution_enabled: boolean
  distribution_weight: DistributionWeight | number | string | null
  distribution_score: number | string | null
}

interface DbStatus {
  id: number
  code: string
  label: string
  sort_order: number
}

interface DistributionPayload {
  rule: Rule
  members: DistributionMember[]
  statuses: DbStatus[]
}

interface Props {
  initialPolicySettings: ConsultationPolicySettings
}

const TM_ELIGIBLE_ROLES = ['counselor', 'tm_lead']

const WEIGHT_OPTIONS: { value: DistributionWeight; label: string; caption: string }[] = [
  { value: 0.5, label: '1/2배수', caption: '50% 적게' },
  { value: 1, label: '1배수', caption: '기본' },
  { value: 2, label: '2배수', caption: '2배 많이' },
]

export default function DistributionManager({ initialPolicySettings }: Props) {
  const [rule, setRule] = useState<Rule | null>(null)
  const [members, setMembers] = useState<DistributionMember[]>([])
  const [statuses, setStatuses] = useState<DbStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingMember, setSavingMember] = useState<string | null>(null)
  const [redistResult, setRedistResult] = useState('')
  const [reclaimCounselorId, setReclaimCounselorId] = useState('')
  const [reclaimStatusId, setReclaimStatusId] = useState('')

  const fetchRule = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/distribution', { cache: 'no-store' })
    if (res.ok) {
      const data = (await res.json()) as DistributionPayload
      setRule(data.rule)
      setMembers(data.members ?? [])
      setStatuses(data.statuses ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchRule()
  }, [fetchRule])

  useEffect(() => {
    if (members.length === 0) {
      setReclaimCounselorId('')
      return
    }
    if (!members.some((member) => member.user_id === reclaimCounselorId)) {
      setReclaimCounselorId(members[0].user_id)
    }
  }, [members, reclaimCounselorId])

  const updateRule = async (patch: Partial<Rule>) => {
    if (!rule) return
    setSaving(true)
    const res = await fetch('/api/admin/distribution', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...patch,
        mode: patch.is_enabled === true ? 'round_robin' : patch.mode,
        eligible_roles: TM_ELIGIBLE_ROLES,
      }),
    })
    if (res.ok) {
      const data = (await res.json()) as { rule: Rule }
      setRule(data.rule)
    } else {
      alert('자동분배 정책 저장 실패')
    }
    setSaving(false)
  }

  const updateMember = async (
    userId: string,
    patch: Partial<Pick<DistributionMember, 'distribution_enabled' | 'distribution_weight'>>,
  ) => {
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

  const redistributeUnassigned = async () => {
    if (!confirm('미배정 DB를 현재 분배 가능한 TM 상담사에게 재분배할까요?')) return

    setSaving(true)
    setRedistResult('')
    const res = await fetch('/api/admin/distribution/redistribute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'unassigned', limit: 500 }),
    })
    await handleRedistributionResponse(res)
    setSaving(false)
  }

  const reclaimAndRedistribute = async () => {
    const source = members.find((member) => member.user_id === reclaimCounselorId)
    if (!source) return alert('회수할 상담사를 선택하세요.')

    const statusLabel =
      reclaimStatusId === ''
        ? '전체 상태'
        : statuses.find((status) => String(status.id) === reclaimStatusId)?.label ?? '선택 상태'

    if (
      !confirm(
        `${source.display_name ?? source.user_id.slice(0, 8)} 담당자의 ${statusLabel} DB를 회수하고 다른 상담사에게 재분배할까요?`,
      )
    ) {
      return
    }

    setSaving(true)
    setRedistResult('')
    const res = await fetch('/api/admin/distribution/redistribute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'from_counselor',
        counselor_id: reclaimCounselorId,
        status_id: reclaimStatusId || null,
        limit: 500,
      }),
    })
    await handleRedistributionResponse(res)
    setSaving(false)
  }

  const handleRedistributionResponse = async (res: Response) => {
    if (res.ok) {
      const j = await res.json()
      setRedistResult(`${j.assigned}건 재분배 완료`)
      await fetchRule()
    } else {
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      setRedistResult(`재분배 실패${j.error ? `: ${j.error}` : ''}`)
    }
  }

  const availableCount = useMemo(
    () => members.filter((member) => isDistributionAvailable(member)).length,
    [members],
  )

  if (loading || !rule) {
    return <div className="py-12 text-center text-ink-500">로딩 중...</div>
  }

  return (
    <div className="max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-ink-100">DB 정책·분배</h1>
        <p className="mt-1 text-sm text-ink-400">
          중복 접수 기준과 TM 상담사 자동 배정 규칙을 한 곳에서 관리합니다.
        </p>
      </header>

      <ConsultationPolicyManager initialSettings={initialPolicySettings} embedded />

      <section className="rounded-lg border border-ink-700 bg-surface-darkSoft p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink-100">자동분배 정책</h2>
            <p className="mt-1 text-sm text-ink-400">
              신규 DB는 ON 상태인 TM 상담사에게 배수 기준으로 자동 배정됩니다.
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

        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <div className="rounded-lg border border-ink-700 bg-ink-900 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold text-ink-100">전체 자동분배</div>
                <div className="mt-1 text-xs text-ink-500">
                  OFF면 신규 DB는 미배정 상태로 남습니다.
                </div>
              </div>
              <button
                type="button"
                onClick={() => updateRule({ is_enabled: !rule.is_enabled })}
                disabled={saving}
                className={`rounded-full px-4 py-2 text-sm font-bold transition-colors disabled:opacity-50 ${
                  rule.is_enabled
                    ? 'bg-naver-green text-white hover:bg-naver-dark'
                    : 'border border-ink-700 text-ink-300 hover:border-ink-500 hover:text-ink-100'
                }`}
              >
                {rule.is_enabled ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-ink-700 bg-ink-900 p-4">
            <div className="text-xs font-semibold text-ink-500">분배 대상</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-full border border-naver-green/40 bg-naver-green/15 px-3 py-1.5 text-sm font-bold text-naver-neon">
                상담사
              </span>
              <span className="rounded-full border border-naver-green/40 bg-naver-green/15 px-3 py-1.5 text-sm font-bold text-naver-neon">
                TM실장
              </span>
            </div>
            <p className="mt-2 text-xs text-ink-500">
              마케터와 관리자는 자동분배 후보에서 제외됩니다.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-ink-700 bg-surface-darkSoft p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink-100">담당자별 분배 상태</h2>
            <p className="mt-1 text-sm text-ink-400">
              TM 상담사별 분배 대상 여부와 배수를 관리합니다.
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
          <div className="grid grid-cols-[1.2fr_0.7fr_1fr] gap-3 border-b border-ink-700 bg-ink-900 px-4 py-3 text-xs font-bold text-ink-400 max-lg:hidden">
            <span>담당자</span>
            <span>분배</span>
            <span>배수</span>
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
                분배 대상으로 관리할 TM 상담사가 없습니다.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-ink-700 bg-surface-darkSoft p-5">
        <h2 className="text-lg font-bold text-ink-100">DB 회수·재분배</h2>
        <p className="mt-1 text-sm text-ink-400">
          특정 상담사에게 배정된 DB 전체 또는 특정 상태의 DB만 회수해서 다른 상담사에게 재분배합니다.
        </p>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-ink-500">
              회수할 상담사
            </span>
            <select
              value={reclaimCounselorId}
              onChange={(e) => setReclaimCounselorId(e.target.value)}
              className="w-full rounded border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100"
            >
              {members.map((member) => (
                <option key={member.user_id} value={member.user_id}>
                  {member.display_name ?? member.user_id.slice(0, 8)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-ink-500">
              회수할 상태
            </span>
            <select
              value={reclaimStatusId}
              onChange={(e) => setReclaimStatusId(e.target.value)}
              className="w-full rounded border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100"
            >
              <option value="">전체 상태</option>
              {statuses.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={reclaimAndRedistribute}
              disabled={saving || !rule.is_enabled || !reclaimCounselorId}
              className="w-full rounded-full bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50 lg:w-auto"
            >
              회수 후 재분배
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={redistributeUnassigned}
            disabled={saving || !rule.is_enabled}
            className="rounded-full bg-naver-green px-4 py-2 text-sm font-bold text-white hover:bg-naver-dark disabled:opacity-50"
          >
            미배정 DB 재분배
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
  onSave: (
    patch: Partial<Pick<DistributionMember, 'distribution_enabled' | 'distribution_weight'>>,
  ) => Promise<void>
}) {
  const enabled = member.is_active && member.distribution_enabled
  const weight = normalizeWeight(member.distribution_weight)

  return (
    <div className="grid gap-3 px-4 py-4 lg:grid-cols-[1.2fr_0.7fr_1fr] lg:items-center">
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
        <button
          type="button"
          onClick={() => onSave({ distribution_enabled: !enabled })}
          disabled={saving || !member.is_active}
          className={`rounded-full px-4 py-2 text-sm font-bold transition-colors disabled:opacity-50 ${
            enabled
              ? 'bg-naver-green text-white hover:bg-naver-dark'
              : 'border border-ink-700 text-ink-300 hover:border-ink-500 hover:text-ink-100'
          }`}
        >
          {saving ? '저장 중' : enabled ? 'ON' : 'OFF'}
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-[180px_1fr] sm:items-center">
        <select
          value={weight}
          onChange={(e) =>
            onSave({ distribution_weight: Number(e.target.value) as DistributionWeight })
          }
          disabled={saving || !member.is_active}
          className="rounded border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 disabled:opacity-50"
        >
          {WEIGHT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="text-xs text-ink-500">
          {WEIGHT_OPTIONS.find((option) => option.value === weight)?.caption}
        </span>
      </div>
    </div>
  )
}

function isDistributionAvailable(member: DistributionMember) {
  return member.is_active && member.distribution_enabled
}

function normalizeWeight(value: DistributionMember['distribution_weight']): DistributionWeight {
  const numberValue = Number(value)
  if (numberValue === 0.5 || numberValue === 2) return numberValue
  return 1
}

function roleLabel(role: string) {
  if (role === 'tm_lead') return 'TM실장'
  if (role === 'counselor') return '상담사'
  return role
}
