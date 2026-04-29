// ─────────────────────────────────────────────
// 상태 CRUD 매니저 (클라이언트 컴포넌트)
//
// 동작 :
//   - 목록 표시 + 인라인 토글로 플래그 변경 → PATCH /api/admin/statuses/[id]
//   - [+ 새 상태 추가] → 모달 → POST /api/admin/statuses
//   - [삭제] → DELETE /api/admin/statuses/[id] (사용 중이면 409)
//
// 안전장치 :
//   - 토글 변경은 즉시 PATCH (낙관적 UI 업데이트)
//   - 실패 시 원래 값으로 복원 + 에러 토스트
// ─────────────────────────────────────────────
'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import type { DbStatus } from '@/lib/admin/types'

const FLAGS: { key: keyof DbStatus; label: string; tip: string }[] = [
  { key: 'send_message',            label: '알림톡',     tip: '상태 변경 시 카카오 알림톡 자동 발송' },
  { key: 'is_promising',            label: '가망',       tip: '가망 고객 자동 분류' },
  { key: 'force_recall',            label: '재통화',     tip: '재통화 큐 자동 등록' },
  { key: 'is_conversion',           label: '전환',       tip: '개통/매출 카운트' },
  { key: 'is_unapproved',           label: '허수',       tip: '미승인 카운트' },
  { key: 'in_progress',             label: '진행중',     tip: '개통진행중 표시' },
  { key: 'cannot_proceed',          label: '개통불가',   tip: '개통불가 표시' },
  { key: 'needs_counselor_confirm', label: '상담원확인', tip: '상담원 확인 필요' },
  { key: 'include_in_gcl',          label: 'GCL',        tip: '외부 데이터 추출 대상' },
  { key: 'show_in_dashboard',       label: '대시보드',   tip: '메인 KPI 카드 노출' },
]

export function StatusesManager({ initialStatuses }: { initialStatuses: DbStatus[] }) {
  const router = useRouter()
  const [statuses, setStatuses] = useState<DbStatus[]>(initialStatuses)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  // ----- 플래그 토글 (낙관적 업데이트) -----
  async function toggleFlag(id: number, key: keyof DbStatus, value: boolean) {
    setError(null)
    const prev = statuses
    setStatuses((s) => s.map((st) => (st.id === id ? { ...st, [key]: value } : st)))

    try {
      const res = await fetch(`/api/admin/statuses/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      })
      if (!res.ok) {
        const j = (await res.json()) as { error?: string }
        throw new Error(j.error ?? `HTTP ${res.status}`)
      }
      startTransition(() => router.refresh())
    } catch (e) {
      setStatuses(prev)
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  // ----- 색상/라벨/code 변경 (blur 시 저장) -----
  async function patchField<K extends keyof DbStatus>(id: number, key: K, value: DbStatus[K]) {
    setError(null)
    try {
      const res = await fetch(`/api/admin/statuses/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      })
      if (!res.ok) {
        const j = (await res.json()) as { error?: string }
        throw new Error(j.error ?? `HTTP ${res.status}`)
      }
      const j = (await res.json()) as { status: DbStatus }
      setStatuses((s) => s.map((st) => (st.id === id ? j.status : st)))
      startTransition(() => router.refresh())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  // ----- 삭제 -----
  async function handleDelete(id: number, label: string) {
    if (!confirm(`"${label}" 상태를 정말 삭제할까요? 사용 중이면 거절됩니다.`)) return
    setError(null)
    try {
      const res = await fetch(`/api/admin/statuses/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const j = (await res.json()) as { error?: string; hint?: string }
        throw new Error([j.error, j.hint].filter(Boolean).join(' / '))
      }
      setStatuses((s) => s.filter((st) => st.id !== id))
      startTransition(() => router.refresh())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-ink-500">총 {statuses.length}개</span>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="px-3 py-1.5 text-sm font-medium bg-naver-green text-white rounded hover:bg-naver-dark transition-colors"
        >
          + 새 상태 추가
        </button>
      </div>

      {error && (
        <div className="rounded border border-red-800/50 bg-red-900/20 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* 데스크톱 — 가로 스크롤 가능한 표 */}
      <div className="overflow-x-auto rounded border border-ink-700 bg-surface-darkSoft">
        <table className="w-full text-sm">
          <thead className="bg-ink-900 text-ink-600">
            <tr>
              <th className="px-2 py-2 text-left font-semibold w-12">순서</th>
              <th className="px-2 py-2 text-left font-semibold">코드</th>
              <th className="px-2 py-2 text-left font-semibold">라벨</th>
              <th className="px-2 py-2 text-left font-semibold w-16">색상</th>
              {FLAGS.map((f) => (
                <th
                  key={f.key as string}
                  className="px-1 py-2 text-center font-semibold whitespace-nowrap"
                  title={f.tip}
                >
                  {f.label}
                </th>
              ))}
              <th className="px-2 py-2 text-center font-semibold w-16">활성</th>
              <th className="px-2 py-2 text-center font-semibold w-16">관리</th>
            </tr>
          </thead>
          <tbody>
            {statuses.map((st) => (
              <tr key={st.id} className="border-t border-ink-700 hover:bg-ink-800/40">
                <td className="px-2 py-2">
                  <input
                    type="number"
                    defaultValue={st.sort_order}
                    onBlur={(e) => {
                      const v = parseInt(e.target.value, 10)
                      if (!Number.isNaN(v) && v !== st.sort_order) {
                        patchField(st.id, 'sort_order', v)
                      }
                    }}
                    className="w-14 px-1 py-0.5 text-xs bg-ink-900 border border-ink-700 text-ink-100 rounded focus:outline-none focus:border-naver-green"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="text"
                    defaultValue={st.code}
                    onBlur={(e) => {
                      const v = e.target.value.trim()
                      if (v && v !== st.code) patchField(st.id, 'code', v)
                    }}
                    className="w-24 px-1 py-0.5 text-xs font-mono bg-ink-900 border border-ink-700 text-ink-100 rounded focus:outline-none focus:border-naver-green"
                  />
                </td>
                <td className="px-2 py-2">
                  <span
                    className="inline-block px-2 py-1 rounded text-xs font-medium"
                    style={{ backgroundColor: st.bg_color, color: st.text_color }}
                  >
                    <input
                      type="text"
                      defaultValue={st.label}
                      onBlur={(e) => {
                        const v = e.target.value.trim()
                        if (v && v !== st.label) patchField(st.id, 'label', v)
                      }}
                      className="bg-transparent outline-none w-24 placeholder:text-ink-500"
                      style={{ color: st.text_color }}
                    />
                  </span>
                </td>
                <td className="px-2 py-2">
                  <input
                    type="color"
                    defaultValue={st.bg_color}
                    onChange={(e) => patchField(st.id, 'bg_color', e.target.value)}
                    className="w-8 h-6 cursor-pointer"
                  />
                </td>
                {FLAGS.map((f) => (
                  <td key={f.key as string} className="px-1 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={st[f.key] as boolean}
                      onChange={(e) => toggleFlag(st.id, f.key, e.target.checked)}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </td>
                ))}
                <td className="px-2 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={st.is_active}
                    onChange={(e) => toggleFlag(st.id, 'is_active', e.target.checked)}
                    className="w-4 h-4 cursor-pointer"
                  />
                </td>
                <td className="px-2 py-2 text-center">
                  <button
                    type="button"
                    onClick={() => handleDelete(st.id, st.label)}
                    className="text-xs text-red-400 hover:text-red-300"
                    disabled={isPending}
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
            {statuses.length === 0 && (
              <tr>
                <td colSpan={FLAGS.length + 6} className="px-4 py-8 text-center text-ink-500">
                  등록된 상태가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <AddStatusModal
          onClose={() => setShowAdd(false)}
          onCreated={(s) => {
            setStatuses((curr) => [...curr, s].sort((a, b) => a.sort_order - b.sort_order))
            setShowAdd(false)
            startTransition(() => router.refresh())
          }}
        />
      )}
    </div>
  )
}

// ----- 신규 추가 모달 -----
function AddStatusModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (s: DbStatus) => void
}) {
  const [code, setCode] = useState('')
  const [label, setLabel] = useState('')
  const [bgColor, setBgColor] = useState('#9CA3AF')
  const [sortOrder, setSortOrder] = useState(999)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/statuses', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          code: code.trim(),
          label: label.trim(),
          bg_color: bgColor,
          text_color: '#111827',
          sort_order: sortOrder,
          is_active: true,
          show_in_dashboard: true,
        }),
      })
      if (!res.ok) {
        const j = (await res.json()) as { error?: string }
        throw new Error(j.error ?? `HTTP ${res.status}`)
      }
      const j = (await res.json()) as { status: DbStatus }
      onCreated(j.status)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <form
        onSubmit={handleSubmit}
        className="bg-surface-darkSoft rounded-lg shadow-xl w-full max-w-md p-6 space-y-4"
      >
        <h3 className="text-lg font-bold text-ink-100">새 상태 추가</h3>

        <label className="block text-sm">
          <span className="text-ink-200 font-medium">코드 (영문, unique)</span>
          <input
            type="text"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="예: callback_request"
            className="mt-1 w-full px-3 py-2 border border-ink-700 rounded font-mono text-sm"
          />
        </label>

        <label className="block text-sm">
          <span className="text-ink-200 font-medium">라벨 (한글)</span>
          <input
            type="text"
            required
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="예: 콜백 요청"
            className="mt-1 w-full px-3 py-2 bg-ink-900 border border-ink-700 text-ink-100 placeholder-ink-500 rounded text-sm focus:outline-none focus:border-naver-green"
          />
        </label>

        <div className="flex items-end gap-3">
          <label className="block text-sm flex-1">
            <span className="text-ink-200 font-medium">색상</span>
            <input
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              className="mt-1 w-full h-9 cursor-pointer"
            />
          </label>
          <label className="block text-sm flex-1">
            <span className="text-ink-200 font-medium">정렬 순서</span>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 999)}
              className="mt-1 w-full px-3 py-2 bg-ink-900 border border-ink-700 text-ink-100 placeholder-ink-500 rounded text-sm focus:outline-none focus:border-naver-green"
            />
          </label>
        </div>

        <div className="text-xs text-ink-500">
          자동화 플래그(알림톡/가망/전환 등)는 추가 후 표에서 토글하세요.
        </div>

        {error && (
          <div className="rounded border border-red-800/50 bg-red-900/20 p-2 text-xs text-red-300">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm border border-ink-700 rounded hover:bg-ink-900"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={submitting || !code.trim() || !label.trim()}
            className="px-3 py-1.5 text-sm bg-naver-green text-white rounded hover:bg-naver-dark disabled:opacity-50"
          >
            {submitting ? '추가 중...' : '추가'}
          </button>
        </div>
      </form>
    </div>
  )
}
