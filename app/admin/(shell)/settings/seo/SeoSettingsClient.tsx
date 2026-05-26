'use client'

// ─────────────────────────────────────────────
// SeoSettingsClient — 페이지별 SEO + OG 이미지 어드민 UI
//
// 페이지 카드:
//   - 메타 제목·설명 인라인 편집
//   - OG 이미지 업로드 (preset=featured → 자동 1200×630)
//   - 활성 토글 + 저장
//
// + 신규 페이지 추가 (시드 외 페이지 등록)
// ─────────────────────────────────────────────

import { useRef, useState } from 'react'

interface PageSeo {
  page_path: string
  page_label: string | null
  og_image_url: string | null
  og_title: string | null
  og_description: string | null
  meta_title: string | null
  meta_description: string | null
  twitter_card: string | null
  keywords: string | null
  is_active: boolean
  updated_at: string
}

interface Props {
  initialPages: PageSeo[]
}

export default function SeoSettingsClient({ initialPages }: Props) {
  const [pages, setPages] = useState<PageSeo[]>(initialPages)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [newPath, setNewPath] = useState('')

  async function addPage() {
    if (!newPath.startsWith('/')) {
      setMsg({ kind: 'err', text: 'page_path 는 / 로 시작' })
      return
    }
    try {
      const res = await fetch('/api/admin/page-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page_path: newPath.trim(), page_label: newPath.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMsg({ kind: 'err', text: data?.error ?? '등록 실패' })
        return
      }
      setPages((p) => [...p, data.page])
      setNewPath('')
      setMsg({ kind: 'ok', text: `'${data.page.page_path}' 추가됨` })
    } catch (e) {
      setMsg({ kind: 'err', text: String(e) })
    }
  }

  async function savePage(updated: PageSeo) {
    try {
      const res = await fetch('/api/admin/page-seo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
      const data = await res.json()
      if (!res.ok) {
        setMsg({ kind: 'err', text: data?.error ?? '저장 실패' })
        return false
      }
      setPages((p) => p.map((x) => (x.page_path === updated.page_path ? data.page : x)))
      setMsg({ kind: 'ok', text: `'${updated.page_path}' 저장 완료` })
      return true
    } catch (e) {
      setMsg({ kind: 'err', text: String(e) })
      return false
    }
  }

  return (
    <div className="space-y-6">
      {msg && (
        <div
          className={`rounded-md border px-4 py-3 text-sm ${
            msg.kind === 'ok'
              ? 'border-brand-blue/40 bg-brand-blue/5 text-brand-neon'
              : 'border-accent-red/40 bg-accent-red/5 text-accent-red'
          }`}
        >
          {msg.kind === 'ok' ? '✅' : '⚠️'} {msg.text}
        </div>
      )}

      {/* 안내 */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-ink-200 break-keep">
        💡 OG 이미지는 자동으로 <strong>1200×630</strong> 으로 잘립니다. 업로드 후 카카오톡·페이스북
        공유해서 미리보기 확인 권장. 메타 제목 비우면 사이트 기본값 사용.
      </div>

      {/* 페이지 카드 목록 */}
      <div className="space-y-4">
        {pages.map((p) => (
          <PageCard key={p.page_path} page={p} onSave={savePage} />
        ))}
      </div>

      {/* 신규 페이지 추가 */}
      <section className="rounded-lg border border-ink-700 bg-ink-900/30 p-4">
        <h2 className="text-sm font-bold text-ink-100 mb-2">➕ 페이지 추가</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={newPath}
            onChange={(e) => setNewPath(e.target.value)}
            placeholder="/new-landing"
            className="flex-1 rounded border border-ink-700 bg-ink-900 px-3 py-2 font-mono text-sm text-ink-100"
          />
          <button
            type="button"
            onClick={addPage}
            disabled={!newPath}
            className="rounded-md bg-brand-blue px-4 py-2 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            추가
          </button>
        </div>
      </section>
    </div>
  )
}

// ─────────────────────────────────────────────
// 페이지 카드 — 인라인 편집 + OG 업로드
// ─────────────────────────────────────────────
function PageCard({
  page,
  onSave,
}: {
  page: PageSeo
  onSave: (p: PageSeo) => Promise<boolean>
}) {
  const [local, setLocal] = useState<PageSeo>(page)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const dirty =
    local.meta_title !== page.meta_title ||
    local.meta_description !== page.meta_description ||
    local.og_image_url !== page.og_image_url ||
    local.og_title !== page.og_title ||
    local.og_description !== page.og_description ||
    local.keywords !== page.keywords ||
    local.is_active !== page.is_active

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', f)
      fd.append('alt_text', `OG image - ${local.page_path}`)
      fd.append('preset', 'featured') // 자동 1200×630 cover
      const res = await fetch('/api/admin/media', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) {
        alert(data?.error ?? '업로드 실패')
        return
      }
      // media 응답에서 webp_url 우선 (없으면 url)
      const url = data?.media?.webp_url ?? data?.media?.url ?? data?.webp_url ?? data?.url
      if (url) {
        setLocal((p) => ({ ...p, og_image_url: url }))
      } else {
        alert('업로드 응답에서 URL 못 찾음')
      }
    } catch (err) {
      alert(`업로드 오류: ${String(err)}`)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleSave() {
    if (!dirty || busy) return
    setBusy(true)
    try {
      const ok = await onSave(local)
      if (ok) {
        // 저장 성공 시 local 은 그대로 유지 (다음 dirty 비교 위해 부모 상태로 동기화 됐을 것)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-lg border border-ink-700 bg-ink-900/30 p-4">
      {/* 헤더 — 경로 + 활성 토글 + 저장 */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <code className="text-sm font-mono text-brand-neon truncate">{local.page_path}</code>
          {local.page_label && (
            <span className="text-xs text-ink-500 truncate">· {local.page_label}</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <label className="flex items-center gap-1 text-xs text-ink-400">
            <input
              type="checkbox"
              checked={local.is_active}
              onChange={(e) => setLocal((p) => ({ ...p, is_active: e.target.checked }))}
            />
            활성
          </label>
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || busy}
            className="rounded-md bg-brand-blue px-3 py-1 text-xs font-bold text-white hover:bg-brand-dark disabled:opacity-30"
          >
            {busy ? '저장중' : '저장'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* OG 이미지 */}
        <div className="sm:col-span-2 flex gap-3">
          <div className="w-40 h-[78px] rounded border border-ink-700 bg-ink-900 overflow-hidden flex items-center justify-center text-xs text-ink-500">
            {local.og_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={local.og_image_url}
                alt={`OG ${local.page_path}`}
                className="w-full h-full object-cover"
              />
            ) : (
              '미설정'
            )}
          </div>
          <div className="flex-1 flex flex-col gap-1.5">
            <div className="text-xs font-semibold text-ink-200">OG 이미지 (1200×630 자동)</div>
            <div className="flex gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleUpload}
                disabled={uploading}
                className="text-xs text-ink-400"
              />
              {local.og_image_url && (
                <button
                  type="button"
                  onClick={() => setLocal((p) => ({ ...p, og_image_url: null }))}
                  className="rounded border border-accent-red/40 px-2 py-0.5 text-xs text-accent-red hover:bg-accent-red/10"
                >
                  제거
                </button>
              )}
            </div>
            {local.og_image_url && (
              <code className="text-xs font-mono text-ink-500 truncate">{local.og_image_url}</code>
            )}
            {uploading && <span className="text-xs text-brand-neon">업로드 중…</span>}
          </div>
        </div>

        {/* 메타 제목 */}
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-semibold text-ink-200">메타 제목 (title 태그)</span>
          <input
            type="text"
            value={local.meta_title ?? ''}
            onChange={(e) => setLocal((p) => ({ ...p, meta_title: e.target.value }))}
            placeholder="비우면 기본 제목"
            className="rounded border border-ink-700 bg-ink-900 px-2 py-1.5 text-sm text-ink-100"
          />
          <span className="text-ink-600">{(local.meta_title ?? '').length}/200</span>
        </label>

        {/* 메타 설명 */}
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-semibold text-ink-200">메타 설명 (description)</span>
          <input
            type="text"
            value={local.meta_description ?? ''}
            onChange={(e) => setLocal((p) => ({ ...p, meta_description: e.target.value }))}
            placeholder="검색 결과 스니펫"
            className="rounded border border-ink-700 bg-ink-900 px-2 py-1.5 text-sm text-ink-100"
          />
          <span className="text-ink-600">{(local.meta_description ?? '').length}/500</span>
        </label>

        {/* OG 제목 */}
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-semibold text-ink-200">OG 제목 (공유용)</span>
          <input
            type="text"
            value={local.og_title ?? ''}
            onChange={(e) => setLocal((p) => ({ ...p, og_title: e.target.value }))}
            placeholder="비우면 메타 제목 사용"
            className="rounded border border-ink-700 bg-ink-900 px-2 py-1.5 text-sm text-ink-100"
          />
        </label>

        {/* OG 설명 */}
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-semibold text-ink-200">OG 설명 (공유용)</span>
          <input
            type="text"
            value={local.og_description ?? ''}
            onChange={(e) => setLocal((p) => ({ ...p, og_description: e.target.value }))}
            placeholder="비우면 메타 설명 사용"
            className="rounded border border-ink-700 bg-ink-900 px-2 py-1.5 text-sm text-ink-100"
          />
        </label>

        {/* 키워드 */}
        <label className="flex flex-col gap-1 text-xs sm:col-span-2">
          <span className="font-semibold text-ink-200">키워드 (콤마 구분, 선택)</span>
          <input
            type="text"
            value={local.keywords ?? ''}
            onChange={(e) => setLocal((p) => ({ ...p, keywords: e.target.value }))}
            placeholder="단말기, 네이버페이, POS"
            className="rounded border border-ink-700 bg-ink-900 px-2 py-1.5 text-sm text-ink-100"
          />
        </label>
      </div>
    </div>
  )
}
