'use client'

// ─────────────────────────────────────────────
// ConsentAgreement — 동의 박스 (아정당식 전체동의 + 필수/선택 리스트)
//
// 사용처 : ApplyForm(라이트 카드), CtaModalForm(다크 모달) 공용
//
// 구성 :
//   ┌ ☑ 전체 동의           (누르면 노출된 항목 일괄 체크/해제)
//   ├ ☐ (필수) 개인정보 수집·이용 동의      [전문 보기]
//   ├ ☐ (필수) 개인정보 제3자 제공 동의     [전문 보기]
//   └ ☐ (선택) 마케팅 정보 수신 동의        [전문 보기]
//
// 동작 :
//   - /api/consent 에서 라벨·전문·노출여부 로드 (실패 시 기본값 fallback → 필수 항목 항상 노출)
//   - 필수 항목은 항상 노출, 선택 항목은 enabled=true 일 때만 노출
//   - 값은 부모 폼이 controlled 로 관리 (onToggle 콜백)
//   - 처음엔 모두 해제 상태. 전체 동의 또는 개별 체크로 동의.
// ─────────────────────────────────────────────

import { useEffect, useState } from 'react'
import {
  CONSENT_KINDS,
  CONSENT_META,
  DEFAULT_CONSENTS,
  type ConsentFieldName,
  type ConsentKind,
  type ConsentSettings,
} from '@/lib/consent'

interface Props {
  /** 체크 상태 — 부모 폼 state */
  values: Record<ConsentFieldName, boolean>
  /** 체크 토글 콜백 */
  onToggle: (field: ConsentFieldName, checked: boolean) => void
  /** 배경 테마 — light: 밝은 카드 / dark: 어두운 모달 */
  theme?: 'light' | 'dark'
}

export function ConsentAgreement({ values, onToggle, theme = 'light' }: Props) {
  // 기본값으로 초기화 → 필수 체크박스는 즉시 노출, 서버 문구는 로드되면 교체
  const [settings, setSettings] = useState<ConsentSettings>(DEFAULT_CONSENTS)
  const [openBody, setOpenBody] = useState<{ title: string; body: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/consent')
        if (!res.ok) return
        const data = (await res.json()) as ConsentSettings
        if (!cancelled) setSettings(data)
      } catch (e) {
        console.warn('[ConsentAgreement fetch]', e)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // 노출 대상 — 필수는 항상, 선택은 enabled 일 때만
  const visible: ConsentKind[] = CONSENT_KINDS.filter(
    (kind) => CONSENT_META[kind].required || settings[kind]?.enabled,
  )
  if (visible.length === 0) return null

  const allChecked = visible.every((kind) => values[CONSENT_META[kind].field] === true)

  const handleMaster = (checked: boolean) => {
    for (const kind of visible) onToggle(CONSENT_META[kind].field, checked)
  }

  const isDark = theme === 'dark'
  const boxBorder = isDark ? 'border-white/15' : 'border-ink-200'
  const masterText = isDark ? 'text-white' : 'text-ink-900'
  const rowText = isDark ? 'text-white/80' : 'text-ink-600'
  const divider = isDark ? 'border-white/10' : 'border-ink-100'
  const linkText = isDark
    ? 'text-white/90 underline hover:text-white'
    : 'text-brand-blue underline hover:text-brand-dark'
  const chevron = isDark ? 'text-white/40' : 'text-ink-400'

  return (
    <div className={`mt-3 rounded-xl border ${boxBorder} px-4 py-3`}>
      {/* 전체 동의 */}
      <label className={`flex cursor-pointer items-center gap-2 text-sm font-bold ${masterText}`}>
        <input
          type="checkbox"
          checked={allChecked}
          onChange={(e) => handleMaster(e.target.checked)}
          className="h-4 w-4 shrink-0"
        />
        전체 동의
      </label>

      <div className={`my-2.5 border-t ${divider}`} />

      {/* 개별 항목 */}
      <div className="space-y-2">
        {visible.map((kind) => {
          const item = settings[kind]
          const field = CONSENT_META[kind].field
          const hasBody = item.body.trim().length > 0
          return (
            <div key={kind} className="flex items-start justify-between gap-2">
              <label className={`flex flex-1 items-start gap-2 text-xs leading-relaxed ${rowText}`}>
                <input
                  type="checkbox"
                  name={field}
                  checked={values[field] === true}
                  onChange={(e) => onToggle(field, e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0"
                />
                <span className="break-keep">{item.label}</span>
              </label>
              {hasBody && (
                <button
                  type="button"
                  onClick={() => setOpenBody({ title: item.label, body: item.body })}
                  className={`shrink-0 text-xs font-semibold ${linkText}`}
                  aria-label={`${item.label} 전문 보기`}
                >
                  <span className={`${chevron}`} aria-hidden>
                    전문 보기 ›
                  </span>
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* 약관 전문 모달 */}
      {openBody && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpenBody(null)}
        >
          <div
            className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
              <h4 className="break-keep text-sm font-bold text-ink-900">{openBody.title}</h4>
              <button
                type="button"
                onClick={() => setOpenBody(null)}
                className="ml-3 shrink-0 text-2xl leading-none text-ink-400 hover:text-ink-900"
                aria-label="닫기"
              >
                ×
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4">
              <p className="whitespace-pre-wrap break-keep text-xs leading-relaxed text-ink-700">
                {openBody.body}
              </p>
            </div>
            <div className="border-t border-ink-100 px-5 py-3 text-right">
              <button
                type="button"
                onClick={() => setOpenBody(null)}
                className="rounded-md bg-ink-900 px-4 py-2 text-xs font-bold text-white hover:bg-ink-700"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
