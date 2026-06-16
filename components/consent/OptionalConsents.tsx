'use client'

// ─────────────────────────────────────────────
// OptionalConsents — 선택 동의(마케팅 활용 / 제3자 제공) 체크박스 묶음
//
// 사용처 : ApplyForm(라이트 카드), CtaModalForm(다크 모달) 공용
//
// 동작 :
//   - 마운트 시 /api/consent 에서 라벨·전문·노출여부 로드
//   - enabled=true 인 항목만 체크박스로 렌더 (선택 — 미체크여도 제출 가능)
//   - "전문 보기" 클릭 시 약관 전문 모달 표시
//   - 값은 부모가 controlled 로 관리 (onToggle 콜백)
// ─────────────────────────────────────────────

import { useEffect, useState } from 'react'
import {
  CONSENT_FIELD_NAMES,
  type ConsentKind,
  type ConsentSettings,
} from '@/lib/consent'

type ConsentFieldName = (typeof CONSENT_FIELD_NAMES)[ConsentKind]

interface Props {
  /** 체크 상태 — 부모 폼 state */
  values: Record<ConsentFieldName, boolean>
  /** 체크 토글 콜백 */
  onToggle: (field: ConsentFieldName, checked: boolean) => void
  /** 배경 테마 — light: 밝은 카드 / dark: 어두운 모달 */
  theme?: 'light' | 'dark'
}

const ORDER: ConsentKind[] = ['marketing', 'third_party']

export function OptionalConsents({ values, onToggle, theme = 'light' }: Props) {
  const [settings, setSettings] = useState<ConsentSettings | null>(null)
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
        console.warn('[OptionalConsents fetch]', e)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!settings) return null

  // 노출 대상(enabled)만 추림
  const visible = ORDER.filter((kind) => settings[kind]?.enabled)
  if (visible.length === 0) return null

  const isDark = theme === 'dark'
  const rowText = isDark ? 'text-white/80' : 'text-ink-600'
  const linkText = isDark
    ? 'text-white/90 underline hover:text-white'
    : 'text-brand-blue underline hover:text-brand-dark'

  return (
    <div className="mt-3 space-y-2">
      {visible.map((kind) => {
        const item = settings[kind]
        const field = CONSENT_FIELD_NAMES[kind]
        const hasBody = item.body.trim().length > 0
        return (
          <label
            key={kind}
            className={`flex items-start gap-2 text-xs leading-relaxed ${rowText}`}
          >
            <input
              type="checkbox"
              name={field}
              checked={values[field] === true}
              onChange={(e) => onToggle(field, e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0"
            />
            <span className="break-keep">
              {item.label}
              {hasBody && (
                <>
                  {' '}
                  <button
                    type="button"
                    onClick={() => setOpenBody({ title: item.label, body: item.body })}
                    className={`font-semibold ${linkText}`}
                  >
                    전문 보기
                  </button>
                </>
              )}
            </span>
          </label>
        )
      })}

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
              <h4 className="text-sm font-bold text-ink-900 break-keep">{openBody.title}</h4>
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
