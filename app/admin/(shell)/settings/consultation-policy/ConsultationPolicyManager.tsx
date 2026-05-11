'use client'

import { useMemo, useState } from 'react'
import {
  DEFAULT_DUPLICATE_PHONE_WINDOW_DAYS,
  MAX_DUPLICATE_PHONE_WINDOW_DAYS,
  MIN_DUPLICATE_PHONE_WINDOW_DAYS,
  coerceDuplicatePhoneWindowDays,
} from '@/lib/consultation-policy'
import type { ConsultationPolicySettings } from '@/lib/consultation-policy-server'

interface Props {
  initialSettings: ConsultationPolicySettings
}

export default function ConsultationPolicyManager({ initialSettings }: Props) {
  const [settings, setSettings] = useState(initialSettings)
  const [days, setDays] = useState(String(initialSettings.duplicatePhoneWindowDays))
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const parsedDays = useMemo(() => coerceDuplicatePhoneWindowDays(days), [days])
  const dirty = parsedDays !== null && parsedDays !== settings.duplicatePhoneWindowDays

  const save = async () => {
    setMessage('')
    setError('')

    if (!parsedDays) {
      setError(
        `${MIN_DUPLICATE_PHONE_WINDOW_DAYS}~${MAX_DUPLICATE_PHONE_WINDOW_DAYS}일 사이로 입력해주세요.`,
      )
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/admin/consultation-policy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duplicatePhoneWindowDays: parsedDays }),
      })
      const json = (await res.json()) as {
        settings?: ConsultationPolicySettings
        error?: string
      }

      if (!res.ok || !json.settings) {
        throw new Error(json.error ?? '저장에 실패했습니다.')
      }

      setSettings(json.settings)
      setDays(String(json.settings.duplicatePhoneWindowDays))
      setMessage('중복 DB 정책이 저장됐습니다.')
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-ink-100">DB 접수 정책</h1>
        <p className="mt-1 text-sm text-ink-400">
          상담 신청 시 동일 연락처를 중복 DB로 판단하는 기간을 관리합니다.
        </p>
      </header>

      <section className="rounded-lg border border-ink-700 bg-surface-darkSoft p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-ink-100">중복 DB 인정기간</h2>
            <p className="text-sm leading-relaxed text-ink-400">
              같은 연락처가 이 기간 안에 다시 접수되면 신규 DB로 저장하지 않고
              중복 접수 안내를 보여줍니다. 기준은 이름이 아닌 연락처입니다.
            </p>
          </div>
          <span
            className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${
              settings.source === 'database'
                ? 'bg-naver-green/15 text-naver-neon'
                : 'bg-amber-500/15 text-amber-300'
            }`}
          >
            {settings.source === 'database' ? '관리자 설정 적용 중' : '기본값 적용 중'}
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-[180px_1fr] sm:items-center">
          <label htmlFor="duplicate-days" className="text-sm font-semibold text-ink-200">
            제한 기간
          </label>
          <div>
            <div className="flex max-w-xs items-center rounded-lg border border-ink-700 bg-ink-900 focus-within:border-naver-green">
              <input
                id="duplicate-days"
                type="number"
                inputMode="numeric"
                min={MIN_DUPLICATE_PHONE_WINDOW_DAYS}
                max={MAX_DUPLICATE_PHONE_WINDOW_DAYS}
                value={days}
                onChange={(e) => setDays(e.target.value)}
                className="min-w-0 flex-1 bg-transparent px-3 py-3 text-base font-bold text-ink-100 outline-none"
              />
              <span className="border-l border-ink-700 px-3 text-sm text-ink-400">일</span>
            </div>
            <p className="mt-2 text-xs text-ink-500">
              입력 가능 범위: {MIN_DUPLICATE_PHONE_WINDOW_DAYS}~{MAX_DUPLICATE_PHONE_WINDOW_DAYS}일,
              기본값 {DEFAULT_DUPLICATE_PHONE_WINDOW_DAYS}일
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={save}
            disabled={saving || !dirty || parsedDays === null}
            className="rounded-full bg-naver-green px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-naver-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? '저장 중...' : '정책 저장'}
          </button>
          <button
            type="button"
            onClick={() => {
              setDays(String(settings.duplicatePhoneWindowDays))
              setError('')
              setMessage('')
            }}
            disabled={saving || !dirty}
            className="rounded-full border border-ink-700 px-4 py-2.5 text-sm font-semibold text-ink-300 transition-colors hover:border-ink-500 hover:text-ink-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            되돌리기
          </button>
        </div>

        {message && (
          <div className="mt-4 rounded border border-naver-green/30 bg-naver-green/10 px-3 py-2 text-sm text-naver-neon">
            {message}
          </div>
        )}
        {error && (
          <div className="mt-4 rounded border border-red-800/50 bg-red-900/20 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        {settings.updatedAt && (
          <p className="mt-4 text-xs text-ink-500">
            마지막 저장: {new Date(settings.updatedAt).toLocaleString('ko-KR')}
          </p>
        )}
      </section>

      <section className="rounded-lg border border-ink-700 bg-ink-900/60 p-4 text-sm leading-relaxed text-ink-400">
        <h2 className="mb-2 font-semibold text-ink-200">정책 기준</h2>
        <p>
          중복 기준은 연락처 숫자만 비교합니다. 하이픈, 공백 등 입력 형태가 달라도
          같은 번호면 동일 DB로 판단합니다.
        </p>
      </section>
    </div>
  )
}
