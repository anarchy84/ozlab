// ─────────────────────────────────────────────
// 상담 상태 변경 버튼 그룹 (어드민 목록 행 우측에 배치)
//   · 신규 → 연락중 (전화 걸었음)
//   · 신규/연락중 → 완료 (계약 또는 종결)
//   · 신규/연락중 → 반려 (스팸·무관)
//
// 클라이언트 컴포넌트 — fetch PATCH /api/admin/consultations/[id]
// 성공 시 router.refresh() 로 SSR 재실행 → 목록 갱신
// ─────────────────────────────────────────────
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type Status = 'new' | 'contacted' | 'done' | 'rejected'

interface Props {
  id: string
  currentStatus: string
}

export function ConsultationStatusActions({ id, currentStatus }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const change = async (next: Status) => {
    if (busy || pending) return
    if (next === currentStatus) return
    // 반려·완료는 한번 더 확인
    if (next === 'rejected' || next === 'done') {
      const ok = window.confirm(
        next === 'rejected' ? '이 신청을 반려 처리할까요?' : '완료 처리할까요?'
      )
      if (!ok) return
    }

    setBusy(true)
    setErr(null)
    try {
      const res = await fetch(`/api/admin/consultations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error ?? '상태 변경 실패')
      }
      // 목록 새로고침 (SSR 재실행)
      startTransition(() => router.refresh())
    } catch (e) {
      setErr(e instanceof Error ? e.message : '상태 변경 실패')
    } finally {
      setBusy(false)
    }
  }

  // 현재 상태에 따라 표시할 액션
  const actions: Array<{ next: Status; label: string; tone: 'green' | 'gray' | 'red' }> = []
  if (currentStatus === 'new') {
    actions.push({ next: 'contacted', label: '연락중', tone: 'green' })
    actions.push({ next: 'done', label: '완료', tone: 'gray' })
    actions.push({ next: 'rejected', label: '반려', tone: 'red' })
  } else if (currentStatus === 'contacted') {
    actions.push({ next: 'done', label: '완료', tone: 'green' })
    actions.push({ next: 'rejected', label: '반려', tone: 'red' })
  } else {
    // done / rejected → "신규로 되돌리기"만 제공
    actions.push({ next: 'new', label: '되돌리기', tone: 'gray' })
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <div className="inline-flex gap-1">
        {actions.map((a) => (
          <button
            key={a.next}
            type="button"
            onClick={() => change(a.next)}
            disabled={busy || pending}
            className={`px-2.5 py-1 text-[12px] rounded-md border transition-colors disabled:opacity-50 ${
              a.tone === 'green'
                ? 'border-naver-green text-naver-neon hover:bg-naver-green/15'
                : a.tone === 'red'
                ? 'border-accent-red/60 text-accent-red hover:bg-accent-red/15'
                : 'border-ink-700 text-ink-300 hover:bg-ink-800'
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>
      {err && <span className="text-[10px] text-accent-red">{err}</span>}
    </div>
  )
}
