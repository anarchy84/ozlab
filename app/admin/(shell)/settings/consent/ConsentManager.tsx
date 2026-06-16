'use client'

// ─────────────────────────────────────────────
// ConsentManager — 선택 동의 항목 편집 폼
//
// 두 항목(마케팅 활용 / 제3자 제공) 각각:
//   - 폼 노출 ON/OFF
//   - 체크박스 옆 문구(label)
//   - '전문 보기' 약관 전문(body)
// 저장 → PUT /api/admin/settings/consent
// ─────────────────────────────────────────────

import { useState } from 'react'
import type { ConsentItem, ConsentKind, ConsentSettings } from '@/lib/consent'

const META: Record<ConsentKind, { title: string; hint: string }> = {
  marketing: {
    title: '마케팅 활용 동의',
    hint: '이벤트·혜택·신상품 안내 등 광고성 정보 수신 동의입니다. 동의하지 않아도 상담 접수는 정상 진행돼요.',
  },
  third_party: {
    title: '개인정보 제3자 제공 동의',
    hint: '제휴 POS사·상담 위탁사 등에 정보를 제공하는 동의입니다. 전문에 실제 제공받는 업체명을 정확히 기재하세요.',
  },
}

const ORDER: ConsentKind[] = ['marketing', 'third_party']

export default function ConsentManager({ initial }: { initial: ConsentSettings }) {
  const [settings, setSettings] = useState<ConsentSettings>(initial)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  function patch(kind: ConsentKind, field: keyof ConsentItem, value: string | boolean) {
    setSettings((p) => ({ ...p, [kind]: { ...p[kind], [field]: value } }))
    setMessage(null)
  }

  async function save() {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/settings/consent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketing: settings.marketing,
          third_party: settings.third_party,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage({ type: 'err', text: data?.error ?? '저장 중 오류가 발생했습니다.' })
        return
      }
      if (data?.settings) setSettings(data.settings as ConsentSettings)
      setMessage({ type: 'ok', text: '저장되었습니다. (외부 폼 반영까지 최대 10분)' })
    } catch {
      setMessage({ type: 'err', text: '네트워크 오류입니다. 잠시 후 다시 시도해주세요.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {ORDER.map((kind) => {
        const item = settings[kind]
        const meta = META[kind]
        return (
          <section
            key={kind}
            className="rounded-xl border border-ink-700/40 bg-ink-900/40 p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-ink-100 break-keep">{meta.title}</h2>
                <p className="mt-1 text-xs text-ink-400 break-keep">{meta.hint}</p>
              </div>
              {/* 노출 ON/OFF */}
              <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm text-ink-200">
                <input
                  type="checkbox"
                  checked={item.enabled}
                  onChange={(e) => patch(kind, 'enabled', e.target.checked)}
                  className="h-4 w-4"
                />
                폼에 노출
              </label>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-300">
                  체크박스 옆 문구
                </label>
                <input
                  type="text"
                  value={item.label}
                  maxLength={200}
                  onChange={(e) => patch(kind, 'label', e.target.value)}
                  placeholder="(선택) ○○에 동의합니다."
                  className="w-full rounded-md border border-ink-700/60 bg-ink-900/40 px-3 py-2 text-sm text-ink-100 placeholder-ink-600 focus:border-brand-blue focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-300">
                  약관 전문 (체크박스 옆 &lsquo;전문 보기&rsquo; 클릭 시 표시)
                </label>
                <textarea
                  value={item.body}
                  rows={10}
                  maxLength={20000}
                  onChange={(e) => patch(kind, 'body', e.target.value)}
                  placeholder="동의 약관 전문을 입력하세요. 줄바꿈은 그대로 표시됩니다."
                  className="w-full whitespace-pre-wrap rounded-md border border-ink-700/60 bg-ink-900/40 px-3 py-2 font-mono text-xs leading-relaxed text-ink-100 placeholder-ink-600 focus:border-brand-blue focus:outline-none"
                />
                <p className="mt-1 text-right text-[11px] text-ink-500">
                  {item.body.length.toLocaleString()} / 20,000자
                </p>
              </div>
            </div>
          </section>
        )
      })}

      {message && (
        <div
          role="alert"
          className={`rounded-md px-3 py-2 text-sm ${
            message.type === 'ok'
              ? 'border border-green-500/30 bg-green-500/10 text-green-300'
              : 'border border-red-500/30 bg-red-500/10 text-red-300'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-md bg-brand-blue px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {saving ? '저장 중…' : '저장하기'}
        </button>
        <span className="text-xs text-ink-500">
          저장 시 두 항목이 함께 반영됩니다.
        </span>
      </div>
    </div>
  )
}
