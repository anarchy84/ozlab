'use client'

// ─────────────────────────────────────────────
// 콘텐츠 글 에디터 — 왼쪽 TipTap / 오른쪽 SEO 패널 (sticky)
// ─────────────────────────────────────────────

import { useEffect, useState } from 'react'
import TipTapEditor from '@/components/admin/TipTapEditor'
import SeoPanel from '@/components/admin/SeoPanel'
import MediaLibraryPicker, { type MediaSelection } from '@/components/admin/MediaLibraryPicker'

const CATEGORIES = [
  { value: 'guide', label: '가이드' },
  { value: 'case_study', label: '사례' },
  { value: 'blog', label: '블로그' },
  { value: 'news', label: '뉴스' },
  { value: 'faq', label: 'FAQ' },
]

interface PostForm {
  title: string
  slug: string
  body_html: string
  excerpt: string
  category: string
  tags: string         // 콤마 구분 → array 변환
  focus_keyword: string
  meta_title: string
  meta_description: string
  cover_image: string
  author_name: string
  is_pinned: boolean
  is_published: boolean
}

const EMPTY_FORM: PostForm = {
  title: '',
  slug: '',
  body_html: '',
  excerpt: '',
  category: 'guide',
  tags: '',
  focus_keyword: '',
  meta_title: '',
  meta_description: '',
  cover_image: '',
  author_name: '오즈랩페이',
  is_pinned: false,
  is_published: false,
}

export default function ContentEditor({
  postId,
  myName,
  onClose,
}: {
  postId: number | null
  myName: string
  onClose: () => void
}) {
  const isEdit = postId !== null
  const [form, setForm] = useState<PostForm>({ ...EMPTY_FORM, author_name: myName })
  const [saving, setSaving] = useState(false)
  const [loadingData, setLoadingData] = useState(isEdit)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [coverPickerOpen, setCoverPickerOpen] = useState(false)

  useEffect(() => {
    if (isEdit && postId) {
      const load = async () => {
        const res = await fetch(`/api/admin/posts/${postId}`, { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          setForm({
            title: data.title || '',
            slug: data.slug || '',
            body_html: data.body_html || data.body_md || '', // 호환
            excerpt: data.excerpt || '',
            category: data.category || 'guide',
            tags: (data.tags || []).join(', '),
            focus_keyword: data.focus_keyword || '',
            meta_title: data.meta_title || '',
            meta_description: data.meta_description || '',
            cover_image: data.cover_image || '',
            author_name: data.author_name || myName,
            is_pinned: !!data.is_pinned,
            is_published: !!data.is_published,
          })
          setUpdatedAt(data.updated_at || null)
        }
        setLoadingData(false)
      }
      load()
    }
  }, [isEdit, postId, myName])

  const generateSlug = (title: string) =>
    title
      .toLowerCase()
      .replace(/[^a-zA-Z0-9가-힣\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 80)

  const handleTitleChange = (title: string) => {
    setForm((prev) => ({
      ...prev,
      title,
      slug: prev.slug || generateSlug(title),
    }))
  }

  const handleSave = async (publish: boolean) => {
    if (!form.title.trim()) {
      alert('제목을 입력해 주세요.')
      return
    }
    setSaving(true)

    const payload = {
      ...form,
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      slug: form.slug || generateSlug(form.title),
      is_published: publish,
    }

    const url = isEdit ? `/api/admin/posts/${postId}` : '/api/admin/posts'
    const method = isEdit ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      onClose()
    } else {
      const err = await res.json()
      alert(`저장 실패: ${err.error}`)
    }
    setSaving(false)
  }

  const handleCoverSelect = (selection: MediaSelection) => {
    setForm((prev) => ({ ...prev, cover_image: selection.url }))
  }

  if (loadingData) {
    return <div className="text-center py-12 text-ink-500">로딩 중...</div>
  }

  return (
    <div>
      {/* 상단 바 */}
      <div className="flex items-center justify-between mb-6 sticky top-0 z-40 bg-surface-dark py-3 -mx-6 px-6 border-b border-ink-700">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="text-ink-400 hover:text-ink-100 text-sm"
          >
            ← 목록
          </button>
          <h1 className="text-xl font-bold text-ink-100">
            {isEdit ? '글 수정' : '새 글 작성'}
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleSave(false)}
            disabled={saving || !form.title}
            className="px-4 py-2 bg-ink-700 hover:bg-ink-600 disabled:opacity-50 text-ink-100 text-sm rounded-lg transition-colors"
          >
            임시저장
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving || !form.title}
            className="px-4 py-2 bg-naver-green hover:bg-naver-dark disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors"
          >
            {saving ? '저장 중...' : '발행'}
          </button>
        </div>
      </div>

      {/* 2단 레이아웃 */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
        {/* 왼쪽: 에디터 */}
        <div className="space-y-4">
          {/* 제목 */}
          <input
            type="text"
            value={form.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="제목을 입력하세요"
            className="w-full px-4 py-3 bg-ink-900 border border-ink-700 rounded-lg text-ink-100 text-xl font-bold placeholder-ink-600 focus:outline-none focus:ring-2 focus:ring-naver-green"
          />

          {/* slug */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-500">ozlabpay.kr/blog/</span>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className="flex-1 px-2 py-1 bg-ink-900 border border-ink-700 rounded text-ink-300 text-xs focus:outline-none focus:ring-1 focus:ring-naver-green"
            />
          </div>

          {/* TipTap */}
          <TipTapEditor
            content={form.body_html}
            onChange={(html) => setForm((prev) => ({ ...prev, body_html: html }))}
          />

          {/* 요약 */}
          <Field label="요약 (목록에 표시)">
            <textarea
              value={form.excerpt}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 bg-ink-900 border border-ink-700 rounded-lg text-ink-100 text-sm focus:outline-none focus:ring-2 focus:ring-naver-green resize-none"
              placeholder="글을 요약하는 1~2문장"
            />
          </Field>

          {/* 카테고리 + 태그 + 작성자 + 핀 */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="카테고리">
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 bg-ink-900 border border-ink-700 rounded-lg text-ink-100 text-sm focus:outline-none focus:ring-2 focus:ring-naver-green"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="태그 (콤마 구분)">
              <input
                type="text"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="POS, 카드단말기, 자영업"
                className="w-full px-3 py-2 bg-ink-900 border border-ink-700 rounded-lg text-ink-100 text-sm focus:outline-none focus:ring-2 focus:ring-naver-green"
              />
            </Field>
            <Field label="작성자명">
              <input
                type="text"
                value={form.author_name}
                onChange={(e) => setForm({ ...form, author_name: e.target.value })}
                className="w-full px-3 py-2 bg-ink-900 border border-ink-700 rounded-lg text-ink-100 text-sm focus:outline-none focus:ring-2 focus:ring-naver-green"
              />
            </Field>
            <div className="flex items-end">
              <label className="flex items-center gap-2 px-3 py-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_pinned}
                  onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })}
                  className="w-4 h-4 accent-naver-green"
                />
                <span className="text-sm text-ink-200">📌 목록 상단에 고정</span>
              </label>
            </div>
          </div>

          {/* SEO 메타 */}
          <div className="space-y-3 bg-ink-900 border border-ink-700 rounded-xl p-4">
            <h3 className="text-sm font-bold text-ink-200">SEO 메타 태그</h3>
            <Field label="SEO 제목 (비워두면 글 제목 사용)" small>
              <input
                type="text"
                value={form.meta_title}
                onChange={(e) => setForm({ ...form, meta_title: e.target.value })}
                className="w-full px-3 py-2 bg-ink-800 border border-ink-700 rounded text-ink-100 text-sm focus:outline-none focus:ring-1 focus:ring-naver-green"
              />
            </Field>
            <Field label="메타 설명 (120~160자 권장)" small>
              <textarea
                value={form.meta_description}
                onChange={(e) => setForm({ ...form, meta_description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 bg-ink-800 border border-ink-700 rounded text-ink-100 text-sm focus:outline-none focus:ring-1 focus:ring-naver-green resize-none"
              />
            </Field>
            <Field label="대표 이미지 URL" small>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.cover_image}
                  onChange={(e) => setForm({ ...form, cover_image: e.target.value })}
                  placeholder="https://..."
                  className="flex-1 px-3 py-2 bg-ink-800 border border-ink-700 rounded text-ink-100 text-sm focus:outline-none focus:ring-1 focus:ring-naver-green"
                />
                <button
                  type="button"
                  onClick={() => setCoverPickerOpen(true)}
                  className="px-3 py-2 bg-ink-700 hover:bg-ink-600 text-ink-100 text-xs rounded transition-colors"
                >
                  라이브러리
                </button>
              </div>
              {form.cover_image && (
                <img
                  src={form.cover_image}
                  alt="cover preview"
                  className="mt-2 max-h-32 rounded border border-ink-700"
                />
              )}
            </Field>
          </div>
        </div>

        {/* 오른쪽: SEO 어시스턴트 */}
        <div className="bg-ink-900 border border-ink-700 rounded-xl p-4 h-fit xl:sticky xl:top-32">
          <h2 className="text-sm font-bold text-ink-100 mb-4">
            🎯 SEO 어시스턴트
          </h2>
          <SeoPanel
            title={form.title}
            metaTitle={form.meta_title}
            metaDescription={form.meta_description}
            slug={form.slug}
            bodyHtml={form.body_html}
            focusKeyword={form.focus_keyword}
            authorName={form.author_name}
            updatedAt={updatedAt}
            onFocusKeywordChange={(kw) => setForm((prev) => ({ ...prev, focus_keyword: kw }))}
          />
        </div>
      </div>

      <MediaLibraryPicker
        isOpen={coverPickerOpen}
        title="대표 이미지 선택"
        onClose={() => setCoverPickerOpen(false)}
        onSelect={handleCoverSelect}
      />
    </div>
  )
}

// ─────────────────────────────────────────────
function Field({
  label,
  children,
  small,
}: {
  label: string
  children: React.ReactNode
  small?: boolean
}) {
  return (
    <div>
      <label
        className={`block ${small ? 'text-xs text-ink-500' : 'text-sm text-ink-300'} mb-1`}
      >
        {label}
      </label>
      {children}
    </div>
  )
}
