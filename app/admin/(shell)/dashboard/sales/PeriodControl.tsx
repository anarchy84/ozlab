'use client'

// ─────────────────────────────────────────────
// PeriodControl — sticky 기간 필터
//   preset 6종 + 자유 입력 (다음 단계에 추가)
// ─────────────────────────────────────────────

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const PRESETS = [
  { code: '', label: '전체' },
  { code: 'today', label: '오늘' },
  { code: 'week', label: '최근 7일' },
  { code: 'month', label: '이번 달' },
  { code: 'last_month', label: '지난 달' },
  { code: 'last_3m', label: '최근 3개월' },
]

export function PeriodControl() {
  const sp = useSearchParams()
  const preset = sp?.get('preset') ?? ''

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
          const href = `/admin/dashboard/sales${params.toString() ? `?${params.toString()}` : ''}`
          return (
            <Link
              key={p.code || 'all'}
              href={href}
              className={`px-3 py-1 text-xs rounded border transition-colors ${
                isActive
                  ? 'bg-naver-green text-white border-naver-green font-bold'
                  : 'bg-ink-800 text-ink-300 border-ink-700 hover:bg-ink-700'
              }`}
            >
              {p.label}
            </Link>
          )
        })}
        <span className="text-[11px] text-ink-500 ml-auto">
          ※ 자유 날짜 입력 + 차트 시계열은 다음 단계
        </span>
      </div>
    </div>
  )
}
