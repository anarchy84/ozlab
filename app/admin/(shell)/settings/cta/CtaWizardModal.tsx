'use client'

// ─────────────────────────────────────────────
// CtaWizardModal — CTA 폼 빌더 5단계 마법사
//
// Phase 2B :
//   Step 1) 노출 방식 (cta_type)
//   Step 2) 폼 필드 빌더 (form_fields)
//   Step 3) 트리거 (trigger_config) — 즉시/스크롤/시간/이탈
//   Step 4) 디자인 (display_config) — 제목·설명·색·위치
//   Step 5) 페이지 매핑 (page_paths) + UTM·이름 + 저장
//
// 사용 :
//   <CtaWizardModal
//     mode="create" 또는 "edit"
//     initial={ctaButton or undefined}
//     onClose={...}
//     onSaved={(cta) => ...}
//   />
// ─────────────────────────────────────────────

import { useEffect, useState } from 'react'
import {
  CTA_PLACEMENTS,
  CTA_STYLES,
  CTA_TYPES,
  CTA_FIELD_TYPES,
  type CtaButton,
  type CtaButtonInput,
  type CtaFormField,
  type CtaFieldType,
  type CtaPlacement,
  type CtaStyle,
  type CtaType,
  type CtaTriggerConfig,
  type CtaTriggerType,
  type CtaDisplayConfig,
  type CtaPosition,
} from '@/lib/admin/types'
import {
  INDUSTRY_OPTIONS,
  REGION_OPTIONS,
  groupOptionsByField,
  type ConsultationFieldOption,
} from '@/lib/consultation-options'

// ─── 라벨 사전 ────────────────────────────────
const TYPE_LABELS: Record<CtaType, string> = {
  inline_anchor: '인라인 앵커 (스크롤)',
  inline_form: '인라인 폼 (페이지 내 위치)',
  modal_form: '모달 폼 (클릭 시 팝업)',
  floating_button: '플로팅 버튼 (둥둥이)',
  sticky_bar: '고정 띠 (Sticky Bar)',
  toast: '토스트 (슬라이드인)',
}
const TYPE_DESC: Record<CtaType, string> = {
  inline_anchor: '기존 동작 — 클릭 시 #apply 섹션으로 스크롤. 폼·트리거·디자인 무시.',
  inline_form: '페이지 내 특정 위치(placement)에 폼 자체를 인라인으로 배치.',
  modal_form: '버튼 클릭 시 폼 모달이 열림. CTA 별 다른 필드 구성 가능.',
  floating_button: '우하단 떠다니는 둥근 버튼. 클릭 시 모달 폼 표시.',
  sticky_bar: '상단 또는 하단에 고정된 띠. 짧은 카피 + 버튼.',
  toast: '스크롤 도달 또는 시간 경과 시 슬라이드 인 카드. 주의 환기용.',
}
const FIELD_TYPE_LABELS: Record<CtaFieldType, string> = {
  text: '텍스트',
  phone: '전화번호',
  email: '이메일',
  textarea: '여러줄 텍스트',
  select: '선택 (드롭다운)',
  checkbox: '체크박스',
}
const TRIGGER_LABELS: Record<CtaTriggerType, string> = {
  immediate: '즉시',
  scroll_pct: '스크롤 도달 (%)',
  time_sec: '시간 경과 (초)',
  exit_intent: '이탈 시도 시',
}
const POSITIONS: { value: CtaPosition; label: string }[] = [
  { value: 'bottom-right', label: '오른쪽 하단' },
  { value: 'bottom-left', label: '왼쪽 하단' },
  { value: 'top-right', label: '오른쪽 상단' },
  { value: 'top-left', label: '왼쪽 상단' },
  { value: 'top', label: '상단 띠' },
  { value: 'bottom', label: '하단 띠' },
  { value: 'center', label: '중앙' },
]

// ─── 기본 폼 필드 (서버 함수 cta_default_form_fields() 동등) ──
const DEFAULT_FIELDS: CtaFormField[] = [
  { id: 'name', label: '사장님 성함', type: 'text', required: true, placeholder: '홍길동' },
  { id: 'phone', label: '연락처', type: 'phone', required: true, placeholder: '010-0000-0000' },
  { id: 'store_name', label: '매장명', type: 'text', required: false, placeholder: '매장 상호명' },
  { id: 'industry', label: '업종', type: 'select', required: false, options: [...INDUSTRY_OPTIONS] },
  { id: 'region', label: '지역', type: 'select', required: false, options: [...REGION_OPTIONS] },
  { id: 'message', label: '원하시는 구성 / 남기실 말씀', type: 'textarea', required: false, placeholder: '예) 10.1인치 POS 세트 견적 궁금합니다' },
]

// ─── 마법사 상태 타입 ────────────────────────
interface WizardState {
  // 메타
  placement: CtaPlacement
  label: string
  style: CtaStyle
  is_active: boolean
  utm_source: string
  utm_medium: string
  utm_campaign: string
  utm_content: string
  target_href: string
  // Phase 2B
  cta_type: CtaType
  form_fields: CtaFormField[]
  trigger_config: CtaTriggerConfig
  display_config: CtaDisplayConfig
  page_paths: string[] | null
}

function buildInitialState(initial?: CtaButton): WizardState {
  if (initial) {
    return {
      placement: initial.placement,
      label: initial.label,
      style: initial.style,
      is_active: initial.is_active,
      utm_source: initial.utm_source ?? 'site',
      utm_medium: initial.utm_medium ?? 'cta',
      utm_campaign: initial.utm_campaign ?? '',
      utm_content: initial.utm_content ?? '',
      target_href: initial.target_href,
      cta_type: initial.cta_type,
      form_fields: initial.form_fields?.length ? initial.form_fields : DEFAULT_FIELDS,
      trigger_config: initial.trigger_config ?? { type: 'immediate' },
      display_config: initial.display_config ?? {},
      page_paths: initial.page_paths,
    }
  }
  return {
    placement: 'hero',
    label: '',
    style: 'primary',
    is_active: true,
    utm_source: 'site',
    utm_medium: 'cta',
    utm_campaign: '',
    utm_content: '',
    target_href: '#apply',
    cta_type: 'modal_form',
    form_fields: DEFAULT_FIELDS,
    trigger_config: { type: 'immediate' },
    display_config: {
      title: '3분 무료 상담 신청',
      description: '사장님 정보를 남겨주시면 영업일 24시간 내 연락드려요.',
      button_color: '#7C8CFF',
      bg_color: '#0f1115',
      position: 'bottom-right',
      show_close: true,
    },
    page_paths: null,
  }
}

// ─────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────
interface Props {
  mode: 'create' | 'edit'
  initial?: CtaButton
  onClose: () => void
  onSaved: (cta: CtaButton) => void
}

export function CtaWizardModal({ mode, initial, onClose, onSaved }: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1)
  const [state, setState] = useState<WizardState>(() => buildInitialState(initial))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function patch<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setState((s) => ({ ...s, [key]: value }))
  }

  // 마운트 시 1회 — 상담 옵션 마스터 fetch → industry/region 필드 옵션 자동 동기화
  // 어드민이 "상담 옵션 관리"에서 추가한 옵션이 위자드 기본 옵션에도 즉시 반영되도록.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/admin/consultation-options', { cache: 'no-store' })
        if (!res.ok) return
        const rows = (await res.json()) as ConsultationFieldOption[]
        if (cancelled || !Array.isArray(rows)) return
        const grouped = groupOptionsByField(rows)
        const industry = grouped.industry
        const region = grouped.region
        // 기존 form_fields 의 industry/region 옵션만 갱신
        setState((s) => ({
          ...s,
          form_fields: s.form_fields.map((f) => {
            if (f.id === 'industry' && f.type === 'select' && industry.length > 0) {
              return { ...f, options: [...industry] }
            }
            if (f.id === 'region' && f.type === 'select' && region.length > 0) {
              return { ...f, options: [...region] }
            }
            return f
          }),
        }))
      } catch (e) {
        console.warn('[CtaWizard consultation-options]', e)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // 폼 필드는 인라인 앵커일 때 의미 없음
  const skipFormStep = state.cta_type === 'inline_anchor'

  // 트리거는 인라인일 때 무의미
  const skipTriggerStep =
    state.cta_type === 'inline_anchor' || state.cta_type === 'inline_form'

  // 다음 단계 계산
  function nextStep() {
    if (step === 1) return setStep(skipFormStep ? 3 : 2)
    if (step === 2) return setStep(skipTriggerStep ? 4 : 3)
    if (step === 3) return setStep(4)
    if (step === 4) return setStep(5)
  }
  function prevStep() {
    if (step === 5) return setStep(4)
    if (step === 4) return setStep(skipTriggerStep ? 2 : 3)
    if (step === 3) return setStep(skipFormStep ? 1 : 2)
    if (step === 2) return setStep(1)
  }

  async function handleSave() {
    setError(null)
    if (!state.label.trim()) {
      setError('라벨은 필수입니다.')
      setStep(5)
      return
    }
    setSubmitting(true)
    try {
      const payload: Partial<CtaButtonInput> = {
        placement: state.placement,
        label: state.label.trim(),
        target_href: state.target_href.trim() || '#apply',
        style: state.style,
        is_active: state.is_active,
        utm_source: state.utm_source.trim() || null,
        utm_medium: state.utm_medium.trim() || null,
        utm_campaign:
          state.utm_campaign.trim() ||
          `cta_${state.placement}_${Date.now().toString(36)}`,
        utm_content: state.utm_content.trim() || null,
        cta_type: state.cta_type,
        form_fields: state.form_fields,
        trigger_config: state.trigger_config,
        display_config: state.display_config,
        page_paths: state.page_paths,
      }
      const url =
        mode === 'create'
          ? '/api/admin/cta'
          : `/api/admin/cta/${initial!.id}`
      const method = mode === 'create' ? 'POST' : 'PATCH'
      const res = await fetch(url, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const j = (await res.json()) as { error?: string }
        throw new Error(j.error ?? `HTTP ${res.status}`)
      }
      const j = (await res.json()) as { cta: CtaButton }
      onSaved(j.cta)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  // ─── 렌더 ──
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-surface-darkSoft border border-ink-700 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-ink-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-ink-100">
              {mode === 'create' ? '새 CTA 만들기' : `CTA #${initial?.id} 편집`}
            </h3>
            <div className="mt-1 text-xs text-ink-400">
              {step}/5 — {step === 1 && '노출 방식'}
              {step === 2 && '폼 필드'}
              {step === 3 && '트리거'}
              {step === 4 && '디자인'}
              {step === 5 && '메타·저장'}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-400 hover:text-ink-100 text-2xl leading-none"
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-6 text-sm">
          {step === 1 && <Step1Type state={state} patch={patch} />}
          {step === 2 && <Step2Fields state={state} patch={patch} />}
          {step === 3 && <Step3Trigger state={state} patch={patch} />}
          {step === 4 && <Step4Design state={state} patch={patch} />}
          {step === 5 && <Step5Meta state={state} patch={patch} />}
        </div>

        {/* 에러 */}
        {error && (
          <div className="px-6 py-2 border-t border-red-800/50 bg-red-900/20 text-xs text-red-300">
            {error}
          </div>
        )}

        {/* 푸터 */}
        <div className="px-6 py-4 border-t border-ink-700 flex justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm border border-ink-700 text-ink-200 rounded hover:bg-ink-800"
          >
            취소
          </button>
          <div className="flex gap-2">
            {step > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="px-3 py-1.5 text-sm border border-ink-700 text-ink-200 rounded hover:bg-ink-800"
              >
                ← 이전
              </button>
            )}
            {step < 5 ? (
              <button
                type="button"
                onClick={nextStep}
                className="px-4 py-1.5 text-sm bg-brand-blue text-white rounded hover:bg-brand-dark"
              >
                다음 →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                disabled={submitting}
                className="px-4 py-1.5 text-sm bg-brand-blue text-white rounded hover:bg-brand-dark disabled:opacity-50"
              >
                {submitting ? '저장 중…' : '💾 저장'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Step 1) 노출 방식
// ─────────────────────────────────────────────
function Step1Type({
  state,
  patch,
}: {
  state: WizardState
  patch: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void
}) {
  return (
    <div className="space-y-3">
      <p className="text-ink-400">CTA 가 사용자에게 어떻게 보여질지 선택하세요.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        {CTA_TYPES.map((t) => {
          const selected = state.cta_type === t
          return (
            <button
              key={t}
              type="button"
              onClick={() => patch('cta_type', t)}
              className={`text-left p-4 rounded border transition-colors ${
                selected
                  ? 'border-brand-blue bg-brand-blue/10'
                  : 'border-ink-700 hover:border-ink-500 bg-ink-900'
              }`}
            >
              <div className="font-semibold text-ink-100">{TYPE_LABELS[t]}</div>
              <div className="mt-1 text-xs text-ink-400">{TYPE_DESC[t]}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Step 2) 폼 필드 빌더
// ─────────────────────────────────────────────
function Step2Fields({
  state,
  patch,
}: {
  state: WizardState
  patch: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void
}) {
  const fields = state.form_fields

  function addField() {
    const newField: CtaFormField = {
      id: `field_${fields.length + 1}`,
      label: '새 필드',
      type: 'text',
      required: false,
    }
    patch('form_fields', [...fields, newField])
  }
  function updateField(idx: number, patcher: Partial<CtaFormField>) {
    patch(
      'form_fields',
      fields.map((f, i) => (i === idx ? { ...f, ...patcher } : f)),
    )
  }
  function removeField(idx: number) {
    patch('form_fields', fields.filter((_, i) => i !== idx))
  }
  function moveField(idx: number, dir: -1 | 1) {
    const tgt = idx + dir
    if (tgt < 0 || tgt >= fields.length) return
    const next = [...fields]
    ;[next[idx], next[tgt]] = [next[tgt], next[idx]]
    patch('form_fields', next)
  }
  function resetDefault() {
    if (!confirm('기본 6필드로 초기화할까요? 현재 필드는 사라집니다.')) return
    patch('form_fields', DEFAULT_FIELDS)
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-ink-400">사용자에게 받을 입력 필드를 정의합니다.</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={resetDefault}
            className="text-xs px-2 py-1 border border-ink-700 rounded hover:bg-ink-800 text-ink-300"
          >
            기본값 복원
          </button>
          <button
            type="button"
            onClick={addField}
            className="text-xs px-2 py-1 bg-brand-blue text-white rounded hover:bg-brand-dark"
          >
            + 필드 추가
          </button>
        </div>
      </div>

      {fields.length === 0 && (
        <div className="text-center py-8 text-ink-500 border border-dashed border-ink-700 rounded">
          필드가 없습니다. + 필드 추가 클릭.
        </div>
      )}

      <div className="space-y-2">
        {fields.map((f, i) => (
          <div
            key={i}
            className="border border-ink-700 rounded p-3 bg-ink-900/40 space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-ink-500 font-mono">#{i + 1}</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => moveField(i, -1)}
                  disabled={i === 0}
                  className="text-xs px-1.5 py-0.5 text-ink-400 hover:text-ink-100 disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveField(i, 1)}
                  disabled={i === fields.length - 1}
                  className="text-xs px-1.5 py-0.5 text-ink-400 hover:text-ink-100 disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeField(i)}
                  className="text-xs px-1.5 py-0.5 text-red-400 hover:text-red-300"
                >
                  삭제
                </button>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-2">
              <input
                type="text"
                value={f.id}
                onChange={(e) => updateField(i, { id: e.target.value })}
                placeholder="id (영문)"
                className="col-span-3 px-2 py-1 text-xs font-mono bg-ink-900 border border-ink-700 text-ink-100 rounded"
              />
              <input
                type="text"
                value={f.label}
                onChange={(e) => updateField(i, { label: e.target.value })}
                placeholder="라벨"
                className="col-span-4 px-2 py-1 text-sm bg-ink-900 border border-ink-700 text-ink-100 rounded"
              />
              <select
                value={f.type}
                onChange={(e) =>
                  updateField(i, { type: e.target.value as CtaFieldType })
                }
                className="col-span-3 px-2 py-1 text-xs bg-ink-900 border border-ink-700 text-ink-100 rounded"
              >
                {CTA_FIELD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {FIELD_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
              <label className="col-span-2 flex items-center justify-center gap-1 text-xs text-ink-300">
                <input
                  type="checkbox"
                  checked={!!f.required}
                  onChange={(e) =>
                    updateField(i, { required: e.target.checked })
                  }
                />
                필수
              </label>
            </div>

            <input
              type="text"
              value={f.placeholder ?? ''}
              onChange={(e) => updateField(i, { placeholder: e.target.value })}
              placeholder="placeholder (선택)"
              className="w-full px-2 py-1 text-xs bg-ink-900 border border-ink-700 text-ink-100 rounded"
            />

            {f.type === 'select' && (
              <input
                type="text"
                value={(f.options ?? []).join('|')}
                onChange={(e) =>
                  updateField(i, {
                    options: e.target.value
                      .split('|')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="옵션을 | 로 구분  예) 옵션A|옵션B|옵션C"
                className="w-full px-2 py-1 text-xs bg-ink-900 border border-ink-700 text-ink-100 rounded"
              />
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-ink-500">
        💡 표준 필드 ID(<code>name, phone, store_name, industry, region, message</code>)는 자동으로 표준 컬럼에 저장돼서 기존 분석/CSV 와 호환됩니다.
        그 외 ID 는 <code>custom_fields</code> jsonb 에 저장됩니다.
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────
// Step 3) 트리거
// ─────────────────────────────────────────────
function Step3Trigger({
  state,
  patch,
}: {
  state: WizardState
  patch: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void
}) {
  const tc = state.trigger_config
  const types: CtaTriggerType[] = ['immediate', 'scroll_pct', 'time_sec', 'exit_intent']

  return (
    <div className="space-y-3">
      <p className="text-ink-400">CTA 가 언제 사용자에게 노출될지 선택하세요.</p>

      <div className="grid sm:grid-cols-2 gap-2">
        {types.map((t) => {
          const selected = tc.type === t
          return (
            <button
              key={t}
              type="button"
              onClick={() => {
                const defaultValue = t === 'scroll_pct' ? 50 : t === 'time_sec' ? 30 : undefined
                patch('trigger_config', { type: t, value: defaultValue })
              }}
              className={`p-3 rounded border text-left ${
                selected
                  ? 'border-brand-blue bg-brand-blue/10'
                  : 'border-ink-700 hover:border-ink-500 bg-ink-900'
              }`}
            >
              <div className="font-semibold text-ink-100 text-sm">{TRIGGER_LABELS[t]}</div>
            </button>
          )
        })}
      </div>

      {(tc.type === 'scroll_pct' || tc.type === 'time_sec') && (
        <label className="block text-sm">
          <span className="text-ink-200">{tc.type === 'scroll_pct' ? '도달 비율 (%)' : '경과 시간 (초)'}</span>
          <input
            type="number"
            min={1}
            max={tc.type === 'scroll_pct' ? 100 : 600}
            value={tc.value ?? ''}
            onChange={(e) =>
              patch('trigger_config', {
                type: tc.type,
                value: parseInt(e.target.value, 10) || 0,
              })
            }
            className="mt-1 w-32 px-2 py-1 text-sm bg-ink-900 border border-ink-700 text-ink-100 rounded"
          />
        </label>
      )}

      {tc.type === 'exit_intent' && (
        <p className="text-xs text-ink-500">
          데스크톱에서만 동작 (마우스가 화면 상단을 벗어나려는 순간 감지). 모바일은 immediate 처럼 동작.
        </p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Step 4) 디자인
// ─────────────────────────────────────────────
function Step4Design({
  state,
  patch,
}: {
  state: WizardState
  patch: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void
}) {
  const dc = state.display_config

  function update<K extends keyof CtaDisplayConfig>(k: K, v: CtaDisplayConfig[K]) {
    patch('display_config', { ...dc, [k]: v })
  }

  return (
    <div className="space-y-3">
      <p className="text-ink-400">제목/설명/색상/위치를 조정합니다. (인라인 앵커는 무시)</p>

      <label className="block text-sm">
        <span className="text-ink-200">제목</span>
        <input
          type="text"
          value={dc.title ?? ''}
          onChange={(e) => update('title', e.target.value)}
          placeholder="예) 3분만에 무료 견적"
          className="mt-1 w-full px-2 py-1.5 text-sm bg-ink-900 border border-ink-700 text-ink-100 rounded"
        />
      </label>

      <label className="block text-sm">
        <span className="text-ink-200">설명</span>
        <textarea
          rows={2}
          value={dc.description ?? ''}
          onChange={(e) => update('description', e.target.value)}
          placeholder="예) 사장님 정보를 남겨주시면 영업일 24시간 내 연락드려요."
          className="mt-1 w-full px-2 py-1.5 text-sm bg-ink-900 border border-ink-700 text-ink-100 rounded"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="text-ink-200">버튼 색상</span>
          <input
            type="color"
            value={dc.button_color ?? '#7C8CFF'}
            onChange={(e) => update('button_color', e.target.value)}
            className="mt-1 w-full h-9 bg-ink-900 border border-ink-700 rounded cursor-pointer"
          />
        </label>
        <label className="block text-sm">
          <span className="text-ink-200">배경 색상</span>
          <input
            type="color"
            value={dc.bg_color ?? '#0f1115'}
            onChange={(e) => update('bg_color', e.target.value)}
            className="mt-1 w-full h-9 bg-ink-900 border border-ink-700 rounded cursor-pointer"
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="text-ink-200">위치</span>
        <select
          value={dc.position ?? 'bottom-right'}
          onChange={(e) => update('position', e.target.value as CtaPosition)}
          className="mt-1 w-full px-2 py-1.5 text-sm bg-ink-900 border border-ink-700 text-ink-100 rounded"
        >
          {POSITIONS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <span className="text-xs text-ink-500">플로팅·토스트·sticky 에서만 의미</span>
      </label>

      <label className="flex items-center gap-2 text-sm text-ink-200">
        <input
          type="checkbox"
          checked={dc.show_close ?? true}
          onChange={(e) => update('show_close', e.target.checked)}
        />
        닫기 버튼 (×) 표시
      </label>
    </div>
  )
}

// ─────────────────────────────────────────────
// Step 5) 메타 (이름/UTM/페이지/스타일/저장)
// ─────────────────────────────────────────────
function Step5Meta({
  state,
  patch,
}: {
  state: WizardState
  patch: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void
}) {
  return (
    <div className="space-y-3">
      <p className="text-ink-400">최종 메타 정보를 입력하고 저장합니다.</p>

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="text-ink-200">라벨 *</span>
          <input
            type="text"
            value={state.label}
            onChange={(e) => patch('label', e.target.value)}
            placeholder="예) 무료 상담 받기"
            className="mt-1 w-full px-2 py-1.5 text-sm bg-ink-900 border border-ink-700 text-ink-100 rounded"
          />
        </label>
        <label className="block text-sm">
          <span className="text-ink-200">위치 (placement)</span>
          <select
            value={state.placement}
            onChange={(e) => patch('placement', e.target.value as CtaPlacement)}
            className="mt-1 w-full px-2 py-1.5 text-sm bg-ink-900 border border-ink-700 text-ink-100 rounded"
          >
            {CTA_PLACEMENTS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="text-ink-200">스타일</span>
          <select
            value={state.style}
            onChange={(e) => patch('style', e.target.value as CtaStyle)}
            className="mt-1 w-full px-2 py-1.5 text-sm bg-ink-900 border border-ink-700 text-ink-100 rounded"
          >
            {CTA_STYLES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-ink-200">목적지 (target_href)</span>
          <input
            type="text"
            value={state.target_href}
            onChange={(e) => patch('target_href', e.target.value)}
            className="mt-1 w-full px-2 py-1.5 text-sm font-mono bg-ink-900 border border-ink-700 text-ink-100 rounded"
          />
          <span className="text-xs text-ink-500">inline_anchor 일 때만 의미. 폼 타입은 자체적으로 폼 표시.</span>
        </label>
      </div>

      <fieldset className="border border-ink-700 rounded p-3 space-y-2">
        <legend className="text-xs text-ink-400 px-1">UTM 어트리뷰션</legend>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            value={state.utm_source}
            onChange={(e) => patch('utm_source', e.target.value)}
            placeholder="utm_source"
            className="px-2 py-1 text-xs font-mono bg-ink-900 border border-ink-700 text-ink-100 rounded"
          />
          <input
            type="text"
            value={state.utm_medium}
            onChange={(e) => patch('utm_medium', e.target.value)}
            placeholder="utm_medium"
            className="px-2 py-1 text-xs font-mono bg-ink-900 border border-ink-700 text-ink-100 rounded"
          />
          <input
            type="text"
            value={state.utm_campaign}
            onChange={(e) => patch('utm_campaign', e.target.value)}
            placeholder="utm_campaign (자동생성 가능)"
            className="px-2 py-1 text-xs font-mono bg-ink-900 border border-ink-700 text-ink-100 rounded"
          />
          <input
            type="text"
            value={state.utm_content}
            onChange={(e) => patch('utm_content', e.target.value)}
            placeholder="utm_content"
            className="px-2 py-1 text-xs font-mono bg-ink-900 border border-ink-700 text-ink-100 rounded"
          />
        </div>
      </fieldset>

      <label className="block text-sm">
        <span className="text-ink-200">노출 페이지 경로 (선택)</span>
        <input
          type="text"
          value={(state.page_paths ?? []).join(', ')}
          onChange={(e) => {
            const arr = e.target.value
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
            patch('page_paths', arr.length > 0 ? arr : null)
          }}
          placeholder="예) /, /blog, /blog/*  (빈칸 = 모든 페이지)"
          className="mt-1 w-full px-2 py-1.5 text-xs font-mono bg-ink-900 border border-ink-700 text-ink-100 rounded"
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-ink-200">
        <input
          type="checkbox"
          checked={state.is_active}
          onChange={(e) => patch('is_active', e.target.checked)}
        />
        활성화 (저장 즉시 노출)
      </label>
    </div>
  )
}
