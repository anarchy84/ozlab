// ─────────────────────────────────────────────
// 상담 상세 모달 (CRM PRO 패턴)
//
// 기능 :
//   - 좌측 : DB 정보 (db_group_label, 매체, 메모, 상담사, 상태)
//   - 중앙 : 고객 입력 (이름·연락처·매장·업종·지역·메시지)
//   - 우측 : 상담후 기록 (통신사·약정·통화가능시간 등)
//   - 하단 : 상태 이력 + 메시지 이력
//   - 메모/상태/상담사 인라인 편집 → PATCH /api/admin/consultations/[id]
//   - ❤️ 즐겨찾기 / 🚫 블랙리스트 토글
//   - ▶️ ◀️ 동일 목록 안 다음/이전 건 페이지네이션
// ─────────────────────────────────────────────
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { DbStatus } from '@/lib/admin/types'

export interface ConsultationFull {
  id: string
  created_at: string
  name: string
  phone: string
  store_name: string | null
  industry: string | null
  region: string | null
  message: string | null
  internal_memo: string | null
  status: string | null
  status_id: number | null
  contacted_at: string | null
  done_at: string | null
  utm_source: string | null
  utm_campaign: string | null
  db_group_label: string | null
  counselor_id: string | null
  callable_time: string | null
  device_type: string | null
  contract_period: string | null
  is_favorite: boolean
  is_blacklisted: boolean
  ip_address: string | null
}

interface CounselorOption {
  user_id: string
  display_name: string | null
  email?: string | null
}

interface HistoryItem {
  id: number
  changed_at: string
  status_id: number
  memo: string | null
  db_statuses?: { label: string; bg_color: string; text_color: string } | null
}

interface MessageItem {
  id: number
  sent_at: string
  channel: string
  template_code: string | null
  body: string
  success: boolean
  error_message: string | null
}

interface Props {
  consultation: ConsultationFull
  statuses: DbStatus[]
  counselors: CounselorOption[]
  /** 같은 페이지 내 모든 row id (페이지네이션용) */
  allIds: string[]
  onClose: () => void
  /** 다른 row id 로 이동 */
  onNavigate: (id: string) => void
  /** 변경 후 부모 목록 새로고침 */
  onUpdated: () => void
}

export function ConsultationDetailModal({
  consultation,
  statuses,
  counselors,
  allIds,
  onClose,
  onNavigate,
  onUpdated,
}: Props) {
  const router = useRouter()
  const [c, setC] = useState(consultation)
  const [memo, setMemo] = useState(consultation.internal_memo ?? '')
  const [memoForHistory, setMemoForHistory] = useState('')
  const [statusId, setStatusId] = useState<number | null>(consultation.status_id)
  const [counselorId, setCounselorId] = useState<string | null>(
    consultation.counselor_id,
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showBlockMenu, setShowBlockMenu] = useState(false)

  const [history, setHistory] = useState<HistoryItem[]>([])
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const idx = allIds.indexOf(consultation.id)
  const prevId = idx > 0 ? allIds[idx - 1] : null
  const nextId = idx >= 0 && idx < allIds.length - 1 ? allIds[idx + 1] : null

  // ----- 새 row 로 갈 때 state 동기화 -----
  useEffect(() => {
    setC(consultation)
    setMemo(consultation.internal_memo ?? '')
    setMemoForHistory('')
    setStatusId(consultation.status_id)
    setCounselorId(consultation.counselor_id)
    setError(null)
    void loadHistory(consultation.id)
  }, [consultation.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ----- 키보드 단축키 (Esc 닫기, ←→ 이동) -----
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowLeft' && prevId) {
        onNavigate(prevId)
      } else if (e.key === 'ArrowRight' && nextId) {
        onNavigate(nextId)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prevId, nextId, onClose, onNavigate])

  async function loadHistory(id: string) {
    setLoadingHistory(true)
    try {
      const res = await fetch(`/api/admin/consultations/${id}/history`, {
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`history fetch ${res.status}`)
      const j = (await res.json()) as { history: HistoryItem[]; messages: MessageItem[] }
      setHistory(j.history ?? [])
      setMessages(j.messages ?? [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingHistory(false)
    }
  }

  async function patch(body: Record<string, unknown>) {
    setError(null)
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/consultations/${c.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const j = (await res.json()) as { error?: string }
        throw new Error(j.error ?? `HTTP ${res.status}`)
      }
      const j = (await res.json()) as { consultation: Partial<ConsultationFull> }
      setC((curr) => ({ ...curr, ...j.consultation }))
      onUpdated()
      router.refresh()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      return false
    } finally {
      setSaving(false)
    }
  }

  async function saveAll() {
    const body: Record<string, unknown> = {}
    if (statusId !== c.status_id) body.status_id = statusId
    if (memo !== (c.internal_memo ?? '')) body.internal_memo = memo
    if (counselorId !== c.counselor_id) body.counselor_id = counselorId
    if (memoForHistory.trim() && statusId !== c.status_id) {
      body.memo_for_history = memoForHistory.trim()
    }
    if (Object.keys(body).length === 0) {
      setError('변경 사항 없음')
      return
    }
    const ok = await patch(body)
    if (ok) {
      setMemoForHistory('')
      void loadHistory(c.id)
    }
  }

  async function toggleFavorite() {
    await patch({ is_favorite: !c.is_favorite })
  }

  async function blockPhone() {
    setShowBlockMenu(false)
    if (!confirm(`${c.phone} 번호를 영구 차단할까요?`)) return
    await patch({ is_blacklisted: true })
    // abuse_blocklist 도 INSERT
    try {
      const res = await fetch(`/api/admin/consultations/${c.id}/block`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ block_type: 'phone' }),
      })
      if (!res.ok) console.warn('blocklist insert failed', await res.text())
    } catch (e) {
      console.warn(e)
    }
  }

  async function blockIp() {
    setShowBlockMenu(false)
    if (!confirm(`IP ${c.ip_address ?? '(없음)'} 를 영구 차단할까요?`)) return
    await patch({ is_blacklisted: true })
    try {
      const res = await fetch(`/api/admin/consultations/${c.id}/block`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ block_type: 'ip' }),
      })
      if (!res.ok) console.warn('blocklist insert failed', await res.text())
    } catch (e) {
      console.warn(e)
    }
  }

  const currentStatus = statuses.find((s) => s.id === statusId)

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 overflow-y-auto py-8 px-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-darkSoft border border-ink-700 rounded-lg shadow-2xl w-full max-w-5xl my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 — 즐겨찾기 / 블랙리스트 / 페이지네이션 / 닫기 */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-ink-700">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleFavorite}
              className={`px-3 py-1.5 text-sm border rounded transition-colors ${
                c.is_favorite
                  ? 'bg-pink-500/20 border-pink-500 text-pink-300'
                  : 'border-ink-700 text-ink-300 hover:bg-ink-800'
              }`}
            >
              ❤️ 즐겨찾기
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowBlockMenu((v) => !v)}
                className={`px-3 py-1.5 text-sm border rounded transition-colors ${
                  c.is_blacklisted
                    ? 'bg-red-500/20 border-red-500 text-red-300'
                    : 'border-ink-700 text-ink-300 hover:bg-ink-800'
                }`}
              >
                🚫 블랙리스트
              </button>
              {showBlockMenu && (
                <div className="absolute top-full left-0 mt-1 bg-surface-darkSoft border border-ink-700 rounded shadow-lg py-1 z-10 w-44">
                  <button
                    type="button"
                    onClick={blockPhone}
                    className="block w-full text-left px-3 py-2 text-sm text-red-300 hover:bg-ink-800"
                  >
                    연락처 차단
                  </button>
                  <button
                    type="button"
                    onClick={blockIp}
                    className="block w-full text-left px-3 py-2 text-sm text-ink-300 hover:bg-ink-800"
                  >
                    IP 차단
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBlockMenu(false)}
                    className="block w-full text-left px-3 py-2 text-sm text-ink-500 hover:bg-ink-800"
                  >
                    취소
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => prevId && onNavigate(prevId)}
              disabled={!prevId}
              className="px-3 py-1.5 text-sm border border-ink-700 text-ink-300 rounded hover:bg-ink-800 disabled:opacity-30 disabled:cursor-not-allowed"
              title="이전 (←)"
            >
              ◀
            </button>
            <span className="text-xs text-ink-500">
              {idx + 1} / {allIds.length}
            </span>
            <button
              type="button"
              onClick={() => nextId && onNavigate(nextId)}
              disabled={!nextId}
              className="px-3 py-1.5 text-sm border border-ink-700 text-ink-300 rounded hover:bg-ink-800 disabled:opacity-30 disabled:cursor-not-allowed"
              title="다음 (→)"
            >
              ▶
            </button>
            <button
              type="button"
              onClick={onClose}
              className="ml-3 px-3 py-1.5 text-sm border border-ink-700 text-ink-300 rounded hover:bg-ink-800"
              title="닫기 (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 본문 — 3컬럼 */}
        <div className="grid md:grid-cols-3 gap-4 p-6">
          {/* DB 정보 */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-ink-200 mb-2">DB 정보</h3>
            <Field label="이름" value={c.name} />
            <Field label="접수일자" value={new Date(c.created_at).toLocaleString('ko-KR')} />
            <Field label="매체" value={c.utm_source ?? '-'} />
            <Field label="캠페인" value={c.utm_campaign ?? '-'} />
            <Field label="DB그룹" value={c.db_group_label ?? '-'} />
            <Field label="IP" value={c.ip_address ?? '-'} mono />
            <div>
              <label className="block text-xs text-ink-500 mb-1">상태</label>
              <select
                value={statusId ?? ''}
                onChange={(e) => setStatusId(Number(e.target.value))}
                className="w-full px-2 py-1.5 text-sm bg-ink-900 border border-ink-700 text-ink-100 rounded"
                style={
                  currentStatus
                    ? {
                        borderLeft: `4px solid ${currentStatus.bg_color}`,
                      }
                    : undefined
                }
              >
                <option value="">미지정</option>
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-ink-500 mb-1">담당자</label>
              <select
                value={counselorId ?? ''}
                onChange={(e) => setCounselorId(e.target.value || null)}
                className="w-full px-2 py-1.5 text-sm bg-ink-900 border border-ink-700 text-ink-100 rounded"
              >
                <option value="">미배정</option>
                {counselors.map((u) => (
                  <option key={u.user_id} value={u.user_id}>
                    {u.display_name ?? u.email ?? u.user_id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* 고객 입력 */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-ink-200 mb-2">고객이 남긴 정보</h3>
            <Field label="연락처" value={c.phone} mono />
            <Field label="매장명" value={c.store_name ?? '-'} />
            <Field label="업종" value={c.industry ?? '-'} />
            <Field label="지역" value={c.region ?? '-'} />
            <Field label="단말기" value={c.device_type ?? '-'} />
            <Field label="약정" value={c.contract_period ?? '-'} />
            <Field label="통화가능시간" value={c.callable_time ?? '-'} />
            <div>
              <label className="block text-xs text-ink-500 mb-1">
                고객 메시지 (read-only)
              </label>
              <div className="w-full px-2 py-1.5 text-sm bg-ink-900 border border-ink-700 text-ink-200 rounded min-h-[60px] whitespace-pre-wrap break-keep">
                {c.message || <span className="text-ink-500">(없음)</span>}
              </div>
            </div>
          </section>

          {/* 메모 */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-ink-200 mb-2">상담 메모</h3>
            <div>
              <label className="block text-xs text-ink-500 mb-1">
                내부 메모 (저장 시 컬럼 갱신)
              </label>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                rows={6}
                className="w-full px-2 py-1.5 text-sm bg-ink-900 border border-ink-700 text-ink-100 placeholder-ink-500 rounded"
                placeholder="고객 응대 메모를 남기세요"
              />
            </div>
            <div>
              <label className="block text-xs text-ink-500 mb-1">
                상태 변경 사유 (이력에 남길 메모, 선택)
              </label>
              <input
                type="text"
                value={memoForHistory}
                onChange={(e) => setMemoForHistory(e.target.value)}
                placeholder="예: 통화 후 가망 전환"
                className="w-full px-2 py-1.5 text-sm bg-ink-900 border border-ink-700 text-ink-100 placeholder-ink-500 rounded"
              />
              <span className="text-[10px] text-ink-500">
                상태가 변경될 때만 이력에 함께 저장됩니다.
              </span>
            </div>
            {error && (
              <div className="rounded border border-red-800/50 bg-red-900/20 p-2 text-xs text-red-300">
                {error}
              </div>
            )}
            <button
              type="button"
              onClick={saveAll}
              disabled={saving}
              className="w-full py-2 text-sm bg-naver-green text-white rounded font-bold hover:bg-naver-dark disabled:opacity-50"
            >
              {saving ? '저장 중...' : '💾 저장'}
            </button>
          </section>
        </div>

        {/* 이력 — 상태 / 메시지 */}
        <div className="grid md:grid-cols-2 gap-4 px-6 pb-6">
          <section>
            <h3 className="text-sm font-semibold text-ink-200 mb-2">상태 이력</h3>
            <div className="bg-ink-900 border border-ink-700 rounded text-sm max-h-64 overflow-y-auto">
              {loadingHistory ? (
                <div className="p-3 text-ink-500 text-xs">불러오는 중...</div>
              ) : history.length === 0 ? (
                <div className="p-3 text-ink-500 text-xs">변경 이력 없음</div>
              ) : (
                <ul className="divide-y divide-ink-700">
                  {history.map((h) => (
                    <li key={h.id} className="px-3 py-2 flex items-start gap-2 text-xs">
                      <span className="text-ink-500 whitespace-nowrap">
                        {new Date(h.changed_at).toLocaleString('ko-KR', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {h.db_statuses && (
                        <span
                          className="inline-block px-1.5 py-0.5 rounded font-bold whitespace-nowrap"
                          style={{
                            backgroundColor: h.db_statuses.bg_color,
                            color: h.db_statuses.text_color,
                          }}
                        >
                          {h.db_statuses.label}
                        </span>
                      )}
                      {h.memo && <span className="text-ink-300 italic">— {h.memo}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-ink-200 mb-2">메시지 이력</h3>
            <div className="bg-ink-900 border border-ink-700 rounded text-sm max-h-64 overflow-y-auto">
              {loadingHistory ? (
                <div className="p-3 text-ink-500 text-xs">불러오는 중...</div>
              ) : messages.length === 0 ? (
                <div className="p-3 text-ink-500 text-xs">발송 이력 없음</div>
              ) : (
                <ul className="divide-y divide-ink-700">
                  {messages.map((m) => (
                    <li key={m.id} className="px-3 py-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-ink-500">
                          {new Date(m.sent_at).toLocaleString('ko-KR', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span className="text-ink-200">{m.channel}</span>
                        {m.template_code && (
                          <span className="text-ink-400">[{m.template_code}]</span>
                        )}
                        <span
                          className={
                            m.success ? 'text-naver-neon' : 'text-red-400'
                          }
                        >
                          {m.success ? '✓' : '✗'}
                        </span>
                      </div>
                      {m.body && (
                        <div className="mt-1 text-ink-400 line-clamp-2 break-keep">
                          {m.body}
                        </div>
                      )}
                      {m.error_message && (
                        <div className="mt-1 text-red-400 text-[10px]">
                          {m.error_message}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div>
      <label className="block text-xs text-ink-500 mb-1">{label}</label>
      <div
        className={`w-full px-2 py-1.5 text-sm bg-ink-900 border border-ink-700 text-ink-200 rounded ${
          mono ? 'font-mono' : ''
        }`}
      >
        {value}
      </div>
    </div>
  )
}
