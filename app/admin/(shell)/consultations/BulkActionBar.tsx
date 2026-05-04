'use client'

// ─────────────────────────────────────────────
// 벌크 액션 바 (체크박스 1건 이상 선택 시 sticky 노출)
//   - 상태 일괄 변경
//   - 상담원 일괄 배정
//   - CSV 다운로드
//   - 일괄 삭제 (super_admin only)
// ─────────────────────────────────────────────

import { useState } from 'react'
import type { DbStatus } from '@/lib/admin/types'

interface CounselorOption {
  user_id: string
  display_name: string | null
}

interface Props {
  selectedIds: string[]
  statuses: DbStatus[]
  counselors: CounselorOption[]
  canDelete: boolean
  onClear: () => void
  onDone: () => void
}

export function BulkActionBar({
  selectedIds,
  statuses,
  counselors,
  canDelete,
  onClear,
  onDone,
}: Props) {
  const [working, setWorking] = useState<string | null>(null)
  const [statusId, setStatusId] = useState<string>('')
  const [counselorId, setCounselorId] = useState<string>('')

  const count = selectedIds.length

  async function callBulk(payload: Record<string, unknown>) {
    setWorking('진행 중')
    const res = await fetch('/api/admin/consultations/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: selectedIds, ...payload }),
    })
    setWorking(null)
    if (res.ok) {
      const j = await res.json()
      alert(`✅ ${j.affected ?? count}건 처리 완료`)
      onDone()
    } else {
      const err = await res.json().catch(() => ({}))
      alert(`❌ 실패: ${err.error ?? 'unknown'}`)
    }
  }

  async function changeStatus() {
    if (!statusId) return alert('상태를 선택하세요.')
    if (!confirm(`${count}건의 상태를 일괄 변경할까요?`)) return
    await callBulk({ action: 'set_status', status_id: parseInt(statusId, 10) })
  }
  async function assignCounselor() {
    if (!counselorId) return alert('상담원을 선택하세요.')
    if (!confirm(`${count}건을 선택한 상담원에게 일괄 배정할까요?`)) return
    await callBulk({ action: 'assign_counselor', counselor_id: counselorId })
  }
  async function bulkDelete() {
    if (
      !confirm(
        `⚠️ ${count}건을 영구 삭제합니다.\n복구 불가. 정말 진행할까요?`
      )
    ) return
    await callBulk({ action: 'delete' })
  }

  function downloadCsv() {
    const params = new URLSearchParams({ ids: selectedIds.join(',') })
    window.location.href = `/api/admin/consultations/export?${params.toString()}`
  }

  return (
    <div className="sticky top-14 z-30 bg-naver-green/15 backdrop-blur border border-naver-green/40 rounded-lg p-3 mb-3 shadow-lg">
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-sm text-ink-100">
          ✓ <strong>{count}건</strong> 선택됨
        </div>

        {/* 상태 일괄 변경 */}
        <div className="flex items-center gap-1.5">
          <select
            value={statusId}
            onChange={(e) => setStatusId(e.target.value)}
            className="px-2 py-1 text-xs bg-ink-900 border border-ink-700 text-ink-100 rounded"
          >
            <option value="">상태 선택</option>
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={changeStatus}
            disabled={!!working || !statusId}
            className="px-2 py-1 text-xs bg-ink-700 hover:bg-ink-600 text-ink-100 rounded disabled:opacity-50"
          >
            상태 변경
          </button>
        </div>

        {/* 상담원 일괄 배정 */}
        <div className="flex items-center gap-1.5">
          <select
            value={counselorId}
            onChange={(e) => setCounselorId(e.target.value)}
            className="px-2 py-1 text-xs bg-ink-900 border border-ink-700 text-ink-100 rounded"
          >
            <option value="">상담원 선택</option>
            {counselors.map((c) => (
              <option key={c.user_id} value={c.user_id}>
                {c.display_name ?? c.user_id.slice(0, 8)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={assignCounselor}
            disabled={!!working || !counselorId}
            className="px-2 py-1 text-xs bg-ink-700 hover:bg-ink-600 text-ink-100 rounded disabled:opacity-50"
          >
            상담원 배정
          </button>
        </div>

        {/* CSV */}
        <button
          type="button"
          onClick={downloadCsv}
          disabled={!!working}
          className="px-2 py-1 text-xs bg-ink-700 hover:bg-ink-600 text-ink-100 rounded"
        >
          📥 선택 CSV
        </button>

        {/* 삭제 */}
        {canDelete && (
          <button
            type="button"
            onClick={bulkDelete}
            disabled={!!working}
            className="px-2 py-1 text-xs bg-red-600/80 hover:bg-red-600 text-white rounded disabled:opacity-50"
          >
            🗑 일괄 삭제
          </button>
        )}

        {/* 클리어 */}
        <button
          type="button"
          onClick={onClear}
          className="ml-auto px-2 py-1 text-xs text-ink-400 hover:text-ink-100"
        >
          선택 해제 ✕
        </button>
      </div>

      {working && (
        <div className="mt-2 text-xs text-ink-300">{working}…</div>
      )}
    </div>
  )
}
