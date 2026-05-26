// ─────────────────────────────────────────────
// 상담 옵션 매니저 (클라이언트)
//
// UI :
//   - 5개 카드(업종/지역/단말기/약정/통화시간)
//   - 각 카드 안 옵션 리스트 : 순서/값/활성/삭제 인라인 편집
//   - 카드 하단 : 신규 옵션 추가 input
//
// 동작 :
//   - 옵션 추가 → POST /api/admin/consultation-options
//   - 값/순서/활성 변경 → PATCH /api/admin/consultation-options/[id]
//   - 삭제 → DELETE /api/admin/consultation-options/[id]
//   - 모든 호출은 낙관적 UI 업데이트, 실패 시 롤백 + 에러 표시
// ─────────────────────────────────────────────
'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  CONSULTATION_FIELD_KEYS,
  CONSULTATION_FIELD_LABELS,
  type ConsultationFieldKey,
  type ConsultationFieldOption,
} from '@/lib/consultation-options'

type Props = {
  initialOptions: ConsultationFieldOption[]
  currentUserRole: string
}

const HINTS: Record<ConsultationFieldKey, string> = {
  industry:        '예: 음식점·카페, 소매·판매, 서비스·뷰티, 기타',
  region:          '예: 서울, 경기·인천, 부산·경남',
  device_type:     '예: 신규, 이동, 기변, 미정 / 또는 POS·카드단말기·키오스크',
  contract_period: '예: 무약정, 24개월, 36개월, 48개월, 미정',
  callable_time:   '예: 오전(09-12), 오후(12-18), 저녁(18-21), 언제든',
}

export function ConsultationOptionsManager({ initialOptions }: Props) {
  const router = useRouter()
  const [options, setOptions] = useState<ConsultationFieldOption[]>(initialOptions)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  // 필드별로 grouping (sort_order 오름차순)
  const grouped = useMemo(() => {
    const g: Record<ConsultationFieldKey, ConsultationFieldOption[]> = {
      industry: [],
      region: [],
      device_type: [],
      contract_period: [],
      callable_time: [],
    }
    for (const o of options) {
      g[o.field_key]?.push(o)
    }
    for (const k of CONSULTATION_FIELD_KEYS) {
      g[k].sort((a, b) => a.sort_order - b.sort_order || a.value.localeCompare(b.value))
    }
    return g
  }, [options])

  async function addOption(fieldKey: ConsultationFieldKey, value: string) {
    setError(null)
    const trimmed = value.trim()
    if (!trimmed) return null

    // 같은 필드 마지막 순서 + 10 으로 자동 추천
    const list = grouped[fieldKey]
    const nextOrder = list.length === 0 ? 10 : (list[list.length - 1].sort_order ?? 0) + 10

    try {
      const res = await fetch('/api/admin/consultation-options', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          field_key: fieldKey,
          value: trimmed,
          sort_order: nextOrder,
          is_active: true,
        }),
      })
      if (!res.ok) {
        const j = (await res.json()) as { error?: string }
        throw new Error(j.error ?? `HTTP ${res.status}`)
      }
      const created = (await res.json()) as ConsultationFieldOption
      setOptions((prev) => [...prev, created])
      startTransition(() => router.refresh())
      return created
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      return null
    }
  }

  async function patchOption(id: string, patch: Partial<ConsultationFieldOption>) {
    setError(null)
    const prev = options
    setOptions((curr) => curr.map((o) => (o.id === id ? { ...o, ...patch } : o)))

    try {
      const res = await fetch(`/api/admin/consultation-options/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) {
        const j = (await res.json()) as { error?: string }
        throw new Error(j.error ?? `HTTP ${res.status}`)
      }
      const updated = (await res.json()) as ConsultationFieldOption
      setOptions((curr) => curr.map((o) => (o.id === id ? updated : o)))
      startTransition(() => router.refresh())
    } catch (e) {
      setOptions(prev)
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  async function deleteOption(id: string, value: string) {
    if (!confirm(`"${value}" 옵션을 삭제할까요? 이미 저장된 상담 데이터는 그대로 유지됩니다.`)) return
    setError(null)
    const prev = options
    setOptions((curr) => curr.filter((o) => o.id !== id))
    try {
      const res = await fetch(`/api/admin/consultation-options/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const j = (await res.json()) as { error?: string }
        throw new Error(j.error ?? `HTTP ${res.status}`)
      }
      startTransition(() => router.refresh())
    } catch (e) {
      setOptions(prev)
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded border border-red-800/50 bg-red-900/20 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {CONSULTATION_FIELD_KEYS.map((key) => (
          <FieldCard
            key={key}
            fieldKey={key}
            label={CONSULTATION_FIELD_LABELS[key]}
            hint={HINTS[key]}
            options={grouped[key]}
            onAdd={(v) => addOption(key, v)}
            onPatch={patchOption}
            onDelete={deleteOption}
          />
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 필드 카드 — 단일 필드의 옵션 리스트 + 추가 input
// ─────────────────────────────────────────────
function FieldCard({
  fieldKey,
  label,
  hint,
  options,
  onAdd,
  onPatch,
  onDelete,
}: {
  fieldKey: ConsultationFieldKey
  label: string
  hint: string
  options: ConsultationFieldOption[]
  onAdd: (value: string) => Promise<ConsultationFieldOption | null>
  onPatch: (id: string, patch: Partial<ConsultationFieldOption>) => Promise<void>
  onDelete: (id: string, value: string) => Promise<void>
}) {
  const [newValue, setNewValue] = useState('')
  const [adding, setAdding] = useState(false)

  async function handleAdd() {
    if (!newValue.trim() || adding) return
    setAdding(true)
    const created = await onAdd(newValue)
    setAdding(false)
    if (created) setNewValue('')
  }

  const activeCount = options.filter((o) => o.is_active).length

  return (
    <div className="rounded border border-ink-700 bg-surface-darkSoft p-4 space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="font-semibold text-ink-100">
          {label}
          <span className="ml-2 text-xs text-ink-500">({fieldKey})</span>
        </h3>
        <span className="text-xs text-ink-500">
          활성 {activeCount} / 전체 {options.length}
        </span>
      </div>

      {/* 옵션 리스트 */}
      <div className="space-y-1">
        {options.length === 0 ? (
          <div className="text-xs text-ink-500 italic py-2">
            아직 옵션이 없습니다. 아래에서 추가하세요.
          </div>
        ) : (
          options.map((o) => (
            <OptionRow
              key={o.id}
              option={o}
              onPatch={(patch) => onPatch(o.id, patch)}
              onDelete={() => onDelete(o.id, o.value)}
            />
          ))
        )}
      </div>

      {/* 신규 추가 */}
      <div className="pt-2 border-t border-ink-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAdd()
              }
            }}
            placeholder={hint}
            className="flex-1 px-2 py-1.5 text-sm bg-ink-900 border border-ink-700 text-ink-100 placeholder-ink-500 rounded focus:outline-none focus:border-brand-blue"
            disabled={adding}
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding || !newValue.trim()}
            className="px-3 py-1.5 text-sm font-medium bg-brand-blue text-white rounded hover:bg-brand-dark disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {adding ? '추가 중...' : '+ 추가'}
          </button>
        </div>
        <p className="mt-1 text-xs text-ink-600">{hint}</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 옵션 행 — 순서/값/활성/삭제 인라인 편집
// ─────────────────────────────────────────────
function OptionRow({
  option,
  onPatch,
  onDelete,
}: {
  option: ConsultationFieldOption
  onPatch: (patch: Partial<ConsultationFieldOption>) => Promise<void>
  onDelete: () => Promise<void>
}) {
  return (
    <div
      className={`flex items-center gap-2 px-2 py-1.5 rounded ${
        option.is_active ? 'bg-ink-900/40' : 'bg-ink-900/20 opacity-60'
      }`}
    >
      {/* 순서 */}
      <input
        type="number"
        defaultValue={option.sort_order}
        onBlur={(e) => {
          const v = parseInt(e.target.value, 10)
          if (!Number.isNaN(v) && v !== option.sort_order) {
            onPatch({ sort_order: v })
          }
        }}
        className="w-14 px-1 py-0.5 text-xs bg-ink-900 border border-ink-700 text-ink-100 rounded focus:outline-none focus:border-brand-blue"
        title="순서 (작을수록 위)"
      />

      {/* 값 */}
      <input
        type="text"
        defaultValue={option.value}
        onBlur={(e) => {
          const v = e.target.value.trim()
          if (v && v !== option.value) onPatch({ value: v })
          else if (!v) e.target.value = option.value
        }}
        className="flex-1 px-2 py-0.5 text-sm bg-ink-900 border border-ink-700 text-ink-100 rounded focus:outline-none focus:border-brand-blue"
      />

      {/* 활성 토글 */}
      <label className="flex items-center gap-1 text-xs text-ink-500 cursor-pointer">
        <input
          type="checkbox"
          checked={option.is_active}
          onChange={(e) => onPatch({ is_active: e.target.checked })}
          className="w-4 h-4 cursor-pointer"
        />
        활성
      </label>

      {/* 삭제 */}
      <button
        type="button"
        onClick={onDelete}
        className="text-xs text-red-400 hover:text-red-300 px-1"
        title="옵션 삭제"
      >
        삭제
      </button>
    </div>
  )
}
