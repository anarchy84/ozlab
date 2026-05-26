'use client'

import { useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminGuard } from '@/hooks/useAdminGuard'
import {
  getDefaultLandingModuleContent,
  LANDING_MODULE_LABELS,
  LANDING_MODULE_TYPES,
  type LandingCardContent,
  type LandingFaqContent,
  type LandingModuleContent,
  type LandingModuleType,
  type LandingSlotItem,
} from '@/lib/landing-sections'
import { LandingModuleRenderer } from '@/components/landing/LandingModuleRenderer'

interface Props {
  pagePath: string
  slotKey: string
  label: string
  items?: LandingSlotItem[]
}

interface Draft {
  id?: string
  item_type: LandingModuleType
  title: string
  content: LandingModuleContent
  sort_order?: number
  variant_key: string
  traffic_weight: number
  experiment_key: string
  note: string
}

const fieldClass =
  'w-full rounded-lg border border-ink-150 bg-white px-3 py-2.5 text-sm text-ink-900 outline-none transition-colors placeholder:text-ink-300 focus:border-[#03C75A] focus:ring-2 focus:ring-[#03C75A]/15'

const labelClass = 'text-xs font-extrabold uppercase tracking-[0.12em] text-ink-500'

function sortItems(items: LandingSlotItem[]) {
  return [...items].sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id))
}

function createDraft(type: LandingModuleType, sortOrder: number): Draft {
  const content = getDefaultLandingModuleContent(type)
  return {
    item_type: type,
    title: content.title ?? LANDING_MODULE_LABELS[type],
    content,
    sort_order: sortOrder,
    variant_key: 'A',
    traffic_weight: 100,
    experiment_key: '',
    note: '',
  }
}

function draftFromItem(item: LandingSlotItem): Draft {
  return {
    id: item.id,
    item_type: item.item_type,
    title: item.title ?? item.content.title ?? LANDING_MODULE_LABELS[item.item_type],
    content: item.content,
    sort_order: item.sort_order,
    variant_key: item.variant_key,
    traffic_weight: item.traffic_weight,
    experiment_key: item.experiment_key ?? '',
    note: item.note ?? '',
  }
}

function clampWeight(value: number) {
  if (!Number.isFinite(value)) return 100
  return Math.max(0, Math.min(100, Math.round(value)))
}

function rowsFromBody(value?: string) {
  return Math.max(4, Math.min(10, (value?.split('\n').length ?? 2) + 2))
}

export function LandingSlot({ pagePath, slotKey, label, items = [] }: Props) {
  const router = useRouter()
  const admin = useAdminGuard()
  const orderedItems = useMemo(() => sortItems(items), [items])
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nextSortOrder =
    orderedItems.length > 0 ? Math.max(...orderedItems.map((item) => item.sort_order)) + 10 : 10

  async function requestJson(url: string, init: RequestInit) {
    const response = await fetch(url, {
      ...init,
      headers: init.body instanceof FormData
        ? init.headers
        : { 'content-type': 'application/json', ...(init.headers ?? {}) },
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(payload?.error ?? '요청 처리 중 오류가 발생했습니다.')
    }
    return payload
  }

  async function saveDraft() {
    if (!draft) return
    setSaving(true)
    setError(null)
    try {
      const method = draft.id ? 'PATCH' : 'POST'
      await requestJson('/api/admin/landing-sections', {
        method,
        body: JSON.stringify({
          id: draft.id,
          page_path: pagePath,
          slot_key: slotKey,
          item_type: draft.item_type,
          title: draft.title.trim() || null,
          content: draft.content,
          sort_order: draft.sort_order ?? nextSortOrder,
          variant_key: draft.variant_key.trim() || 'A',
          traffic_weight: clampWeight(draft.traffic_weight),
          experiment_key: draft.experiment_key.trim() || null,
          note: draft.note.trim() || null,
        }),
      })
      setDraft(null)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteItem(item: LandingSlotItem) {
    const ok = window.confirm('이 섹션을 삭제할까요? 삭제 후에는 복구하기 어렵습니다.')
    if (!ok) return
    setSaving(true)
    setError(null)
    try {
      await requestJson('/api/admin/landing-sections', {
        method: 'DELETE',
        body: JSON.stringify({ id: item.id, page_path: pagePath }),
      })
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  async function moveItem(item: LandingSlotItem, direction: -1 | 1) {
    const index = orderedItems.findIndex((candidate) => candidate.id === item.id)
    const target = orderedItems[index + direction]
    if (!target) return

    setSaving(true)
    setError(null)
    try {
      await Promise.all([
        requestJson('/api/admin/landing-sections', {
          method: 'PATCH',
          body: JSON.stringify({ id: item.id, page_path: pagePath, sort_order: target.sort_order }),
        }),
        requestJson('/api/admin/landing-sections', {
          method: 'PATCH',
          body: JSON.stringify({ id: target.id, page_path: pagePath, sort_order: item.sort_order }),
        }),
      ])
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '순서 변경에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const showBuilder = admin.isAdmin

  if (!showBuilder && orderedItems.length === 0) return null

  return (
    <div data-landing-slot-shell={slotKey} className="relative">
      {showBuilder && (
        <div className="container-oz py-5">
          <div className="rounded-lg border border-dashed border-[#03C75A]/35 bg-[#F2FFF7] p-4 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-extrabold text-[#008F3F]">랜딩 섹션 빌더 · {label}</p>
                <p className="mt-1 text-xs text-ink-500">
                  raw HTML 없이 안전한 템플릿 섹션을 추가, 수정, 순서 변경할 수 있습니다.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {LANDING_MODULE_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setDraft(createDraft(type, nextSortOrder))}
                    className="btn btn-ghost sm bg-white"
                  >
                    + {LANDING_MODULE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>
            {error && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
                {error}
              </p>
            )}
          </div>
        </div>
      )}

      {orderedItems.map((item, index) => (
        <div key={item.id} className="relative">
          {showBuilder && (
            <div className="container-oz">
              <div className="mb-[-12px] flex flex-wrap items-center justify-end gap-2">
                <span className="rounded-pill bg-[#020806] px-3 py-1 text-xs font-bold text-white shadow-sm">
                  {LANDING_MODULE_LABELS[item.item_type]} · {label}
                </span>
                <button
                  type="button"
                  onClick={() => moveItem(item, -1)}
                  disabled={index === 0 || saving}
                  className="btn btn-ghost sm bg-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  위로
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(item, 1)}
                  disabled={index === orderedItems.length - 1 || saving}
                  className="btn btn-ghost sm bg-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  아래로
                </button>
                <button
                  type="button"
                  onClick={() => setDraft(draftFromItem(item))}
                  className="btn btn-primary sm"
                >
                  편집
                </button>
                <button
                  type="button"
                  onClick={() => deleteItem(item)}
                  disabled={saving}
                  className="btn btn-ghost sm bg-white text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  삭제
                </button>
              </div>
            </div>
          )}
          <LandingModuleRenderer item={item} showPlaceholders={showBuilder} />
        </div>
      ))}

      {draft && (
        <LandingModuleEditor
          draft={draft}
          setDraft={setDraft}
          onClose={() => setDraft(null)}
          onSave={saveDraft}
          saving={saving}
          error={error}
          pagePath={pagePath}
          slotKey={slotKey}
        />
      )}
    </div>
  )
}

function LandingModuleEditor({
  draft,
  setDraft,
  onClose,
  onSave,
  saving,
  error,
  pagePath,
  slotKey,
}: {
  draft: Draft
  setDraft: Dispatch<SetStateAction<Draft | null>>
  onClose: () => void
  onSave: () => void
  saving: boolean
  error: string | null
  pagePath: string
  slotKey: string
}) {
  const [uploading, setUploading] = useState(false)

  function updateDraft(patch: Partial<Draft>) {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev))
  }

  function updateContent(patch: Partial<LandingModuleContent>) {
    setDraft((prev) => (prev ? { ...prev, content: { ...prev.content, ...patch } } : prev))
  }

  async function uploadImage(file: File | null) {
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('path_prefix', `landing-sections/${pagePath}/${slotKey}`)
      const response = await fetch('/api/admin/content-blocks/upload', {
        method: 'POST',
        body: formData,
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? '이미지 업로드 실패')
      updateContent({
        imageUrl: payload.url,
        imageAlt: draft.content.imageAlt || file.name,
      })
    } catch (err) {
      window.alert(err instanceof Error ? err.message : '이미지 업로드에 실패했습니다.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-ink-900/60 px-4 py-6 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-[960px] flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-ink-100 px-5 py-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-deep">
              Landing Section Builder
            </p>
            <h2 className="mt-1 text-xl font-extrabold text-ink-900">
              {draft.id ? '섹션 편집' : '섹션 추가'}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost sm">
            닫기
          </button>
        </div>

        <div className="grid flex-1 overflow-y-auto lg:grid-cols-[1fr_0.86fr]">
          <div className="space-y-5 p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="모듈 타입">
                <select
                  value={draft.item_type}
                  onChange={(event) => {
                    const nextType = event.target.value as LandingModuleType
                    const nextContent = getDefaultLandingModuleContent(nextType)
                    updateDraft({
                      item_type: nextType,
                      title: nextContent.title ?? LANDING_MODULE_LABELS[nextType],
                      content: nextContent,
                    })
                  }}
                  className={fieldClass}
                >
                  {LANDING_MODULE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {LANDING_MODULE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="관리용 제목">
                <input
                  value={draft.title}
                  onChange={(event) => updateDraft({ title: event.target.value })}
                  className={fieldClass}
                  placeholder="관리자가 구분할 제목"
                />
              </Field>
            </div>

            <ModuleFields
              draft={draft}
              updateContent={updateContent}
              uploadImage={uploadImage}
              uploading={uploading}
            />

            <div className="grid gap-4 rounded-lg border border-ink-100 bg-ink-50 p-4 md:grid-cols-3">
              <Field label="A/B 실험 키">
                <input
                  value={draft.experiment_key}
                  onChange={(event) => updateDraft({ experiment_key: event.target.value })}
                  className={fieldClass}
                  placeholder="예: hero_offer_test"
                />
              </Field>
              <Field label="변형">
                <input
                  value={draft.variant_key}
                  onChange={(event) => updateDraft({ variant_key: event.target.value })}
                  className={fieldClass}
                  placeholder="A"
                />
              </Field>
              <Field label="가중치">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={draft.traffic_weight}
                  onChange={(event) => updateDraft({ traffic_weight: Number(event.target.value) })}
                  className={fieldClass}
                />
              </Field>
              <div className="md:col-span-3">
                <Field label="메모">
                  <input
                    value={draft.note}
                    onChange={(event) => updateDraft({ note: event.target.value })}
                    className={fieldClass}
                    placeholder="캠페인 목적, 테스트 메모 등"
                  />
                </Field>
              </div>
            </div>

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                {error}
              </p>
            )}
          </div>

          <div className="border-t border-ink-100 bg-ink-50 p-5 lg:border-l lg:border-t-0">
            <p className="mb-3 text-sm font-extrabold text-ink-700">미리보기</p>
            <div className="overflow-hidden rounded-lg border border-ink-150 bg-white">
              <LandingModuleRenderer
                item={{
                  id: draft.id ?? 'preview',
                  page_path: pagePath,
                  slot_key: slotKey,
                  item_type: draft.item_type,
                  title: draft.title || null,
                  content: draft.content,
                  sort_order: draft.sort_order ?? 0,
                  is_active: true,
                  variant_key: draft.variant_key || 'A',
                  traffic_weight: draft.traffic_weight,
                  experiment_key: draft.experiment_key || null,
                  note: draft.note || null,
                }}
                showPlaceholders
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-ink-100 px-5 py-4">
          <button type="button" onClick={onClose} className="btn btn-ghost">
            취소
          </button>
          <button type="button" onClick={onSave} disabled={saving} className="btn btn-primary">
            {saving ? '저장 중' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  )
}

function ModuleFields({
  draft,
  updateContent,
  uploadImage,
  uploading,
}: {
  draft: Draft
  updateContent: (patch: Partial<LandingModuleContent>) => void
  uploadImage: (file: File | null) => void
  uploading: boolean
}) {
  const content = draft.content

  if (draft.item_type === 'text') {
    return (
      <div className="space-y-4">
        <Field label="작은 제목">
          <input
            value={content.eyebrow ?? ''}
            onChange={(event) => updateContent({ eyebrow: event.target.value })}
            className={fieldClass}
          />
        </Field>
        <Field label="제목">
          <input
            value={content.title ?? ''}
            onChange={(event) => updateContent({ title: event.target.value })}
            className={fieldClass}
          />
        </Field>
        <Field label="본문">
          <textarea
            value={content.body ?? ''}
            onChange={(event) => updateContent({ body: event.target.value })}
            rows={rowsFromBody(content.body)}
            className={fieldClass}
          />
        </Field>
        <Field label="정렬">
          <select
            value={content.align ?? 'left'}
            onChange={(event) => updateContent({ align: event.target.value as 'left' | 'center' })}
            className={fieldClass}
          >
            <option value="left">왼쪽</option>
            <option value="center">가운데</option>
          </select>
        </Field>
      </div>
    )
  }

  if (draft.item_type === 'image') {
    return (
      <ImageFields
        content={content}
        updateContent={updateContent}
        uploadImage={uploadImage}
        uploading={uploading}
        showTitle
      />
    )
  }

  if (draft.item_type === 'split') {
    return (
      <div className="space-y-4">
        <Field label="작은 제목">
          <input
            value={content.eyebrow ?? ''}
            onChange={(event) => updateContent({ eyebrow: event.target.value })}
            className={fieldClass}
          />
        </Field>
        <Field label="제목">
          <input
            value={content.title ?? ''}
            onChange={(event) => updateContent({ title: event.target.value })}
            className={fieldClass}
          />
        </Field>
        <Field label="본문">
          <textarea
            value={content.body ?? ''}
            onChange={(event) => updateContent({ body: event.target.value })}
            rows={rowsFromBody(content.body)}
            className={fieldClass}
          />
        </Field>
        <ImageFields
          content={content}
          updateContent={updateContent}
          uploadImage={uploadImage}
          uploading={uploading}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="버튼 문구">
            <input
              value={content.buttonLabel ?? ''}
              onChange={(event) => updateContent({ buttonLabel: event.target.value })}
              className={fieldClass}
            />
          </Field>
          <Field label="버튼 링크">
            <input
              value={content.buttonHref ?? ''}
              onChange={(event) => updateContent({ buttonHref: event.target.value })}
              className={fieldClass}
            />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm font-bold text-ink-700">
          <input
            type="checkbox"
            checked={content.reverse === true}
            onChange={(event) => updateContent({ reverse: event.target.checked })}
            className="h-4 w-4 accent-[#03C75A]"
          />
          이미지와 텍스트 위치 반전
        </label>
      </div>
    )
  }

  if (draft.item_type === 'cards') {
    return (
      <CardsFields
        eyebrow={content.eyebrow ?? ''}
        title={content.title ?? ''}
        cards={content.cards ?? []}
        updateContent={updateContent}
      />
    )
  }

  if (draft.item_type === 'cta') {
    return (
      <div className="space-y-4">
        <Field label="작은 제목">
          <input
            value={content.eyebrow ?? ''}
            onChange={(event) => updateContent({ eyebrow: event.target.value })}
            className={fieldClass}
          />
        </Field>
        <Field label="제목">
          <input
            value={content.title ?? ''}
            onChange={(event) => updateContent({ title: event.target.value })}
            className={fieldClass}
          />
        </Field>
        <Field label="본문">
          <textarea
            value={content.body ?? ''}
            onChange={(event) => updateContent({ body: event.target.value })}
            rows={rowsFromBody(content.body)}
            className={fieldClass}
          />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="버튼 문구">
            <input
              value={content.buttonLabel ?? ''}
              onChange={(event) => updateContent({ buttonLabel: event.target.value })}
              className={fieldClass}
            />
          </Field>
          <Field label="버튼 링크">
            <input
              value={content.buttonHref ?? ''}
              onChange={(event) => updateContent({ buttonHref: event.target.value })}
              className={fieldClass}
            />
          </Field>
        </div>
      </div>
    )
  }

  return <FaqFields title={content.title ?? ''} faqs={content.faqs ?? []} updateContent={updateContent} />
}

function ImageFields({
  content,
  updateContent,
  uploadImage,
  uploading,
  showTitle = false,
}: {
  content: LandingModuleContent
  updateContent: (patch: Partial<LandingModuleContent>) => void
  uploadImage: (file: File | null) => void
  uploading: boolean
  showTitle?: boolean
}) {
  return (
    <div className="space-y-4">
      {showTitle && (
        <Field label="제목">
          <input
            value={content.title ?? ''}
            onChange={(event) => updateContent({ title: event.target.value })}
            className={fieldClass}
          />
        </Field>
      )}
      <Field label="이미지 업로드">
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={(event) => uploadImage(event.target.files?.[0] ?? null)}
          className={fieldClass}
          disabled={uploading}
        />
      </Field>
      <Field label="이미지 URL">
        <input
          value={content.imageUrl ?? ''}
          onChange={(event) => updateContent({ imageUrl: event.target.value })}
          className={fieldClass}
          placeholder={uploading ? '업로드 중...' : 'https://'}
        />
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="대체 텍스트">
          <input
            value={content.imageAlt ?? ''}
            onChange={(event) => updateContent({ imageAlt: event.target.value })}
            className={fieldClass}
          />
        </Field>
        <Field label="캡션">
          <input
            value={content.caption ?? ''}
            onChange={(event) => updateContent({ caption: event.target.value })}
            className={fieldClass}
          />
        </Field>
      </div>
    </div>
  )
}

function CardsFields({
  eyebrow,
  title,
  cards,
  updateContent,
}: {
  eyebrow: string
  title: string
  cards: LandingCardContent[]
  updateContent: (patch: Partial<LandingModuleContent>) => void
}) {
  function updateCard(index: number, patch: LandingCardContent) {
    updateContent({
      cards: cards.map((card, cardIndex) => (cardIndex === index ? { ...card, ...patch } : card)),
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="작은 제목">
          <input
            value={eyebrow}
            onChange={(event) => updateContent({ eyebrow: event.target.value })}
            className={fieldClass}
            placeholder="BENEFITS"
          />
        </Field>
        <Field label="섹션 제목">
          <input
            value={title}
            onChange={(event) => updateContent({ title: event.target.value })}
            className={fieldClass}
            placeholder="핵심 혜택을 입력하세요."
          />
        </Field>
      </div>
      <div className="space-y-3">
        {cards.map((card, index) => (
          <div key={`card-field-${index}`} className="rounded-lg border border-ink-100 bg-ink-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-extrabold text-ink-700">카드 {index + 1}</p>
              <button
                type="button"
                onClick={() => updateContent({ cards: cards.filter((_, cardIndex) => cardIndex !== index) })}
                className="text-sm font-bold text-red-600"
              >
                삭제
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="카드 제목">
                <input
                  value={card.title ?? ''}
                  onChange={(event) => updateCard(index, { title: event.target.value })}
                  className={fieldClass}
                />
              </Field>
              <Field label="카드 설명">
                <input
                  value={card.body ?? ''}
                  onChange={(event) => updateCard(index, { body: event.target.value })}
                  className={fieldClass}
                />
              </Field>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => updateContent({ cards: [...cards, { title: '새 카드', body: '설명을 입력하세요.' }] })}
          className="btn btn-ghost sm"
        >
          카드 추가
        </button>
      </div>
    </div>
  )
}

function FaqFields({
  title,
  faqs,
  updateContent,
}: {
  title: string
  faqs: LandingFaqContent[]
  updateContent: (patch: Partial<LandingModuleContent>) => void
}) {
  function updateFaq(index: number, patch: LandingFaqContent) {
    updateContent({
      faqs: faqs.map((faq, faqIndex) => (faqIndex === index ? { ...faq, ...patch } : faq)),
    })
  }

  return (
    <div className="space-y-4">
      <Field label="섹션 제목">
        <input
          value={title}
          onChange={(event) => updateContent({ title: event.target.value })}
          className={fieldClass}
        />
      </Field>
      <div className="space-y-3">
        {faqs.map((faq, index) => (
          <div key={`faq-field-${index}`} className="rounded-lg border border-ink-100 bg-ink-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-extrabold text-ink-700">FAQ {index + 1}</p>
              <button
                type="button"
                onClick={() => updateContent({ faqs: faqs.filter((_, faqIndex) => faqIndex !== index) })}
                className="text-sm font-bold text-red-600"
              >
                삭제
              </button>
            </div>
            <div className="space-y-3">
              <Field label="질문">
                <input
                  value={faq.q ?? ''}
                  onChange={(event) => updateFaq(index, { q: event.target.value })}
                  className={fieldClass}
                />
              </Field>
              <Field label="답변">
                <textarea
                  value={faq.a ?? ''}
                  onChange={(event) => updateFaq(index, { a: event.target.value })}
                  rows={3}
                  className={fieldClass}
                />
              </Field>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => updateContent({ faqs: [...faqs, { q: '새 질문', a: '답변을 입력하세요.' }] })}
          className="btn btn-ghost sm"
        >
          FAQ 추가
        </button>
      </div>
    </div>
  )
}
