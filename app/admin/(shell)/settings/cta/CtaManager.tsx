// ─────────────────────────────────────────────
// CTA 관리 클라이언트 컴포넌트
// ─────────────────────────────────────────────
'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import {
  CTA_PLACEMENTS,
  CTA_STYLES,
  type CtaButton,
  type CtaPerformanceRow,
  type CtaPlacement,
  type CtaStyle,
} from '@/lib/admin/types'

const STYLE_LABELS: Record<CtaStyle, string> = {
  primary: '메인 (그린)',
  secondary: '서브 (회색)',
  ghost: '고스트 (텍스트)',
  outline: '아웃라인',
  floating: '플로팅',
}

const PLACEMENT_LABELS: Record<CtaPlacement, string> = {
  nav: '상단 네비',
  hero: '히어로',
  showcase: '쇼케이스',
  promotion: '프로모션',
  floating: '떠다니는',
  footer: '푸터',
  pricing: '가격',
  features: '기능',
  mechanism: '작동원리',
  review: '리뷰',
  custom: '커스텀',
}

export function CtaManager({
  initialCtas,
  initialPerfMap,
}: {
  initialCtas: CtaButton[]
  initialPerfMap: Record<number, CtaPerformanceRow>
}) {
  const router = useRouter()
  const [ctas, setCtas] = useState(initialCtas)
  const [perfMap] = useState(initialPerfMap)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  async function patch<K extends keyof CtaButton>(
    id: number,
    key: K,
    value: CtaButton[K],
  ) {
    setError(null)
    const prev = ctas
    setCtas((s) => s.map((c) => (c.id === id ? { ...c, [key]: value } : c)))
    try {
      const res = await fetch(`/api/admin/cta/${id}`, {
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
      setCtas(prev)
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  async function handleDelete(id: number, label: string) {
    if (!confirm(`"${label}" CTA 를 삭제할까요?`)) return
    try {
      const res = await fetch(`/api/admin/cta/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const j = (await res.json()) as { error?: string }
        throw new Error(j.error ?? `HTTP ${res.status}`)
      }
      setCtas((s) => s.filter((c) => c.id !== id))
      startTransition(() => router.refresh())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-ink-500">총 {ctas.length}개 CTA</span>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="px-3 py-1.5 text-sm font-medium bg-naver-green text-white rounded hover:bg-naver-dark transition-colors"
        >
          + CTA 추가
        </button>
      </div>

      {error && (
        <div className="rounded border border-red-800/50 bg-red-900/20 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded border border-ink-700 bg-surface-darkSoft">
        <table className="w-full text-sm">
          <thead className="bg-ink-900 text-ink-400 text-xs">
            <tr>
              <th className="px-2 py-2 text-left font-semibold w-14">순서</th>
              <th className="px-2 py-2 text-left font-semibold">위치</th>
              <th className="px-2 py-2 text-left font-semibold">라벨</th>
              <th className="px-2 py-2 text-left font-semibold">목적지</th>
              <th className="px-2 py-2 text-left font-semibold">UTM 캠페인</th>
              <th className="px-2 py-2 text-left font-semibold">스타일</th>
              <th className="px-2 py-2 text-right font-semibold">신청</th>
              <th className="px-2 py-2 text-right font-semibold">전환</th>
              <th className="px-2 py-2 text-right font-semibold">전환율</th>
              <th className="px-2 py-2 text-center font-semibold">활성</th>
              <th className="px-2 py-2 text-center font-semibold">관리</th>
            </tr>
          </thead>
          <tbody>
            {ctas.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-ink-500">
                  CTA 가 없습니다.
                </td>
              </tr>
            )}
            {ctas.map((c) => {
              const perf = perfMap[c.id]
              return (
                <tr key={c.id} className="border-t border-ink-700 hover:bg-ink-800/40">
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      defaultValue={c.sort_order}
                      onBlur={(e) => {
                        const v = parseInt(e.target.value, 10)
                        if (!Number.isNaN(v) && v !== c.sort_order) patch(c.id, 'sort_order', v)
                      }}
                      className="w-14 px-1 py-0.5 text-xs bg-ink-900 border border-ink-700 text-ink-100 rounded"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <select
                      defaultValue={c.placement}
                      onChange={(e) => patch(c.id, 'placement', e.target.value as CtaPlacement)}
                      className="px-1 py-0.5 text-xs bg-ink-900 border border-ink-700 text-ink-100 rounded"
                    >
                      {CTA_PLACEMENTS.map((p) => (
                        <option key={p} value={p}>
                          {PLACEMENT_LABELS[p]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      defaultValue={c.label}
                      onBlur={(e) => {
                        const v = e.target.value.trim()
                        if (v && v !== c.label) patch(c.id, 'label', v)
                      }}
                      className="w-44 px-1 py-0.5 text-sm bg-ink-900 border border-ink-700 text-ink-100 rounded"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      defaultValue={c.target_href}
                      onBlur={(e) => {
                        const v = e.target.value.trim()
                        if (v && v !== c.target_href) patch(c.id, 'target_href', v)
                      }}
                      className="w-32 px-1 py-0.5 text-xs font-mono bg-ink-900 border border-ink-700 text-ink-100 rounded"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      defaultValue={c.utm_campaign ?? ''}
                      onBlur={(e) => {
                        const v = e.target.value.trim() || null
                        if (v !== c.utm_campaign) patch(c.id, 'utm_campaign', v)
                      }}
                      className="w-36 px-1 py-0.5 text-xs font-mono bg-ink-900 border border-ink-700 text-ink-100 rounded"
                      placeholder="cta_..."
                    />
                  </td>
                  <td className="px-2 py-2">
                    <select
                      defaultValue={c.style}
                      onChange={(e) => patch(c.id, 'style', e.target.value as CtaStyle)}
                      className="px-1 py-0.5 text-xs bg-ink-900 border border-ink-700 text-ink-100 rounded"
                    >
                      {CTA_STYLES.map((s) => (
                        <option key={s} value={s}>
                          {STYLE_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2 text-right text-ink-200">
                    {perf?.lead_count ?? 0}
                  </td>
                  <td className="px-2 py-2 text-right text-naver-neon font-semibold">
                    {perf?.conversion_count ?? 0}
                  </td>
                  <td className="px-2 py-2 text-right text-naver-neon">
                    {perf?.conversion_rate_pct ?? '0.00'}%
                  </td>
                  <td className="px-2 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={c.is_active}
                      onChange={(e) => patch(c.id, 'is_active', e.target.checked)}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id, c.label)}
                      disabled={isPending}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <AddCtaModal
          onClose={() => setShowAdd(false)}
          onCreated={(c) => {
            setCtas((s) => [...s, c])
            setShowAdd(false)
            startTransition(() => router.refresh())
          }}
        />
      )}
    </div>
  )
}

function AddCtaModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (c: CtaButton) => void
}) {
  const [placement, setPlacement] = useState<CtaPlacement>('hero')
  const [label, setLabel] = useState('')
  const [targetHref, setTargetHref] = useState('#apply')
  const [style, setStyle] = useState<CtaStyle>('primary')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/cta', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          placement,
          label: label.trim(),
          target_href: targetHref.trim(),
          style,
          utm_source: 'site',
          utm_medium: 'cta',
          utm_campaign: `cta_${placement}_${label.trim().replace(/[^a-z0-9가-힣]/gi, '_').slice(0, 30) || 'custom'}`,
        }),
      })
      if (!res.ok) {
        const j = (await res.json()) as { error?: string }
        throw new Error(j.error ?? `HTTP ${res.status}`)
      }
      const j = (await res.json()) as { cta: CtaButton }
      onCreated(j.cta)
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
        className="bg-surface-darkSoft border border-ink-700 rounded-lg shadow-xl w-full max-w-md p-6 space-y-4"
      >
        <h3 className="text-lg font-bold text-ink-100">새 CTA 추가</h3>

        <label className="block text-sm">
          <span className="text-ink-200 font-medium">위치 *</span>
          <select
            value={placement}
            onChange={(e) => setPlacement(e.target.value as CtaPlacement)}
            className="mt-1 w-full px-3 py-2 bg-ink-900 border border-ink-700 text-ink-100 rounded text-sm"
          >
            {CTA_PLACEMENTS.map((p) => (
              <option key={p} value={p}>
                {PLACEMENT_LABELS[p]} ({p})
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="text-ink-200 font-medium">라벨 *</span>
          <input
            type="text"
            required
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="예: 무료 상담 받기"
            className="mt-1 w-full px-3 py-2 bg-ink-900 border border-ink-700 text-ink-100 placeholder-ink-500 rounded text-sm"
          />
        </label>

        <label className="block text-sm">
          <span className="text-ink-200 font-medium">목적지 (href)</span>
          <input
            type="text"
            value={targetHref}
            onChange={(e) => setTargetHref(e.target.value)}
            className="mt-1 w-full px-3 py-2 bg-ink-900 border border-ink-700 text-ink-100 rounded text-sm font-mono"
          />
          <span className="text-xs text-ink-500">기본 #apply (메인 폼). 외부 URL 도 가능 — 단 어트리뷰션 추적 불가.</span>
        </label>

        <label className="block text-sm">
          <span className="text-ink-200 font-medium">스타일</span>
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value as CtaStyle)}
            className="mt-1 w-full px-3 py-2 bg-ink-900 border border-ink-700 text-ink-100 rounded text-sm"
          >
            {CTA_STYLES.map((s) => (
              <option key={s} value={s}>
                {STYLE_LABELS[s]}
              </option>
            ))}
          </select>
        </label>

        <div className="text-xs text-ink-500">
          UTM 캠페인 코드는 자동 생성됩니다 (추가 후 표에서 수정 가능).
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
            className="px-3 py-1.5 text-sm border border-ink-700 text-ink-200 rounded hover:bg-ink-800"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={submitting || !label.trim()}
            className="px-3 py-1.5 text-sm bg-naver-green text-white rounded hover:bg-naver-dark disabled:opacity-50"
          >
            {submitting ? '추가 중...' : '추가'}
          </button>
        </div>
      </form>
    </div>
  )
}
