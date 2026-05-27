'use client'

// ─────────────────────────────────────────────
// PeriodControl — paid-media 대시보드 기간 필터
//   sales 와 동일 패턴 (base 경로만 paid-media)
// ─────────────────────────────────────────────

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const PRESETS = [
  { code: 'today',      label: '오늘' },
  { code: 'week',       label: '최근 7일' },
  { code: 'month',      label: '이번 달' },
  { code: 'last_month', label: '지난 달' },
  { code: 'last_3m',    label: '최근 3개월' },
  { code: '',           label: '전체' },
]

export function PeriodControl() {
  const sp = useSearchParams()
  const preset = sp?.get('preset') ?? 'week'  // 기본값 '최근 7일'

  return (
    <div className="bg-ink-900/80 backdrop-blur border border-ink-700 rounded-lg p-3 sticky top-14 z-20">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] text-ink-500 font-bold uppercase tracking-wider mr-1">
          기간
        </span>
        {PRESETS.map((p) => {
          const isActive = preset === p.code
          const params = new URLSearchParams()
          if (p.code) params.set('preset', p.code)
          const href = `/admin/dashboard/paid-media${params.toString() ? `?${params.toString()}` : ''}`
          return (
            <Link
              key={p.code || 'all'}
              href={href}
              className={`px-3 py-1 text-xs rounded border transition-colors ${
                isActive
                  ? 'bg-brand-blue text-white border-brand-blue font-bold'
                  : 'bg-ink-800 text-ink-300 border-ink-700 hover:bg-ink-700'
              }`}
            >
              {p.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
