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

import { useState, useEffect, FormEvent, ChangeEvent } from 'react'
import { EditableText } from '@/components/editable/EditableText'
import { pickTextOrUndef, type ContentBlock } from '@/lib/content-blocks'

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
  _hp: '',
}

// 산업 / 지역 옵션 (selectbox)
const INDUSTRY_OPTIONS = ['음식점 · 카페', '소매 · 판매', '서비스 · 뷰티', '기타']
const REGION_OPTIONS = [
  '서울',
  '경기·인천',
  '부산·경남',
  '대구·경북',
  '광주·전라',
  '대전·충청',
  '강원',
  '제주',
]

export function ApplyForm({ blocks }: Props) {
  const [form, setForm] = useState<FormState>(INITIAL)
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // mount 시 URL 에서 utm_* 캐싱 — submit 시 함께 전송 (광고 어트리뷰션용)
  const [utm, setUtm] = useState<Record<string, string>>({})

  useEffect(() => {
    if (typeof window === 'undefined') return
    const sp = new URLSearchParams(window.location.search)
    const u: Record<string, string> = {}
    ;['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(
      (k) => {
        const v = sp.get(k)
        if (v) u[k] = v
      }
    )
    setUtm(u)
  }, [])

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

  // 폼 제출 → /api/consultations POST
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setError(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, ...utm }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? '신청 처리 중 오류가 발생했습니다.')
        return
      }
      // 성공 — sent 토글, form 리셋(다시 신청 시 깨끗한 상태)
      setSent(true)
      setForm(INITIAL)
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
            'radial-gradient(circle, rgba(23, 224, 109, 0.2), transparent 70%)',
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
            <div className="text-center py-10 px-5">
              <div className="text-5xl mb-3">✅</div>
              <h3 className="text-h2">신청이 접수되었습니다</h3>
              <p className="text-ink-500 mt-3 break-keep">
                담당자가 영업일 24시간 내에 연락드릴게요.
                <br />
                감사합니다.
              </p>
              <button
                type="button"
                className="btn btn-ghost mt-5"
                onClick={() => {
                  setSent(false)
                  setError(null)
                }}
              >
                다시 신청하기
              </button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
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
                  <input
                    id="apply-phone"
                    name="phone"
                    type="tel"
                    required
                    placeholder="010-0000-0000"
                    autoComplete="tel"
                    value={form.phone}
                    onChange={onChange}
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
                    {INDUSTRY_OPTIONS.map((o) => (
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
                    {REGION_OPTIONS.map((o) => (
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

              <label className="form-check">
                <input
                  type="checkbox"
                  name="consent_privacy"
                  required
                  checked={form.consent_privacy}
                  onChange={onChange}
                />
                <span>
                  (필수) 개인정보 수집·이용에 동의합니다. 수집된 정보는 상담 목적으로만
                  활용됩니다.
                </span>
              </label>

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
