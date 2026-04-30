// ─────────────────────────────────────────────
// CohortBreakdown — 통장 매출 카드 (코호트별 가로 막대 분해)
//   메인(이번달) + 오늘 두 곳에서 사용
// ─────────────────────────────────────────────

interface BreakdownItem {
  label: string
  hint?: string
  amount: number
  net: number
}

export function CohortBreakdown({
  title,
  subtitle,
  totalAmount,
  totalNet,
  breakdown,
  accent = false,
  compact = false,
}: {
  title: string
  subtitle?: string
  totalAmount: number
  totalNet: number
  breakdown: BreakdownItem[]
  accent?: boolean
  compact?: boolean
}) {
  const max = Math.max(...breakdown.map((b) => b.amount), 1)
  const cardCls = accent
    ? 'bg-naver-green/10 border-naver-green/40'
    : 'bg-surface-darkSoft border-ink-700'

  // 인사이트 — 당월 코호트 vs 누적 코호트 비율
  const currentMonthRevenue = breakdown[0]?.amount ?? 0
  const accumulated = breakdown.slice(1).reduce((s, b) => s + b.amount, 0)
  const currentPct =
    totalAmount > 0 ? Math.round((currentMonthRevenue / totalAmount) * 100) : 0
  const accumulatedPct =
    totalAmount > 0 ? Math.round((accumulated / totalAmount) * 100) : 0

  return (
    <section className={`border rounded-lg p-5 ${cardCls}`}>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div>
          <h2 className={`font-bold text-ink-100 ${compact ? 'text-base' : 'text-lg'}`}>
            {title}
          </h2>
          {subtitle && <p className="text-[11px] text-ink-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className="text-right">
          <div className={`font-bold ${accent ? 'text-naver-neon' : 'text-ink-100'} ${compact ? 'text-2xl' : 'text-3xl'}`}>
            {totalAmount.toLocaleString()}원
          </div>
          <div className="text-[11px] text-ink-400 mt-0.5">
            순매출 {totalNet.toLocaleString()}원
          </div>
        </div>
      </div>

      {totalAmount === 0 ? (
        <p className="text-sm text-ink-500 italic py-3">아직 매출 없음</p>
      ) : (
        <>
          <div className="space-y-2">
            {breakdown.map((b, idx) => {
              const widthPct = (b.amount / max) * 100
              const sharePct =
                totalAmount > 0 ? Math.round((b.amount / totalAmount) * 100) : 0
              return (
                <div key={idx}>
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span className="text-ink-200">
                      {b.label}
                      {b.hint && (
                        <span className="text-ink-500 ml-2 font-normal">— {b.hint}</span>
                      )}
                    </span>
                    <span className="font-mono font-bold text-ink-100">
                      {b.amount.toLocaleString()}원{' '}
                      <span className="text-ink-500 font-normal">({sharePct}%)</span>
                    </span>
                  </div>
                  <div className="h-2 bg-ink-800 rounded overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        idx === 0 ? 'bg-naver-green' : idx === 1 ? 'bg-blue-500' : idx === 2 ? 'bg-amber-500' : 'bg-ink-600'
                      }`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* 인사이트 한 줄 */}
          <div className="mt-4 pt-3 border-t border-ink-700/50 text-xs text-ink-300">
            💡 <strong>당월 광고 효과 {currentPct}%</strong> / 과거 누적 효과{' '}
            <strong>{accumulatedPct}%</strong>
          </div>
        </>
      )}
    </section>
  )
}
