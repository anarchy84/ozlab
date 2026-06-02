'use client'

// ─────────────────────────────────────────────
// CtaModalForm — CTA form_fields 기반 동적 폼 모달
//
// Phase 2B 코어 :
//   modal_form / floating_button / sticky_bar / toast 모두 이 모달을 띄움
//   inline_form 도 동일 폼 컴포넌트 (모달 껍데기만 제외)
//
// 동작 :
//   - cta.form_fields 배열을 순회해 동적 input 렌더
//   - 표준 ID(name/phone/...)는 표준 컬럼으로, 그 외는 custom_fields 로 묶어 POST
//   - 어트리뷰션 (utm + first-touch + CTA 클릭) 자동 첨부
//   - 제출 성공 시 ✅ 화면 → 닫기
// ─────────────────────────────────────────────

import { useEffect, useRef, useState, FormEvent, ChangeEvent } from 'react'
import type { CtaButton, CtaFormField } from '@/lib/admin/types'
import { captureCtaClick, readCtaAttribution } from '@/lib/cta-attribution'
import { KAKAO_CHAT_URL, SITE_PHONE, SITE_PHONE_HREF } from '@/lib/contact'
import {
  INDUSTRY_OPTIONS,
  REGION_OPTIONS,
  groupOptionsByField,
  type ConsultationFieldOption,
} from '@/lib/consultation-options'
import { LEAD_DEFAULT_VALUE, getGaClientId, getGaSessionId, getFbp, getFbc, pushEvent } from '@/lib/tracking/datalayer'

const STANDARD_IDS = new Set([
  'name', 'phone', 'store_name', 'industry', 'region', 'message',
])

interface Props {
  cta: CtaButton
  /** 모달 닫기 콜백 (모달 모드일 때) */
  onClose?: () => void
  /** 인라인 모드일 때 모달 껍데기 제거 */
  inline?: boolean
}

export function CtaModalForm({ cta, onClose, inline }: Props) {
  const fields = cta.form_fields?.length ? cta.form_fields : DEFAULT_FALLBACK
  const dc = cta.display_config ?? {}

  const [values, setValues] = useState<Record<string, string | boolean>>(() => {
    const init: Record<string, string | boolean> = { _hp: '', consent_privacy: false }
    for (const f of fields) init[f.id] = f.type === 'checkbox' ? false : ''
    return init
  })
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attribution, setAttribution] = useState<Record<string, string>>({})
  // form_start 1회만 push
  const formStartedRef = useRef(false)

  // 표준 select 필드(industry/region)는 DB 옵션 마스터에서 fetch
  const [industryOptions, setIndustryOptions] = useState<readonly string[]>(INDUSTRY_OPTIONS)
  const [regionOptions, setRegionOptions] = useState<readonly string[]>(REGION_OPTIONS)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/consultation-options')
        if (!res.ok) return
        const rows = (await res.json()) as ConsultationFieldOption[]
        if (cancelled || !Array.isArray(rows) || rows.length === 0) return
        const grouped = groupOptionsByField(
          rows.map((r) => ({ ...r, is_active: true } as ConsultationFieldOption)),
        )
        if (grouped.industry.length > 0) setIndustryOptions(grouped.industry)
        if (grouped.region.length > 0) setRegionOptions(grouped.region)
      } catch (e) {
        console.warn('[CtaModalForm consultation-options]', e)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // 어트리뷰션 머지 (마운트 시 1회) + CTA 클릭 캡처
  useEffect(() => {
    if (typeof window === 'undefined') return
    captureCtaClick({
      id: cta.id,
      utm_source: cta.utm_source,
      utm_medium: cta.utm_medium,
      utm_campaign: cta.utm_campaign,
      utm_content: cta.utm_content,
    })
    const a = readCtaAttribution()
    const u: Record<string, string> = {}
    if (a.utm_source) u.utm_source = a.utm_source
    if (a.utm_medium) u.utm_medium = a.utm_medium
    if (a.utm_campaign) u.utm_campaign = a.utm_campaign
    if (a.utm_content) u.utm_content = a.utm_content
    if (a.utm_term) u.utm_term = a.utm_term
    if (a.gclid) u.gclid = a.gclid
    if (a.fbclid) u.fbclid = a.fbclid
    if (a.referer) u.referer = a.referer
    if (a.landing_page_path) u.landing_page_path = a.landing_page_path
    // GA4 client_id / session_id (매출 보정 시 동일 사용자 매칭용)
    const gaClient = getGaClientId()
    const gaSession = getGaSessionId()
    if (gaClient)  u.ga_client_id  = gaClient
    if (gaSession) u.ga_session_id = gaSession
    // Meta CAPI 매칭용 쿠키
    const fbp = getFbp()
    const fbc = getFbc()
    if (fbp) u.meta_fbp = fbp
    if (fbc) u.meta_fbc = fbc
    setAttribution(u)
  }, [cta.id, cta.utm_source, cta.utm_medium, cta.utm_campaign, cta.utm_content])

  // 첫 필드 포커스 시 form_start push (CTA별 1회)
  const handleFieldFocus = () => {
    if (formStartedRef.current) return
    formStartedRef.current = true
    pushEvent('form_start', {
      form_id: `cta_${cta.id}`,
      form_location: cta.cta_type ?? 'modal_form',
      cta_id: cta.id,
      cta_label: cta.label,
      page_path: typeof window !== 'undefined' ? window.location.pathname : null,
    })
  }

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const t = e.target
    if (t instanceof HTMLInputElement && t.type === 'checkbox') {
      setValues((p) => ({ ...p, [t.name]: t.checked }))
    } else {
      setValues((p) => ({ ...p, [t.name]: t.value }))
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    setError(null)

    // 동의 체크 (consent_privacy 필드 또는 폼 끝의 동의 박스)
    if (values.consent_privacy !== true) {
      setError('개인정보 수집·이용 동의가 필요합니다.')
      return
    }

    setSubmitting(true)
    try {
      // 표준/커스텀 분리
      const standard: Record<string, unknown> = {}
      const custom: Record<string, unknown> = {}
      for (const f of fields) {
        const v = values[f.id]
        if (v === undefined || v === '' || v === false) continue
        if (STANDARD_IDS.has(f.id)) standard[f.id] = v
        else custom[f.id] = v
      }

      const res = await fetch('/api/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...standard,
          custom_fields: custom,
          consent_privacy: true,
          _hp: values._hp,
          cta_id: cta.id,
          ...attribution,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? '신청 처리 중 오류가 발생했습니다.')
        return
      }
      setSent(true)
      // GTM dataLayer push — GA4 추천 이벤트 generate_lead
      //   modal/floating/sticky/toast 어디서 들어왔든 cta_id 로 출처 식별 가능
      pushEvent('generate_lead', {
        lead_id: typeof data?.id === 'string' ? data.id : null,
        value: LEAD_DEFAULT_VALUE,
        currency: 'KRW',
        form_id: `cta_${cta.id}`,
        cta_id: cta.id,
        cta_label: cta.label,
        cta_type: cta.cta_type ?? null,
        utm_source: attribution.utm_source ?? cta.utm_source ?? null,
        utm_medium: attribution.utm_medium ?? cta.utm_medium ?? null,
        utm_campaign: attribution.utm_campaign ?? cta.utm_campaign ?? null,
        utm_content: attribution.utm_content ?? cta.utm_content ?? null,
        utm_term: attribution.utm_term ?? null,
        gclid: attribution.gclid ?? null,
        fbclid: attribution.fbclid ?? null,
      })
    } catch {
      setError('네트워크 오류입니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── 본문 ──
  const body = (
    <div
      className="cta-form-body"
      style={{ background: inline ? undefined : (dc.bg_color ?? '#0f1115') }}
    >
      {sent ? (
        <div className="px-4 py-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-blue/15 text-4xl">
            ✅
          </div>
          <h3 className="break-keep text-[21px] font-extrabold leading-tight text-white sm:text-2xl">
            신청이 접수되었습니다
          </h3>
          <p className="mx-auto mt-3 max-w-xs break-keep text-sm leading-relaxed text-white/78">
            담당자가 영업일 24시간 내에 연락드릴게요. 급한 문의는 바로 연결해 주세요.
          </p>
          <div className="mt-6 grid gap-2">
            <a
              href="/"
              className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-white/20 px-4 py-2.5 text-sm font-bold leading-tight text-white hover:bg-white/10"
            >
              홈으로 돌아가기
            </a>
            <a
              href={SITE_PHONE_HREF}
              className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-brand-blue px-4 py-2.5 text-sm font-bold leading-tight text-white hover:bg-brand-dark"
              aria-label={`${SITE_PHONE} 전화하기`}
            >
              {SITE_PHONE} 전화하기
            </a>
            <a
              href={KAKAO_CHAT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-[#FEE500] px-4 py-2.5 text-sm font-bold leading-tight text-[#111] hover:brightness-95"
            >
              카톡 문의하기
            </a>
          </div>
          {!inline && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="mt-5 text-sm font-semibold text-white/60 underline-offset-4 hover:text-white hover:underline"
            >
              닫기
            </button>
          )}
        </div>
      ) : (
        <form onSubmit={submit} onFocus={handleFieldFocus} noValidate className="space-y-3">
          {dc.title && (
            <h3 className="text-lg font-bold text-white">{dc.title}</h3>
          )}
          {dc.description && (
            <p className="text-sm text-white/70 break-keep">{dc.description}</p>
          )}

          {/* honeypot */}
          <div aria-hidden style={{ position: 'absolute', left: -9999, width: 1, height: 1, overflow: 'hidden' }}>
            <input
              type="text"
              name="_hp"
              tabIndex={-1}
              autoComplete="off"
              value={(values._hp as string) ?? ''}
              onChange={handleChange}
            />
          </div>

          {fields.map((f) => (
            <DynamicField
              key={f.id}
              field={f}
              value={values[f.id]}
              onChange={handleChange}
              standardOptions={{ industry: industryOptions, region: regionOptions }}
            />
          ))}

          <label className="flex items-start gap-2 text-xs text-white/80">
            <input
              type="checkbox"
              name="consent_privacy"
              required
              checked={values.consent_privacy === true}
              onChange={handleChange}
              className="mt-0.5"
            />
            <span>(필수) 개인정보 수집·이용에 동의합니다. 수집된 정보는 상담 목적으로만 활용됩니다.</span>
          </label>

          {error && (
            <div role="alert" className="px-3 py-2 rounded bg-red-500/15 text-red-300 text-xs border border-red-500/30">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded text-sm font-bold text-black disabled:opacity-50"
            style={{ background: dc.button_color ?? '#7C8CFF' }}
          >
            {submitting ? '신청 처리 중…' : (cta.label || '무료 상담 신청')}
          </button>
        </form>
      )}
    </div>
  )

  // 인라인 모드: body 만 반환
  if (inline) {
    return <div className="cta-inline-form rounded-lg p-4" style={{ background: dc.bg_color ?? '#0f1115' }}>{body}</div>
  }

  // 모달 모드
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-lg shadow-2xl border border-white/10 overflow-hidden">
        {(dc.show_close ?? true) && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl leading-none z-10"
            aria-label="닫기"
          >
            ×
          </button>
        )}
        <div className="p-5">{body}</div>
      </div>
    </div>
  )
}

// ─── 동적 단일 필드 렌더 ──
type StandardOptions = {
  industry: readonly string[]
  region: readonly string[]
}

function DynamicField({
  field,
  value,
  onChange,
  standardOptions,
}: {
  field: CtaFormField
  value: string | boolean | undefined
  onChange: (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void
  standardOptions: StandardOptions
}) {
  const selectOptions = getStandardSelectOptions(field, standardOptions) ?? field.options ?? []
  const inputClass =
    'w-full px-3 py-2 rounded text-sm bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-brand-blue'

  return (
    <label className="block text-sm">
      <span className="text-white/90 text-xs">
        {field.label}
        {field.required && <span className="text-red-300"> *</span>}
      </span>
      <div className="mt-1">
        {field.type === 'textarea' && (
          <textarea
            name={field.id}
            rows={3}
            required={field.required}
            placeholder={field.placeholder}
            value={(value as string) ?? ''}
            onChange={onChange}
            className={inputClass}
          />
        )}
        {field.type === 'select' && (
          <select
            name={field.id}
            required={field.required}
            value={(value as string) ?? ''}
            onChange={onChange}
            className={inputClass}
          >
            <option value="">선택해주세요</option>
            {selectOptions.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        )}
        {field.type === 'checkbox' && (
          <input
            type="checkbox"
            name={field.id}
            checked={value === true}
            onChange={onChange}
            className="w-4 h-4"
          />
        )}
        {(field.type === 'text' || field.type === 'phone' || field.type === 'email') && (
          <input
            type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
            name={field.id}
            required={field.required}
            placeholder={field.placeholder}
            autoComplete={
              field.id === 'name' ? 'name'
              : field.id === 'phone' ? 'tel'
              : field.type === 'email' ? 'email'
              : 'off'
            }
            value={(value as string) ?? ''}
            onChange={onChange}
            className={inputClass}
          />
        )}
      </div>
    </label>
  )
}

function getStandardSelectOptions(
  field: CtaFormField,
  std: StandardOptions,
): readonly string[] | null {
  if (field.id === 'industry') return std.industry
  if (field.id === 'region') return std.region
  return null
}

// 폴백 — form_fields 비어있을 때
const DEFAULT_FALLBACK: CtaFormField[] = [
  { id: 'name', label: '사장님 성함', type: 'text', required: true, placeholder: '홍길동' },
  { id: 'phone', label: '연락처', type: 'phone', required: true, placeholder: '010-0000-0000' },
]
