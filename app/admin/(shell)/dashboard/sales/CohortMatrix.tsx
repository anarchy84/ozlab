// ─────────────────────────────────────────────
// CohortMatrix — 매출 발생월 × 리드 코호트월 6×6 매트릭스
//   가로: 매출 발생 월 (최근 6개월)
//   세로: 리드 코호트 월
//   셀: 순매출 + heatmap 색 진하기
//   대각선 = 당월 즉시 회수 / 우상단 = 시간차 회수
// ─────────────────────────────────────────────

interface MatrixRow {
  rev_month: string
  lead_month: string
  total_amount: number
  total_net: number
  revenue_count: number
}

function monthLabel(monthStart: string): string {
  const [, m] = monthStart.split('-')
  return `${parseInt(m, 10)}월`
}

function getRecentMonths(n: number): string[] {
  const months: string[] = []
  const now = new Date()
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`)
  }
  return months
}

export function CohortMatrix({
  rows,
  currentMonth,
}: {
  rows: MatrixRow[]
  currentMonth: string
}) {
  const months = getRecentMonths(6)

  // (rev_month, lead_month) → row 매핑
  const map = new Map<string, MatrixRow>()
  for (const r of rows) {
    map.set(`${r.rev_month}|${r.lead_month}`, r)
  }

  // heatmap 색 강도 — 전체 max 기준
  const max = Math.max(...rows.map((r) => Number(r.total_net ?? 0)), 1)

  function cellColor(value: number): string {
    if (value === 0) return ''
    const intensity = value / max  // 0 ~ 1
    const opacity = 0.15 + intensity * 0.55  // 0.15 ~ 0.70
    return `rgba(0, 199, 60, ${opacity.toFixed(2)})`
  }

  // 컬럼 합계 (rev_month 별)
  const revTotals = months.map((rm) =>
    rows.filter((r) => r.rev_month === rm).reduce((s, r) => s + Number(r.total_net ?? 0), 0)
  )
  // 행 합계 (lead_month 별)
  const leadTotals = months.map((lm) =>
    rows.filter((r) => r.lead_month === lm).reduce((s, r) => s + Number(r.total_net ?? 0), 0)
  )
  const grandTotal = rows.reduce((s, r) => s + Number(r.total_net ?? 0), 0)

  return (
    <section className="bg-surface-darkSoft border border-ink-700 rounded-lg p-5 overflow-x-auto">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-bold text-ink-100">📊 코호트 매트릭스 (6개월)</h2>
          <p className="text-[11px] text-ink-500 mt-0.5">
            가로 = 매출 발생 월 / 세로 = 리드 들어온 월 / 대각선 = 당월 즉시 회수 / 우상단 = 시간차 회수
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-ink-400">
          <span>적음</span>
          <div className="flex gap-0.5">
            {[0.15, 0.3, 0.45, 0.6, 0.75].map((op) => (
              <div
                key={op}
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: `rgba(0, 199, 60, ${op})` }}
              />
            ))}
          </div>
          <span>많음</span>
        </div>
      </div>

      <table className="w-full text-xs">
        <thead>
          <tr>
            <th className="text-left px-2 py-2 text-ink-500 font-normal">
              리드 코호트 ↓<br />
              <span className="text-[10px]">매출 발생 →</span>
            </th>
            {months.map((rm) => (
              <th
                key={rm}
                className={`text-center px-2 py-2 font-bold ${
                  rm === currentMonth ? 'text-naver-neon' : 'text-ink-300'
                }`}
              >
                {monthLabel(rm)}
                {rm === currentMonth && <div className="text-[9px] font-normal">이번달</div>}
              </th>
            ))}
            <th className="text-right px-3 py-2 text-ink-500 font-bold border-l border-ink-700">
              행 합계
            </th>
          </tr>
        </thead>
        <tbody>
          {months.map((lm) => (
            <tr key={lm} className="border-t border-ink-800">
              <td className={`px-2 py-2 font-bold whitespace-nowrap ${
                lm === currentMonth ? 'text-naver-neon' : 'text-ink-300'
              }`}>
                {monthLabel(lm)}
                {lm === currentMonth && <span className="text-[9px] ml-1">(당월 디비)</span>}
              </td>
              {months.map((rm) => {
                const row = map.get(`${rm}|${lm}`)
                const value = Number(row?.total_net ?? 0)
                // lead_month > rev_month 면 불가능 (리드보다 먼저 매출 X)
                const impossible = lm > rm
                const isDiagonal = lm === rm
                return (
                  <td
                    key={rm}
                    className={`text-right px-2 py-2 font-mono ${
                      impossible ? 'bg-ink-900/50' : ''
                    } ${isDiagonal ? 'border-l-2 border-naver-green/30' : ''}`}
                    style={!impossible && value > 0 ? { backgroundColor: cellColor(value) } : undefined}
                    title={`${monthLabel(lm)} 디비 → ${monthLabel(rm)} 매출`}
                  >
                    {impossible ? (
                      <span className="text-ink-700">—</span>
                    ) : value > 0 ? (
                      <div>
                        <div className="text-ink-100 font-bold">
                          {(value / 10000).toFixed(0)}만
                        </div>
                        <div className="text-[10px] text-ink-400 font-normal">
                          {row?.revenue_count}건
                        </div>
                      </div>
                    ) : (
                      <span className="text-ink-700">0</span>
                    )}
                  </td>
                )
              })}
              <td className="text-right px-3 py-2 font-mono text-ink-200 font-bold border-l border-ink-700">
                {leadTotals[months.indexOf(lm)] > 0
                  ? `${(leadTotals[months.indexOf(lm)] / 10000).toFixed(0)}만`
                  : '—'}
              </td>
            </tr>
          ))}
          {/* 컬럼 합계 */}
          <tr className="border-t-2 border-ink-700 bg-ink-900/50">
            <td className="px-2 py-2 font-bold text-ink-300">열 합계 (월별 발생)</td>
            {revTotals.map((v, idx) => (
              <td
                key={months[idx]}
                className={`text-right px-2 py-2 font-mono font-bold ${
                  months[idx] === currentMonth ? 'text-naver-neon' : 'text-ink-200'
                }`}
              >
                {v > 0 ? `${(v / 10000).toFixed(0)}만` : '—'}
              </td>
            ))}
            <td className="text-right px-3 py-2 font-mono text-naver-neon font-bold border-l border-ink-700">
              {grandTotal > 0 ? `${(grandTotal / 10000).toFixed(0)}만` : '—'}
            </td>
          </tr>
        </tbody>
      </table>

      <p className="text-[11px] text-ink-500 mt-3">
        💡 단위: 만원 · 셀 색 진하기 = 순매출 크기 · 빈 셀 = 데이터 없음 · 회색 = 시간 역행으로 불가능
      </p>
    </section>
  )
}
