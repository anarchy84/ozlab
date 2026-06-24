// ─────────────────────────────────────────────
// ApplyForm — 상담 신청 폼 (다크 배경 2컬럼)
// 원본: _design_reference/src/sections/ApplyForm.jsx
//
// P6 단계 변경 :
//   - submit 핸들러를 fetch('/api/consultations') 호출로 교체
//   - 폼 input 들에 controlled state 부여
//   - URL 의 utm_* 파라미터를 mount 시점에 읽어서 함께 전송
//   - honeypot input(_hp) 추가 — 봇 차단
//   - 에러 메시지 표시 + 더블클릭 방지(submitting)
// ─────────────────────────────────────────────
'use client'

import { useState, useEffect, useRef, FormEvent, ChangeEvent } from 'react'
import { EditableText } from '@/components/editable/EditableText'
import { ConsentAgreement } from '@/components/consent/OptionalConsents'
import { pickTextOrUndef, type ContentBlock } from '@/lib/content-blocks'
import { readCtaAttribution } from '@/lib/cta-attribution'
import { isStrictKoreanMobilePhone } from '@/lib/consultation-policy'
import { KAKAO_CHAT_URL, SITE_PHONE, SITE_PHONE_HREF } from '@/lib/contact'
import {
  INDUSTRY_OPTIONS,
  REGION_OPTIONS,
  groupOptionsByField,
  type ConsultationFieldOption,
} from '@/lib/consultation-options'
import { LEAD_DEFAULT_VALUE, getGaClientId, getGaSessionId, getFbp, getFbc, pushEvent } from '@/lib/tracking/datalayer'

interface Props {
  blocks: Record<string, ContentBlock>
}

// 폼 필드 — controlled state
type FormState = {
  name: string
  phone: string
  store_name: string
  industry: string
  region: string
  message: string
  consent_privacy: boolean
  consent_marketing: boolean
  consent_third_party: boolean
  _hp: string // honeypot — 사용자에겐 보이지 않음
}

const INITIAL: FormState = {
  name: '',
  phone: '',
  store_name: '',
  industry: '',
  region: '',
  message: '',
  consent_privacy: false,
  consent_marketing: false,
  consent_third_party: false,
  _hp: '',
}

export function ApplyForm({ blocks }: Props) {
  const [form, setForm] = useState<FormState>(INITIAL)
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // mount 시 어트리뷰션 캐싱 — submit 시 함께 전송
  // utm 5종 + gclid/fbclid + referer/landing_page (First-touch + URL + CTA 머지)
  // + ga_client_id / ga_session_id (GA4 cookie 에서 파싱)
  const [attribution, setAttribution] = useState<Record<string, string>>({})
  // form_start 는 첫 필드 포커스 시 1회만 push
  const formStartedRef = useRef(false)

  // 업종/지역 옵션 — DB 마스터에서 fetch. 실패하면 fallback 상수 사용.
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
          // is_active 는 이미 서버에서 필터됨. 그래도 안전하게 처리
          rows.map((r) => ({ ...r, is_active: true } as ConsultationFieldOption)),
        )
        if (grouped.industry.length > 0) setIndustryOptions(grouped.industry)
        if (grouped.region.length > 0) setRegionOptions(grouped.region)
      } catch (e) {
        console.warn('[ApplyForm consultation-options]', e)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    // 통합 어트리뷰션 — readAttribution() 내부에서
    //   URL 쿼리 > Session(CTA 클릭 24h) > First-touch(localStorage 30일) 머지
    const attr = readCtaAttribution()

    const u: Record<string, string> = {}
    if (attr.utm_source)        u.utm_source        = attr.utm_source
    if (attr.utm_medium)        u.utm_medium        = attr.utm_medium
    if (attr.utm_campaign)      u.utm_campaign      = attr.utm_campaign
    if (attr.utm_content)       u.utm_content       = attr.utm_content
    if (attr.utm_term)          u.utm_term          = attr.utm_term
    if (attr.gclid)             u.gclid             = attr.gclid
    if (attr.fbclid)            u.fbclid            = attr.fbclid
    if (attr.referer)           u.referer           = attr.referer
    if (attr.landing_page_path) u.landing_page_path = attr.landing_page_path

    // GA4 client_id / session_id 캐치 → 서버 저장 → 매출 입력 시 GA4 Measurement
    // Protocol 로 동일 사용자에 매칭 (이게 빠지면 어트리뷰션 깨짐)
    const gaClient = getGaClientId()
    const gaSession = getGaSessionId()
    if (gaClient)  u.ga_client_id  = gaClient
    if (gaSession) u.ga_session_id = gaSession

    // Meta CAPI 매칭용 쿠키 (서버에서 Purchase 이벤트 보낼 때 user_data 로 같이 전송)
    const fbp = getFbp()
    const fbc = getFbc()
    if (fbp) u.meta_fbp = fbp
    if (fbc) u.meta_fbc = fbc

    setAttribution(u)
  }, [])

  // 첫 필드 포커스 시 form_start push (1회만)
  //   - GA4 에서 폼 도달 vs 폼 시작 vs 완료 깔때기 분석 가능
  const handleFieldFocus = () => {
    if (formStartedRef.current) return
    formStartedRef.current = true
    pushEvent('form_start', {
      form_id: 'home_apply',
      form_location: 'apply_section',
      page_path: typeof window !== 'undefined' ? window.location.pathname : null,
    })
  }

  // 단일 onChange 핸들러 — text/select/textarea 모두 처리
  const onChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const target = e.target
    const { name, value } = target
    if (target instanceof HTMLInputElement && target.type === 'checkbox') {
      setForm((p) => ({ ...p, [name]: target.checked }))
    } else {
      setForm((p) => ({ ...p, [name]: value }))
    }
  }

  const setPhoneValue = (value: string) => {
    setForm((p) => ({ ...p, phone: value }))
  }

  // 폼 제출 → /api/consultations POST
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setError(null)

    // 필수 동의 검증 (개인정보 수집·이용 + 제3자 제공)
    if (!form.consent_privacy || !form.consent_third_party) {
      setError('필수 동의 항목에 모두 동의해주세요.')
      return
    }
    if (!isStrictKoreanMobilePhone(form.phone)) {
      setError('연락처는 010-0000-0000 형식으로 입력해주세요.')
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch('/api/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, ...attribution }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? '신청 처리 중 오류가 발생했습니다.')
        return
      }
      // 성공 — sent 토글, form 리셋(다시 신청 시 깨끗한 상태)
      setSent(true)
      setForm(INITIAL)
      // GTM dataLayer push — GA4 추천 이벤트 generate_lead
      //   · lead_id : 매출 보정 시 동일 사용자 연결 키 (consultations.id)
      //   · value   : 1차 추정 net 마진 (실제 net 은 매출 입력 시 서버 MP 로 보정 — A-3 단계)
      //   · utm_*   : 매체별 ROAS 측정 기반
      //   · gclid/fbclid : Google Ads · Meta 광고 클릭 매칭
      pushEvent('generate_lead', {
        lead_id: typeof data?.id === 'string' ? data.id : null,
        value: LEAD_DEFAULT_VALUE,
        currency: 'KRW',
        form_id: 'home_apply',
        cta_id: attribution.cta_id ?? null,
        utm_source: attribution.utm_source ?? null,
        utm_medium: attribution.utm_medium ?? null,
        utm_campaign: attribution.utm_campaign ?? null,
        utm_content: attribution.utm_content ?? null,
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

  return (
    <section
      id="apply"
      className="py-section bg-surface-dark text-white relative overflow-hidden"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-[20%] -right-[10%] w-[600px] h-[600px] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(58, 123, 255, 0.22), rgba(120, 97, 255, 0.14) 42%, transparent 72%)',
          filter: 'blur(80px)',
        }}
      />
      <div className="container-oz relative grid lg:grid-cols-[1fr_1.1fr] gap-10 lg:gap-16 items-start">
        {/* 좌측 카피 */}
        <div>
          <span className="eyebrow dark">
            <EditableText
              as="span"
              blockKey="home.apply.eyebrow"
              fallback="무료 상담 신청"
              value={pickTextOrUndef(blocks, 'home.apply.eyebrow')}
              pagePath="/"
            />
          </span>
          <h2 className="text-h1 text-white break-keep mt-4 mb-4">
            <EditableText
              as="span"
              blockKey="home.apply.headline.line1"
              fallback="3분만 투자하세요."
              value={pickTextOrUndef(blocks, 'home.apply.headline.line1')}
              pagePath="/"
            />
            <br />
            <mark className="hl-solid">
              <EditableText
                as="span"
                blockKey="home.apply.headline.mark"
                fallback="0원"
                value={pickTextOrUndef(blocks, 'home.apply.headline.mark')}
                pagePath="/"
              />
            </mark>
            <EditableText
              as="span"
              blockKey="home.apply.headline.post"
              fallback="부터 시작할 수 있어요."
              value={pickTextOrUndef(blocks, 'home.apply.headline.post')}
              pagePath="/"
            />
          </h2>
          <p className="text-ink-300 text-lg-fluid break-keep mb-6">
            <EditableText
              as="span"
              blockKey="home.apply.sub"
              fallback="상담 신청을 남겨주시면 영업일 기준 24시간 내에 담당자가 연락드립니다."
              value={pickTextOrUndef(blocks, 'home.apply.sub')}
              pagePath="/"
            />
          </p>
          <ul className="apply-benefits">
            <li>
              <EditableText
                as="span"
                blockKey="home.apply.benefit1"
                fallback="POS + 오즈랩페이 단말기 무상지원"
                value={pickTextOrUndef(blocks, 'home.apply.benefit1')}
                pagePath="/"
              />
            </li>
            <li>
              <EditableText
                as="span"
                blockKey="home.apply.benefit2"
                fallback="플레이스 리워드 광고 크레딧 무료 제공"
                value={pickTextOrUndef(blocks, 'home.apply.benefit2')}
                pagePath="/"
              />
            </li>
            <li>
              <EditableText
                as="span"
                blockKey="home.apply.benefit3"
                fallback="설치·교육·A/S 전담 매니저 배정"
                value={pickTextOrUndef(blocks, 'home.apply.benefit3')}
                pagePath="/"
              />
            </li>
            <li>
              <EditableText
                as="span"
                blockKey="home.apply.benefit4"
                fallback="기존 장비 반납·이관 지원"
                value={pickTextOrUndef(blocks, 'home.apply.benefit4')}
                pagePath="/"
              />
            </li>
          </ul>
        </div>

        {/* 우측 폼 카드 */}
        <div className="form-card">
          {sent ? (
            // 제출 성공 화면
            <div className="text-center px-4 py-9 text-ink-900 sm:px-5 sm:py-10">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft text-4xl">
                ✅
              </div>
              <h3 className="break-keep text-[22px] font-extrabold leading-tight text-ink-900 sm:text-[26px] lg:text-h2">
                신청이 접수되었습니다
              </h3>
              <p className="mx-auto mt-4 max-w-sm break-keep text-sm leading-relaxed text-ink-700 sm:text-base">
                담당자가 영업일 24시간 내에 연락드릴게요. 급한 문의는 대표번호나 카톡으로 바로 연결할 수 있습니다.
              </p>
              <div className="mt-7 grid gap-2 lg:grid-cols-3">
                <a
                  href="/"
                  className="btn btn-ghost min-h-[52px] w-full whitespace-nowrap px-4 text-sm leading-tight text-ink-800 sm:text-[15px]"
                >
                  홈으로 돌아가기
                </a>
                <a
                  href={SITE_PHONE_HREF}
                  className="btn btn-primary min-h-[52px] w-full whitespace-nowrap px-4 text-sm leading-tight sm:text-[15px]"
                  aria-label={`${SITE_PHONE} 전화하기`}
                >
                  {SITE_PHONE} 전화하기
                </a>
                <a
                  href={KAKAO_CHAT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn min-h-[52px] w-full whitespace-nowrap border border-[#FEE500] bg-[#FEE500] px-4 text-sm leading-tight text-[#111] hover:brightness-95 sm:text-[15px]"
                >
                  카톡 문의하기
                </a>
              </div>
              <button
                type="button"
                className="mt-5 text-sm font-semibold text-ink-500 underline-offset-4 hover:text-ink-900 hover:underline"
                onClick={() => {
                  setSent(false)
                  setError(null)
                }}
              >
                정보를 다시 입력할게요
              </button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate onFocus={handleFieldFocus}>
              <h3 className="text-h2 text-ink-900">상담 신청하기</h3>
              <p className="text-sm text-ink-500 mt-1 mb-6">
                * 표시는 필수 입력입니다.
              </p>

              {/* honeypot — 봇 전용. 사람한텐 안 보임. tab 으로도 못 가게 처리 */}
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  left: '-9999px',
                  width: 1,
                  height: 1,
                  overflow: 'hidden',
                }}
              >
                <label>
                  웹사이트 (입력하지 마세요)
                  <input
                    type="text"
                    name="_hp"
                    tabIndex={-1}
                    autoComplete="off"
                    value={form._hp}
                    onChange={onChange}
                  />
                </label>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="form-field">
                  <label htmlFor="apply-name">사장님 성함 *</label>
                  <input
                    id="apply-name"
                    name="name"
                    required
                    placeholder="홍길동"
                    autoComplete="name"
                    value={form.name}
                    onChange={onChange}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="apply-phone">연락처 *</label>
                  <SegmentedApplyPhoneInput
                    value={form.phone}
                    onValueChange={setPhoneValue}
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="apply-store">매장명</label>
                <input
                  id="apply-store"
                  name="store_name"
                  placeholder="매장 상호명"
                  value={form.store_name}
                  onChange={onChange}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="form-field">
                  <label htmlFor="apply-industry">업종</label>
                  <select
                    id="apply-industry"
                    name="industry"
                    value={form.industry}
                    onChange={onChange}
                  >
                    <option value="">선택해주세요</option>
                    {industryOptions.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor="apply-region">지역</label>
                  <select
                    id="apply-region"
                    name="region"
                    value={form.region}
                    onChange={onChange}
                  >
                    <option value="">선택해주세요</option>
                    {regionOptions.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="apply-message">원하시는 구성 / 남기실 말씀</label>
                <textarea
                  id="apply-message"
                  name="message"
                  rows={3}
                  placeholder="예) 10.1인치 POS 세트 견적 궁금합니다"
                  value={form.message}
                  onChange={onChange}
                />
              </div>

              {/* 동의 — 전체동의 + 필수/선택 (어드민에서 노출·문구 관리) */}
              <ConsentAgreement
                theme="light"
                values={{
                  consent_privacy: form.consent_privacy,
                  consent_third_party: form.consent_third_party,
                  consent_marketing: form.consent_marketing,
                }}
                onToggle={(field, checked) =>
                  setForm((p) => ({ ...p, [field]: checked }))
                }
              />

              {/* 에러 메시지 */}
              {error && (
                <div
                  role="alert"
                  className="mt-3 px-3 py-2 rounded-md bg-accent-red/10 text-accent-red text-sm border border-accent-red/30"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary form-submit"
                disabled={submitting}
              >
                {submitting ? '신청 처리 중…' : '무료 상담 신청하기'}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}

function SegmentedApplyPhoneInput({
  value,
  onValueChange,
}: {
  value: string
  onValueChange: (value: string) => void
}) {
  const middleRef = useRef<HTMLInputElement>(null)
  const lastRef = useRef<HTMLInputElement>(null)
  const { middle, last } = splitPhoneValue(value)

  function commit(nextMiddle: string, nextLast: string) {
    if (!nextMiddle && !nextLast) {
      onValueChange('')
      return
    }
    onValueChange(`010-${nextMiddle}-${nextLast}`)
  }

  function handleMiddleChange(raw: string) {
    const digits = raw.replace(/\D/g, '')
    const body = digits.startsWith('010') ? digits.slice(3) : digits
    const nextMiddle = body.slice(0, 4)
    const nextLast = body.length > 4 ? body.slice(4, 8) : last
    commit(nextMiddle, nextLast)
    if (nextMiddle.length === 4) {
      window.requestAnimationFrame(() => lastRef.current?.focus())
    }
  }

  function handleLastChange(raw: string) {
    const digits = raw.replace(/\D/g, '')
    const body = digits.startsWith('010') ? digits.slice(3) : digits
    if (body.length > 4) {
      commit(body.slice(0, 4), body.slice(4, 8))
      return
    }
    commit(middle, digits.slice(0, 4))
  }

  return (
    <div className="flex items-center gap-2">
      <input
        aria-label="전화번호 앞자리"
        value="010"
        readOnly
        tabIndex={-1}
        className="min-h-[52px] w-[74px] rounded-md border border-ink-200 bg-white px-3 text-center text-base font-semibold leading-normal text-ink-900 focus:outline-none"
      />
      <span className="text-ink-400">-</span>
      <input
        id="apply-phone"
        ref={middleRef}
        aria-label="전화번호 가운데 4자리"
        type="tel"
        inputMode="numeric"
        pattern="[0-9]{4}"
        maxLength={4}
        required
        placeholder="0000"
        autoComplete="tel-national"
        value={middle}
        onChange={(e) => handleMiddleChange(e.target.value)}
        className="min-h-[52px] min-w-0 flex-1 rounded-md border border-ink-200 bg-white px-3 text-center text-base leading-normal text-ink-900 transition-colors placeholder:text-ink-400 focus:border-brand-blue focus:outline-none"
      />
      <span className="text-ink-400">-</span>
      <input
        ref={lastRef}
        aria-label="전화번호 끝 4자리"
        type="tel"
        inputMode="numeric"
        pattern="[0-9]{4}"
        maxLength={4}
        required
        placeholder="0000"
        value={last}
        onChange={(e) => handleLastChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Backspace' && last.length === 0) {
            middleRef.current?.focus()
          }
        }}
        className="min-h-[52px] min-w-0 flex-1 rounded-md border border-ink-200 bg-white px-3 text-center text-base leading-normal text-ink-900 transition-colors placeholder:text-ink-400 focus:border-brand-blue focus:outline-none"
      />
      <input type="hidden" name="phone" value={value} />
    </div>
  )
}

function splitPhoneValue(value: string): { middle: string; last: string } {
  const digits = value.replace(/\D/g, '')
  const body = digits.startsWith('010') ? digits.slice(3) : digits
  return {
    middle: body.slice(0, 4),
    last: body.slice(4, 8),
  }
}
