'use client'

// ─────────────────────────────────────────────
// HeadSettingsForm — 사이트 head 영역 편집 폼
//
// 구성:
//   1) 구조화 필드 6종 (GTM·GA4·메타픽셀·GSC·NaverSC·custom_head_html 제외 5종)
//   2) custom_head_html (자유 HTML 영역, monospace textarea)
//   3) 저장 / 변경 사항 미리보기
//
// 안전장치:
//   - 형식 클라이언트 검증 (한 번 더 서버에서도 검증됨)
//   - custom_head_html 50,000자 제한
//   - "초기화" 버튼은 의도적 미제공 (실수 방지)
// ─────────────────────────────────────────────

import { useState } from 'react'
import type { SiteSettings, SiteSettingKey } from '@/lib/admin/site-settings'

const FIELDS: Array<{
  key: SiteSettingKey
  label: string
  placeholder: string
  help: string
  pattern?: RegExp
  patternHint?: string
  textarea?: boolean
}> = [
  {
    key: 'gtm_id',
    label: 'GTM 컨테이너 ID',
    placeholder: 'GTM-N3HSNZPJ',
    help: 'Google Tag Manager 컨테이너. tagmanager.google.com 에서 발급.',
    pattern: /^GTM-[A-Z0-9]{6,}$/i,
    patternHint: '형식: GTM-XXXXXXX',
  },
  {
    key: 'ga4_measurement_id',
    label: 'GA4 측정 ID',
    placeholder: 'G-XXXXXXXXXX',
    help: 'GA4 프로퍼티 > 관리 > 데이터 스트림 > 측정 ID. GTM 안 Google 태그에도 이 값 입력.',
    pattern: /^G-[A-Z0-9]{6,}$/i,
    patternHint: '형식: G-XXXXXXXXXX',
  },
  {
    key: 'meta_pixel_id',
    label: 'Meta 픽셀 ID',
    placeholder: '000000000000000',
    help: '비즈매니저 > 이벤트 관리자 > 픽셀 ID. CAPI 토큰은 Vercel env(META_CAPI_TOKEN)로 별도 박음.',
    pattern: /^\d{10,17}$/,
    patternHint: '형식: 숫자 10~17자리',
  },
  {
    key: 'google_site_verification',
    label: 'Google Search Console 인증 태그',
    placeholder: '<meta name="google-site-verification" content="..." />',
    help: 'GSC 속성 추가 > HTML 태그 전체를 그대로 붙여넣어도 됩니다. content 값만 넣어도 동일하게 동작합니다.',
  },
  {
    key: 'naver_site_verification',
    label: '네이버 서치어드바이저 인증 태그',
    placeholder: '<meta name="naver-site-verification" content="..." />',
    help: '네이버 SC 사이트 등록 > HTML 태그 인증 값을 그대로 붙여넣어도 됩니다. content 값만 넣어도 동일하게 동작합니다.',
  },
  {
    key: 'custom_head_html',
    label: '자유 HTML (custom_head_html)',
    placeholder: '<!-- 대행사가 준 픽셀 스크립트 등을 여기에 -->',
    help: '<script>, <meta>, <link> 등 자유롭게. 모든 퍼블릭 페이지 head 영역에 그대로 inject 됩니다. /admin/* 은 차단.',
    textarea: true,
  },
]

interface Props {
  initial: SiteSettings
}

export default function HeadSettingsForm({ initial }: Props) {
  const [values, setValues] = useState<SiteSettings>(initial)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [errors, setErrors] = useState<Partial<Record<SiteSettingKey, string>>>({})

  function setField(key: SiteSettingKey, v: string) {
    setValues((p) => ({ ...p, [key]: v }))
    setErrors((p) => ({ ...p, [key]: undefined }))
  }

  function validate(): boolean {
    const next: Partial<Record<SiteSettingKey, string>> = {}
    for (const f of FIELDS) {
      const raw = values[f.key]
      if (!raw) continue // null/빈값은 OK (필드 비우기)
      const trimmed = raw.trim()
      if (!trimmed) continue
      if (f.pattern && !f.pattern.test(trimmed)) {
        next[f.key] = f.patternHint ?? '형식이 올바르지 않습니다'
      }
      if (f.key === 'custom_head_html' && trimmed.length > 50000) {
        next[f.key] = '50,000자 이하로 입력해주세요'
      }
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSave() {
    if (saving) return
    setMsg(null)
    if (!validate()) {
      setMsg({ kind: 'err', text: '입력 형식을 확인해주세요' })
      return
    }
    setSaving(true)
    try {
      // 화면의 빈 문자열은 API 에 null 로 보내고, 서버가 DB NOT NULL 제약에 맞게 저장한다.
      const body: Partial<Record<SiteSettingKey, string | null>> = {}
      for (const f of FIELDS) {
        const v = values[f.key]
        body[f.key] = v && v.trim().length > 0 ? v.trim() : null
      }
      const res = await fetch('/api/admin/settings/head', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const detail = Array.isArray(data?.details)
          ? data.details.map((d: { key: string; error: string }) => `${d.key}: ${d.error}`).join(' / ')
          : data?.error ?? '저장 실패'
        setMsg({ kind: 'err', text: detail })
        return
      }
      if (data?.settings) setValues(data.settings)
      setMsg({ kind: 'ok', text: '저장 완료. 모든 퍼블릭 페이지에 즉시 반영됩니다.' })
    } catch (e) {
      setMsg({ kind: 'err', text: `네트워크 오류: ${e instanceof Error ? e.message : String(e)}` })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 안내 박스 */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-ink-200">
        ⚠️ <strong className="text-ink-100">슈퍼어드민 전용.</strong>{' '}
        잘못된 HTML/스크립트를 박으면 사이트가 깨질 수 있습니다. 저장 후 시크릿모드로
        퍼블릭 페이지(예: <code className="text-brand-neon">/</code>) 직접 열어 확인하세요.
      </div>

      {/* 구조화 필드 */}
      <div className="space-y-5">
        {FIELDS.filter((f) => !f.textarea).map((f) => (
          <div key={f.key} className="flex flex-col gap-1.5">
            <label
              htmlFor={`field-${f.key}`}
              className="text-sm font-semibold text-ink-100"
            >
              {f.label}
            </label>
            <input
              id={`field-${f.key}`}
              type="text"
              value={values[f.key] ?? ''}
              onChange={(e) => setField(f.key, e.target.value)}
              placeholder={f.placeholder}
              className="rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 focus:border-brand-blue focus:outline-none"
            />
            <p className="text-xs text-ink-500">{f.help}</p>
            {errors[f.key] && (
              <p className="text-xs text-accent-red">⚠️ {errors[f.key]}</p>
            )}
          </div>
        ))}
      </div>

      {/* 자유 HTML — 별도 섹션 */}
      <div className="border-t border-ink-700 pt-6">
        {FIELDS.filter((f) => f.textarea).map((f) => (
          <div key={f.key} className="flex flex-col gap-1.5">
            <label
              htmlFor={`field-${f.key}`}
              className="text-sm font-semibold text-ink-100"
            >
              {f.label}
            </label>
            <textarea
              id={`field-${f.key}`}
              value={values[f.key] ?? ''}
              onChange={(e) => setField(f.key, e.target.value)}
              placeholder={f.placeholder}
              rows={14}
              spellCheck={false}
              className="rounded-md border border-ink-700 bg-ink-900 px-3 py-2 font-mono text-xs text-ink-100 focus:border-brand-blue focus:outline-none"
            />
            <div className="flex items-center justify-between text-xs text-ink-500">
              <span>{f.help}</span>
              <span>
                {(values[f.key] ?? '').length.toLocaleString()} / 50,000
              </span>
            </div>
            {errors[f.key] && (
              <p className="text-xs text-accent-red">⚠️ {errors[f.key]}</p>
            )}
          </div>
        ))}
      </div>

      {/* 저장 영역 */}
      <div className="flex items-center justify-between border-t border-ink-700 pt-5">
        <div className="text-sm">
          {msg && (
            <span
              className={
                msg.kind === 'ok'
                  ? 'text-brand-neon'
                  : 'text-accent-red'
              }
            >
              {msg.kind === 'ok' ? '✅' : '⚠️'} {msg.text}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-brand-blue px-5 py-2 text-sm font-bold text-white transition hover:bg-brand-dark disabled:opacity-50"
        >
          {saving ? '저장 중…' : '저장'}
        </button>
      </div>
    </div>
  )
}
