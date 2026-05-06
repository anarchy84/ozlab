'use client'

// ─────────────────────────────────────────────
// BulkUploadModal — 상품 CSV 대량 업로드 (Phase 2C)
//
// 흐름 :
//   step 1) 파일 선택 + "양식 다운로드"
//   step 2) 자체 CSV 파서 → rows 배열
//   step 3) /api/admin/products/bulk dry_run=true → 미리보기
//   step 4) "확정" 클릭 → dry_run=false → 실제 upsert → 결과 표시
//
// 자체 CSV 파서 (의존성 0) :
//   - "..." 로 감싸진 셀 안의 콤마/줄바꿈 처리
//   - "" 는 escape 된 따옴표
//   - BOM 자동 제거
// ─────────────────────────────────────────────

import { useState } from 'react'

const HEADERS = [
  'code',
  'label',
  'category',
  'default_amount',
  'default_period',
  'is_subscription',
  'default_monthly',
  'sort_order',
  'note',
] as const

type Header = (typeof HEADERS)[number]

interface ParsedRow {
  [k: string]: string
}

interface RowResult {
  row_idx: number
  code: string
  label: string
  category: string
  action: 'insert' | 'update' | 'skip' | 'error'
  message?: string
  new_category?: boolean
}

interface Summary {
  total: number
  insert: number
  update: number
  error: number
  new_categories: string[]
}

interface Props {
  onClose: () => void
  onDone: () => void
}

export default function BulkUploadModal({ onClose, onDone }: Props) {
  const [step, setStep] = useState<'pick' | 'preview' | 'done'>('pick')
  const [fileName, setFileName] = useState<string>('')
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [results, setResults] = useState<RowResult[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ─── CSV 파일 처리 ──
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setError(null)
    setFileName(f.name)
    try {
      const text = await f.text()
      const parsed = parseCsv(text)
      if (parsed.length === 0) throw new Error('빈 파일이거나 헤더만 있습니다.')
      setRows(parsed)
      // 즉시 dry_run 호출
      await runPreview(parsed)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function runPreview(parsedRows: ParsedRow[]) {
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/products/bulk', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rows: parsedRows, dry_run: true }),
      })
      const j = (await res.json()) as { results?: RowResult[]; summary?: Summary; error?: string }
      if (!res.ok) throw new Error(j.error ?? `HTTP ${res.status}`)
      setResults(j.results ?? [])
      setSummary(j.summary ?? null)
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function commit() {
    if (!summary) return
    if (summary.error > 0) {
      alert('에러 행이 있어 업로드할 수 없습니다. 파일을 수정 후 다시 올려주세요.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/products/bulk', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rows, dry_run: false }),
      })
      const j = (await res.json()) as { success?: boolean; summary?: Summary; error?: string }
      if (!res.ok || !j.success) throw new Error(j.error ?? `HTTP ${res.status}`)
      setSummary(j.summary ?? summary)
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  function downloadTemplate() {
    const csv =
      '﻿' +
      HEADERS.join(',') +
      '\n' +
      [
        'TERM_OZ_10,오즈랩페이 10.1인치 단말기,단말기,1200000,36개월,FALSE,,10,POS 일체형',
        'NET_KT_500,KT 인터넷 500M,인터넷,330000,36개월,TRUE,33000,20,월 33000원',
        'TABLE_ORDER_BASIC,테이블오더 베이직,테이블오더,500000,,FALSE,,30,',
      ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `products_template_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-surface-darkSoft border border-ink-700 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-ink-700 flex items-center justify-between">
          <h3 className="text-lg font-bold text-ink-100">📥 상품 CSV 일괄 업로드</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-400 hover:text-ink-100 text-2xl leading-none"
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-3 px-3 py-2 rounded bg-red-500/15 text-red-300 text-sm border border-red-500/30">
              ❌ {error}
            </div>
          )}

          {step === 'pick' && (
            <div className="space-y-4">
              <div className="rounded border border-ink-700 bg-ink-900/50 p-4 text-sm text-ink-300 space-y-2">
                <p className="font-semibold text-ink-100">📋 양식</p>
                <p>
                  CSV 파일은 다음 9개 컬럼을 헤더로 가집니다 (순서 무관):
                  <br />
                  <code className="text-xs bg-ink-900 px-1.5 py-0.5 rounded">
                    code, label, category, default_amount, default_period, is_subscription, default_monthly, sort_order, note
                  </code>
                </p>
                <p className="text-xs text-ink-400">
                  • <strong>code/label/category</strong>는 필수<br />
                  • <strong>code 중복</strong> 시 기존 상품을 갱신<br />
                  • <strong>모르는 카테고리</strong>는 자동 생성 (어드민에서 라벨 수정 가능)<br />
                  • <strong>default_period</strong>: 없음 / 12개월 / 24개월 / 36개월 / 48개월<br />
                  • <strong>is_subscription</strong>: TRUE / FALSE
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="px-3 py-2 text-sm border border-ink-700 text-ink-200 rounded hover:bg-ink-800"
                >
                  📄 양식 다운로드 (CSV)
                </button>
                <label className="px-3 py-2 text-sm bg-naver-green text-white rounded font-medium cursor-pointer hover:bg-naver-dark">
                  📁 CSV 파일 선택
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFile}
                    className="hidden"
                  />
                </label>
                {submitting && <span className="text-xs text-ink-400 self-center">파일 분석 중…</span>}
              </div>
            </div>
          )}

          {step === 'preview' && summary && (
            <div className="space-y-4">
              <div className="text-sm text-ink-300">
                📁 <strong className="text-ink-100">{fileName}</strong> · 총 {summary.total}건
              </div>

              {/* 요약 카드 */}
              <div className="grid grid-cols-4 gap-3 text-sm">
                <SummaryCard label="신규" value={summary.insert} color="text-naver-neon" />
                <SummaryCard label="업데이트" value={summary.update} color="text-blue-300" />
                <SummaryCard label="에러" value={summary.error} color="text-red-300" />
                <SummaryCard label="신규 카테고리" value={summary.new_categories.length} color="text-amber-300" />
              </div>

              {summary.new_categories.length > 0 && (
                <div className="rounded border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                  ⚠️ 다음 카테고리가 자동 생성됩니다: <strong>{summary.new_categories.join(', ')}</strong>
                </div>
              )}

              {/* 미리보기 테이블 */}
              <div className="border border-ink-700 rounded overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-ink-900 text-ink-400">
                    <tr>
                      <th className="px-2 py-2 text-left w-12">#</th>
                      <th className="px-2 py-2 text-left w-20">상태</th>
                      <th className="px-2 py-2 text-left">code</th>
                      <th className="px-2 py-2 text-left">label</th>
                      <th className="px-2 py-2 text-left">category</th>
                      <th className="px-2 py-2 text-left">메시지</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => (
                      <tr key={r.row_idx} className="border-t border-ink-700">
                        <td className="px-2 py-1.5 text-ink-500">{r.row_idx}</td>
                        <td className="px-2 py-1.5">
                          <ActionBadge action={r.action} />
                        </td>
                        <td className="px-2 py-1.5 font-mono text-ink-200">{r.code}</td>
                        <td className="px-2 py-1.5 text-ink-200">{r.label}</td>
                        <td className="px-2 py-1.5 text-ink-300">
                          {r.category}
                          {r.new_category && <span className="ml-1 text-amber-300">⚡신규</span>}
                        </td>
                        <td className="px-2 py-1.5 text-red-300">{r.message ?? ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 'done' && summary && (
            <div className="text-center py-8 space-y-3">
              <div className="text-5xl">✅</div>
              <h4 className="text-xl font-bold text-ink-100">업로드 완료</h4>
              <p className="text-sm text-ink-300">
                신규 <strong className="text-naver-neon">{summary.insert}</strong>건 ·
                업데이트 <strong className="text-blue-300">{summary.update}</strong>건
                {summary.new_categories.length > 0 && (
                  <> · 신규 카테고리 <strong className="text-amber-300">{summary.new_categories.length}</strong>개</>
                )}
              </p>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t border-ink-700 flex justify-end gap-2">
          {step === 'pick' && (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm border border-ink-700 text-ink-200 rounded hover:bg-ink-800"
            >
              취소
            </button>
          )}
          {step === 'preview' && (
            <>
              <button
                type="button"
                onClick={() => { setStep('pick'); setRows([]); setResults([]); setSummary(null); setFileName('') }}
                disabled={submitting}
                className="px-3 py-1.5 text-sm border border-ink-700 text-ink-200 rounded hover:bg-ink-800"
              >
                ← 다시 선택
              </button>
              <button
                type="button"
                onClick={commit}
                disabled={submitting || (summary?.error ?? 0) > 0}
                className="px-4 py-1.5 text-sm bg-naver-green text-white rounded font-bold hover:bg-naver-dark disabled:opacity-50"
                title={(summary?.error ?? 0) > 0 ? '에러를 모두 수정해야 업로드 가능' : ''}
              >
                {submitting
                  ? '업로드 중…'
                  : `✅ 확정 — ${(summary?.insert ?? 0) + (summary?.update ?? 0)}건 업로드`}
              </button>
            </>
          )}
          {step === 'done' && (
            <button
              type="button"
              onClick={() => { onDone(); onClose() }}
              className="px-4 py-1.5 text-sm bg-naver-green text-white rounded hover:bg-naver-dark"
            >
              완료
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded border border-ink-700 bg-ink-900/50 p-3 text-center">
      <div className="text-xs text-ink-400">{label}</div>
      <div className={`text-xl font-bold mt-1 ${color}`}>{value}</div>
    </div>
  )
}

function ActionBadge({ action }: { action: RowResult['action'] }) {
  const map: Record<RowResult['action'], { label: string; cls: string }> = {
    insert: { label: '✓ 신규', cls: 'bg-naver-green/20 text-naver-neon border-naver-green/40' },
    update: { label: '🔄 갱신', cls: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
    skip:   { label: '⏭ skip', cls: 'bg-ink-700 text-ink-400 border-ink-600' },
    error:  { label: '✗ 에러', cls: 'bg-red-500/20 text-red-300 border-red-500/40' },
  }
  const { label, cls } = map[action]
  return (
    <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded border ${cls}`}>
      {label}
    </span>
  )
}

// ─────────────────────────────────────────────
// 자체 CSV 파서 (의존성 0)
//   RFC 4180 부분 호환:
//   - 콤마 구분
//   - "..." 따옴표 escape
//   - "" 는 escape 된 따옴표
//   - 줄바꿈 (LF/CRLF) 둘 다 처리
//   - BOM 자동 제거
// ─────────────────────────────────────────────
function parseCsv(text: string): ParsedRow[] {
  // BOM 제거
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)

  const cells: string[][] = [[]]
  let cell = ''
  let row = 0
  let inQuote = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    const next = text[i + 1]

    if (inQuote) {
      if (c === '"' && next === '"') {
        cell += '"'
        i++           // skip next quote
      } else if (c === '"') {
        inQuote = false
      } else {
        cell += c
      }
      continue
    }

    if (c === '"') {
      inQuote = true
      continue
    }
    if (c === ',') {
      cells[row].push(cell)
      cell = ''
      continue
    }
    if (c === '\r') continue        // CRLF 의 CR 무시
    if (c === '\n') {
      cells[row].push(cell)
      cell = ''
      row++
      cells.push([])
      continue
    }
    cell += c
  }
  // 마지막 cell
  if (cell.length > 0 || cells[row].length > 0) cells[row].push(cell)

  // 빈 마지막 행 제거
  while (cells.length > 0 && cells[cells.length - 1].every((s) => s === '')) {
    cells.pop()
  }

  if (cells.length < 2) return []   // 헤더만 있으면 빈 결과

  const header = cells[0].map((h) => h.trim())
  const out: ParsedRow[] = []
  for (let r = 1; r < cells.length; r++) {
    const obj: ParsedRow = {}
    header.forEach((h, i) => {
      obj[h] = (cells[r][i] ?? '').trim()
    })
    out.push(obj)
  }
  // 모든 셀이 빈 행은 제외
  return out.filter((r) => Object.values(r).some((v) => v !== ''))
}
