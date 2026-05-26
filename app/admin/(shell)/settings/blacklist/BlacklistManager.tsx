'use client'

// ─────────────────────────────────────────────
// 블랙리스트 관리 UI
//   - 활성 차단 목록 조회
//   - 연락처/IP/이메일/UA 패턴 수동 추가
//   - 개별 해제
// ─────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { AbuseBlockType, AbuseBlocklistEntry } from '@/lib/admin/types'

type TypeFilter = 'all' | AbuseBlockType

const TYPE_META: Record<AbuseBlockType, { label: string; placeholder: string; hint: string }> = {
  phone: {
    label: '연락처',
    placeholder: '010-0000-0000',
    hint: '하이픈/공백은 제거하고 숫자 기준으로 저장됩니다.',
  },
  ip: {
    label: 'IP',
    placeholder: '123.123.123.123',
    hint: '신청 요청의 접속 IP와 정확히 일치하면 차단합니다.',
  },
  email: {
    label: '이메일',
    placeholder: 'name@example.com',
    hint: '소문자로 정규화해 저장합니다.',
  },
  user_agent_pattern: {
    label: 'UA 패턴',
    placeholder: 'bot 또는 crawler',
    hint: '현재 신청 API는 연락처/IP 차단을 우선 적용합니다.',
  },
}

const TYPE_OPTIONS: Array<{ value: TypeFilter; label: string }> = [
  { value: 'all', label: '전체 유형' },
  { value: 'phone', label: TYPE_META.phone.label },
  { value: 'ip', label: TYPE_META.ip.label },
  { value: 'email', label: TYPE_META.email.label },
  { value: 'user_agent_pattern', label: TYPE_META.user_agent_pattern.label },
]

const ADDABLE_TYPES: AbuseBlockType[] = ['phone', 'ip']

export default function BlacklistManager() {
  const [entries, setEntries] = useState<AbuseBlocklistEntry[]>([])
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [formType, setFormType] = useState<AbuseBlockType>('phone')
  const [blockValue, setBlockValue] = useState('')
  const [reason, setReason] = useState('')

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    setError('')
    const params = new URLSearchParams()
    if (typeFilter !== 'all') params.set('type', typeFilter)
    if (query.trim()) params.set('q', query.trim())

    try {
      const res = await fetch(`/api/admin/blacklist?${params.toString()}`, {
        cache: 'no-store',
      })
      const json = (await res.json()) as { entries?: AbuseBlocklistEntry[]; error?: string }
      if (!res.ok || !json.entries) {
        throw new Error(json.error ?? '블랙리스트를 불러오지 못했습니다.')
      }
      setEntries(json.entries)
    } catch (err) {
      setError(err instanceof Error ? err.message : '블랙리스트를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [query, typeFilter])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void fetchEntries()
    }, query.trim() ? 250 : 0)

    return () => window.clearTimeout(handle)
  }, [fetchEntries, query])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage('')
    setError('')

    if (!blockValue.trim()) {
      setError('차단 값을 입력해주세요.')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/admin/blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          block_type: formType,
          block_value: blockValue,
          reason: reason.trim() || undefined,
        }),
      })
      const json = (await res.json()) as { entry?: AbuseBlocklistEntry; error?: string }
      if (!res.ok || !json.entry) {
        throw new Error(json.error ?? '블랙리스트 추가에 실패했습니다.')
      }

      setBlockValue('')
      setReason('')
      setMessage('블랙리스트가 추가됐습니다.')
      await fetchEntries()
    } catch (err) {
      setError(err instanceof Error ? err.message : '블랙리스트 추가에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const unblock = async (entry: AbuseBlocklistEntry) => {
    if (!confirm(`${TYPE_META[entry.block_type].label} ${entry.block_value} 차단을 해제할까요?`)) {
      return
    }

    setSaving(true)
    setMessage('')
    setError('')
    try {
      const res = await fetch('/api/admin/blacklist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entry.id }),
      })
      const json = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        throw new Error(json.error ?? '블랙리스트 해제에 실패했습니다.')
      }
      setEntries((current) => current.filter((item) => item.id !== entry.id))
      setMessage('블랙리스트가 해제됐습니다.')
    } catch (err) {
      setError(err instanceof Error ? err.message : '블랙리스트 해제에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const activePhoneCount = useMemo(
    () => entries.filter((entry) => entry.block_type === 'phone').length,
    [entries],
  )

  return (
    <div className="max-w-6xl space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-100">블랙리스트 관리</h1>
          <p className="mt-1 text-sm text-ink-400">
            신청 차단 대상 연락처와 IP를 한 곳에서 확인하고 해제합니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-brand-blue/15 px-3 py-1.5 font-bold text-brand-neon">
            활성 {entries.length}건
          </span>
          <span className="rounded-full border border-ink-700 px-3 py-1.5 text-ink-300">
            연락처 {activePhoneCount}건
          </span>
        </div>
      </header>

      <section className="rounded-lg border border-ink-700 bg-surface-darkSoft p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink-100">수동 추가</h2>
            <p className="mt-1 text-sm text-ink-400">
              상담 상세 모달에서 차단한 항목도 이 목록에 같이 표시됩니다.
            </p>
          </div>
          <span className="w-fit rounded-full bg-red-500/10 px-3 py-1.5 text-sm font-bold text-red-300">
            신청 API 즉시 차단
          </span>
        </div>

        <form onSubmit={submit} className="mt-5 grid gap-3 lg:grid-cols-[180px_1fr_1.2fr_auto]">
          <label className="space-y-1">
            <span className="text-xs font-semibold text-ink-500">유형</span>
            <select
              value={formType}
              onChange={(event) => setFormType(event.target.value as AbuseBlockType)}
              className="w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-3 text-sm text-ink-100 outline-none focus:border-brand-blue"
            >
              {ADDABLE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {TYPE_META[type].label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-ink-500">차단 값</span>
            <input
              value={blockValue}
              onChange={(event) => setBlockValue(event.target.value)}
              placeholder={TYPE_META[formType].placeholder}
              className="w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-3 text-sm text-ink-100 placeholder-ink-600 outline-none focus:border-brand-blue"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-ink-500">사유</span>
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="예: 반복 신청, 경쟁사 방해 의심"
              className="w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-3 text-sm text-ink-100 placeholder-ink-600 outline-none focus:border-brand-blue"
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="self-end rounded-full bg-brand-blue px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? '처리 중...' : '추가'}
          </button>
        </form>
        <p className="mt-2 text-xs text-ink-500">{TYPE_META[formType].hint}</p>
      </section>

      <section className="rounded-lg border border-ink-700 bg-surface-darkSoft p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink-100">활성 블랙리스트</h2>
            <p className="mt-1 text-sm text-ink-400">
              해제하면 즉시 신규 신청 차단 대상에서 빠집니다.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
              className="rounded-lg border border-ink-700 bg-ink-900 px-3 py-2.5 text-sm text-ink-100 outline-none focus:border-brand-blue"
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="값, 사유, 원본 DB 검색"
              className="min-w-0 rounded-lg border border-ink-700 bg-ink-900 px-3 py-2.5 text-sm text-ink-100 placeholder-ink-600 outline-none focus:border-brand-blue sm:w-64"
            />
            <button
              type="button"
              onClick={() => void fetchEntries()}
              disabled={loading}
              className="rounded-full border border-ink-700 px-4 py-2.5 text-sm font-semibold text-ink-300 transition-colors hover:border-ink-500 hover:text-ink-100 disabled:opacity-50"
            >
              새로고침
            </button>
          </div>
        </div>

        {message && (
          <div className="mt-4 rounded border border-brand-blue/30 bg-brand-blue/10 px-3 py-2 text-sm text-brand-neon">
            {message}
          </div>
        )}
        {error && (
          <div className="mt-4 rounded border border-red-800/50 bg-red-900/20 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="mt-5">
          {loading ? (
            <div className="rounded-lg border border-ink-700 bg-ink-900 py-12 text-center text-sm text-ink-500">
              블랙리스트를 불러오는 중...
            </div>
          ) : entries.length === 0 ? (
            <div className="rounded-lg border border-ink-700 bg-ink-900 py-12 text-center text-sm text-ink-500">
              활성 블랙리스트가 없습니다.
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto rounded-lg border border-ink-700 lg:block">
                <table className="w-full min-w-[920px] text-left text-sm">
                  <thead className="bg-ink-900 text-xs uppercase tracking-wide text-ink-500">
                    <tr>
                      <th className="px-4 py-3">유형</th>
                      <th className="px-4 py-3">차단 값</th>
                      <th className="px-4 py-3">원본 DB</th>
                      <th className="px-4 py-3">사유</th>
                      <th className="px-4 py-3">차단일</th>
                      <th className="px-4 py-3 text-right">히트</th>
                      <th className="px-4 py-3 text-right">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-700">
                    {entries.map((entry) => (
                      <tr key={entry.id} className="align-top">
                        <td className="px-4 py-3">
                          <TypeBadge type={entry.block_type} />
                        </td>
                        <td className="px-4 py-3 font-mono text-ink-100">{entry.block_value}</td>
                        <td className="px-4 py-3 text-ink-300">
                          <SourceSummary entry={entry} />
                        </td>
                        <td className="max-w-[260px] px-4 py-3 text-ink-400">
                          {entry.reason ?? '-'}
                        </td>
                        <td className="px-4 py-3 text-ink-400">{formatDate(entry.blocked_at)}</td>
                        <td className="px-4 py-3 text-right text-ink-300">{entry.hit_count}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => void unblock(entry)}
                            disabled={saving}
                            className="rounded-full border border-red-500/40 px-3 py-1.5 text-xs font-bold text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                          >
                            해제
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 lg:hidden">
                {entries.map((entry) => (
                  <article
                    key={entry.id}
                    className="rounded-lg border border-ink-700 bg-ink-900 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <TypeBadge type={entry.block_type} />
                        <div className="mt-2 break-all font-mono text-sm font-bold text-ink-100">
                          {entry.block_value}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void unblock(entry)}
                        disabled={saving}
                        className="shrink-0 rounded-full border border-red-500/40 px-3 py-1.5 text-xs font-bold text-red-300"
                      >
                        해제
                      </button>
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-ink-400">
                      <div>
                        <span className="text-ink-500">원본 DB: </span>
                        <SourceSummary entry={entry} />
                      </div>
                      <div>
                        <span className="text-ink-500">사유: </span>
                        {entry.reason ?? '-'}
                      </div>
                      <div>
                        <span className="text-ink-500">차단일: </span>
                        {formatDate(entry.blocked_at)}
                      </div>
                      <div>
                        <span className="text-ink-500">차단 횟수: </span>
                        {entry.hit_count}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  )
}

function TypeBadge({ type }: { type: AbuseBlockType }) {
  const className =
    type === 'phone'
      ? 'bg-red-500/10 text-red-300 border-red-500/30'
      : type === 'ip'
        ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
        : 'bg-brand-blue/10 text-brand-neon border-brand-blue/30'

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${className}`}>
      {TYPE_META[type].label}
    </span>
  )
}

function SourceSummary({ entry }: { entry: AbuseBlocklistEntry }) {
  const source = entry.source_consultation
  if (!source) return <span className="text-ink-500">수동 추가</span>

  return (
    <span className="text-ink-300">
      {source.name ?? '이름 없음'}
      {source.store_name ? ` · ${source.store_name}` : ''}
      {source.phone ? ` · ${source.phone}` : ''}
    </span>
  )
}

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
