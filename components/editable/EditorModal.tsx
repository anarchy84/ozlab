// ─────────────────────────────────────────────
// 인라인 편집 — 편집 모달 (핵심 UI)
//
// 플로우 :
//   Step 1: 편집 폼 (text / image / link 타입별 입력)
//   Step 2: "맞습니까?" — before/after 비교 다이얼로그
//   Step 3: PATCH /api/admin/content-blocks → revalidate → router.refresh()
//
// SEO 보호 :
//   - semantic_tag 는 readonly 로 보여주기만 함. 마케터는 못 바꿈.
//   - 태그는 래퍼 코드에서 제어 → DB 는 그대로 유지
//
// 이미지 업로드 :
//   - <input type="file"> 드래그앤드롭 지원
//   - /api/admin/content-blocks/upload 로 업로드 → url + (선택) fallback_url 반환
//   - 투명 PNG는 has_alpha=true 로 응답 → UI 에 뱃지 표시
//
// 자동 발행 금지 원칙 준수 :
//   - Step 1 → Step 2 전환 필수 (바로 저장 버튼 없음)
//   - Step 2 에서 "취소" 누르면 Step 1 로 복귀
//   - "이전 버전으로 되돌리기" 버튼은 향후 history 탭에서 제공 (Phase 0.5)
// ─────────────────────────────────────────────

'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useEditor } from './EditorProvider'
import { useAdminGuard } from '@/hooks/useAdminGuard'
import type { BlockValue, TextValue, ImageValue, LinkValue } from '@/lib/content-blocks'

type Step = 'edit' | 'confirm' | 'saving' | 'done' | 'error'

// -------------------------------------------------------------
// 루트 : 컨텍스트 구독 후 모달 렌더
// -------------------------------------------------------------
export function EditorModal() {
  const { session, closeEditor } = useEditor()
  const { isAdmin, loading } = useAdminGuard()

  // 권한 없거나 세션 없으면 아무것도 안 그림
  if (loading || !isAdmin || !session) return null

  return (
    <ModalShell onClose={closeEditor}>
      <EditorBody key={session.blockKey} />
    </ModalShell>
  )
}

// -------------------------------------------------------------
// 모달 껍데기 (backdrop + 중앙 정렬)
// -------------------------------------------------------------
function ModalShell({
  children,
  onClose,
}: {
  children: React.ReactNode
  onClose: () => void
}) {
  // ESC 로 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* 배경 */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* 본문 */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {children}
      </div>
    </div>
  )
}

// -------------------------------------------------------------
// 본체 — step 전환 관리
// -------------------------------------------------------------
function EditorBody() {
  const { session, closeEditor } = useEditor()
  const router = useRouter()

  // 세션 초기값 기반으로 작업용 draft 구성
  const [draft, setDraft] = useState<BlockValue>(() =>
    structuredClone(session!.currentValue)
  )
  const [step, setStep] = useState<Step>('edit')
  const [errorMsg, setErrorMsg] = useState<string>('')

  // -----------------------------------------------
  // 저장 — PATCH 호출
  //   기본 : /api/admin/content-blocks (content_blocks 테이블)
  //   saveTarget 지정 시 : 해당 엔드포인트 (packages/products 등)
  // -----------------------------------------------
  const handleSave = async () => {
    if (!session) return
    setStep('saving')
    try {
      let res: Response

      if (session.saveTarget) {
        // ── 테이블 직접 저장 경로 ────────────────────
        // packages/products 의 컬럼을 업데이트. body 에 value 만 합쳐 보냄.
        const payload = {
          ...(session.saveTarget.extraPayload ?? {}),
          value: draft,
        }
        res = await fetch(session.saveTarget.api, {
          method:  session.saveTarget.method ?? 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
        })
      } else {
        // ── 기본 content_blocks 경로 ─────────────────
        res = await fetch('/api/admin/content-blocks', {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            block_key:    session.blockKey,
            block_type:   session.blockType,
            value:        draft,
            semantic_tag: session.semanticTag ?? null,
            page_path:    session.pagePath ?? null,
          }),
        })
      }

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? '저장 실패')
      }
      setStep('done')
      // 서버 revalidate 는 API 에서 이미 수행 — 클라이언트 캐시만 새로고침
      router.refresh()
      // 잠깐 성공 메시지 보여주고 자동 닫기
      setTimeout(() => closeEditor(), 700)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '알 수 없는 오류')
      setStep('error')
    }
  }

  if (!session) return null

  return (
    <>
      {/* 헤더 */}
      <header className="px-6 py-4 border-b bg-[#1A1A2E] text-white rounded-t-xl flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">
            블록 편집
            <span className="ml-2 text-xs opacity-70 font-mono">
              {session.blockType}
            </span>
          </h2>
          <p className="text-xs opacity-70 font-mono mt-0.5">
            {session.blockKey}
          </p>
        </div>
        <button
          type="button"
          onClick={closeEditor}
          className="text-white/70 hover:text-white text-2xl leading-none"
          aria-label="닫기"
        >
          ×
        </button>
      </header>

      {/* SEO 태그 안내 — 읽기 전용 */}
      {session.semanticTag && (
        <div className="px-6 py-2 bg-amber-50 text-amber-900 text-xs border-b">
          <strong>SEO 태그:</strong>{' '}
          <code className="font-mono">{session.semanticTag}</code>{' '}
          — 이 태그는 검색 엔진 구조 유지를 위해 고정됩니다.
        </div>
      )}

      {/* step 별 본문 */}
      <div className="px-6 py-5">
        {step === 'edit' && (
          <EditForm
            blockType={session.blockType}
            draft={draft}
            onChange={setDraft}
          />
        )}
        {step === 'confirm' && (
          <ConfirmDiff
            blockType={session.blockType}
            before={session.currentValue}
            after={draft}
          />
        )}
        {step === 'saving' && <StatusBanner tone="info">저장 중...</StatusBanner>}
        {step === 'done' && <StatusBanner tone="success">저장 완료!</StatusBanner>}
        {step === 'error' && (
          <StatusBanner tone="error">저장 실패: {errorMsg}</StatusBanner>
        )}
      </div>

      {/* 푸터 — 버튼 영역 */}
      <footer className="px-6 py-4 border-t bg-gray-50 rounded-b-xl flex justify-end gap-2">
        {step === 'edit' && (
          <>
            <button
              type="button"
              onClick={closeEditor}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => setStep('confirm')}
              className="px-4 py-2 text-sm bg-[#E94560] text-white rounded-md hover:bg-[#c72f48] font-medium"
            >
              다음: 확인
            </button>
          </>
        )}
        {step === 'confirm' && (
          <>
            <button
              type="button"
              onClick={() => setStep('edit')}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
            >
              ← 수정하기
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-sm bg-[#E94560] text-white rounded-md hover:bg-[#c72f48] font-medium"
            >
              맞습니다. 저장
            </button>
          </>
        )}
        {step === 'error' && (
          <button
            type="button"
            onClick={() => setStep('edit')}
            className="px-4 py-2 text-sm bg-[#1A1A2E] text-white rounded-md"
          >
            돌아가기
          </button>
        )}
      </footer>
    </>
  )
}

// -------------------------------------------------------------
// 편집 폼 — 타입별 입력
// -------------------------------------------------------------
function EditForm({
  blockType,
  draft,
  onChange,
}: {
  blockType: 'text' | 'image' | 'link'
  draft: BlockValue
  onChange: (v: BlockValue) => void
}) {
  if (blockType === 'text') {
    const v = draft as TextValue
    return (
      <label className="block">
        <span className="text-sm font-medium text-gray-700">텍스트</span>
        <textarea
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#E94560] focus:ring-[#E94560] p-2 border"
          rows={4}
          value={v.text ?? ''}
          onChange={(e) => onChange({ text: e.target.value })}
          placeholder="새 문구 입력"
        />
        <p className="mt-1 text-xs text-gray-500">
          줄바꿈은 엔터, HTML 태그는 허용되지 않아.
        </p>
      </label>
    )
  }

  if (blockType === 'link') {
    const v = draft as LinkValue
    return (
      <div className="space-y-3">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">버튼/링크 텍스트</span>
          <input
            type="text"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#E94560] focus:ring-[#E94560] p-2 border"
            value={v.label ?? ''}
            onChange={(e) => onChange({ ...v, label: e.target.value })}
            placeholder="예: 상담 신청"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">URL</span>
          <input
            type="url"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#E94560] focus:ring-[#E94560] p-2 border font-mono text-sm"
            value={v.href ?? ''}
            onChange={(e) => onChange({ ...v, href: e.target.value })}
            placeholder="https://... 또는 /internal/path"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">새 창으로 열기</span>
          <select
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
            value={v.target ?? '_self'}
            onChange={(e) => onChange({ ...v, target: e.target.value as '_self' | '_blank' })}
          >
            <option value="_self">현재 창 (_self)</option>
            <option value="_blank">새 창 (_blank)</option>
          </select>
        </label>
      </div>
    )
  }

  // image
  const v = draft as ImageValue
  return <ImageUploadForm value={v} onChange={(nv) => onChange(nv)} />
}

// -------------------------------------------------------------
// 이미지 업로드 서브폼
// -------------------------------------------------------------
function ImageUploadForm({
  value,
  onChange,
}: {
  value: ImageValue
  onChange: (v: ImageValue) => void
}) {
  const { session } = useEditor()
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const handleFile = async (file: File) => {
    if (!session) return
    setUploading(true)
    setUploadError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      // uploadPathPrefix 지정되면 그것을 사용 (packages/products 용 저장 경로)
      // 아니면 blockKey 를 storage 경로로 사용 (홈 섹션용 기본)
      if (session.uploadPathPrefix) {
        fd.append('path_prefix', session.uploadPathPrefix)
      } else {
        fd.append('block_key', session.blockKey)
      }

      const res = await fetch('/api/admin/content-blocks/upload', {
        method: 'POST',
        body:   fd,
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? '업로드 실패')
      }
      onChange({
        ...value,
        url:          json.url,
        fallback_url: json.fallback_url,
        width:        json.width ?? value.width,
        height:       json.height ?? value.height,
        format:       'webp',
      })
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : '알 수 없는 오류')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* 현재 이미지 */}
      {value.url && (
        <div>
          <span className="text-sm font-medium text-gray-700">현재 이미지</span>
          <div className="mt-1 border rounded-md overflow-hidden bg-gray-100 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value.url}
              alt={value.alt ?? ''}
              className="max-h-48 mx-auto object-contain"
            />
          </div>
          {value.fallback_url && (
            <p className="mt-1 text-xs text-amber-700">
              🎨 투명 배경 감지됨 — PNG fallback 도 저장됨
            </p>
          )}
        </div>
      )}

      {/* 파일 선택 */}
      <label className="block">
        <span className="text-sm font-medium text-gray-700">새 이미지 업로드</span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          disabled={uploading}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
          }}
          className="mt-1 block w-full text-sm file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-[#1A1A2E] file:text-white hover:file:bg-[#0F3460]"
        />
        <p className="mt-1 text-xs text-gray-500">
          5MB 이하, PNG/JPG/WebP/GIF. 자동으로 WebP 로 최적화됨.
        </p>
      </label>

      {uploading && <div className="text-sm text-blue-700">업로드 중...</div>}
      {uploadError && <div className="text-sm text-red-600">업로드 실패: {uploadError}</div>}

      {/* Alt 텍스트 */}
      <label className="block">
        <span className="text-sm font-medium text-gray-700">대체 텍스트 (alt) — SEO·접근성 필수</span>
        <input
          type="text"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
          value={value.alt ?? ''}
          onChange={(e) => onChange({ ...value, alt: e.target.value })}
          placeholder="이미지 설명 (예: 매장에서 카드 결제하는 사장님)"
        />
      </label>
    </div>
  )
}

// -------------------------------------------------------------
// before/after 비교 — "맞습니까?" 화면
// -------------------------------------------------------------
function ConfirmDiff({
  blockType,
  before,
  after,
}: {
  blockType: 'text' | 'image' | 'link'
  before: BlockValue
  after:  BlockValue
}) {
  const unchanged = useMemo(
    () => JSON.stringify(before) === JSON.stringify(after),
    [before, after]
  )

  return (
    <div className="space-y-4">
      <div className="text-center py-2">
        <p className="text-lg font-bold text-[#1A1A2E]">맞습니까?</p>
        <p className="text-sm text-gray-600 mt-1">
          저장하면 실제 사이트에 즉시 반영돼. 직전 버전은 히스토리에 5개까지 보관됨.
        </p>
      </div>

      {unchanged && (
        <div className="p-3 bg-amber-50 text-amber-900 text-sm rounded-md">
          ⚠️ 변경 사항이 없어. 취소하거나 수정해줘.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="border rounded-md p-3 bg-gray-50">
          <div className="text-xs font-medium text-gray-500 mb-2">변경 전 (BEFORE)</div>
          <ValuePreview blockType={blockType} value={before} />
        </div>
        <div className="border-2 border-[#E94560] rounded-md p-3 bg-red-50">
          <div className="text-xs font-medium text-[#E94560] mb-2">변경 후 (AFTER)</div>
          <ValuePreview blockType={blockType} value={after} />
        </div>
      </div>
    </div>
  )
}

// -------------------------------------------------------------
// 값 미리보기
// -------------------------------------------------------------
function ValuePreview({
  blockType,
  value,
}: {
  blockType: 'text' | 'image' | 'link'
  value: BlockValue
}) {
  if (blockType === 'text') {
    const v = value as TextValue
    return (
      <div className="whitespace-pre-wrap break-words text-sm text-gray-900 min-h-[3rem]">
        {v.text || <span className="text-gray-400">(비어있음)</span>}
      </div>
    )
  }
  if (blockType === 'link') {
    const v = value as LinkValue
    return (
      <div className="text-sm space-y-1">
        <div>
          <span className="text-gray-500">텍스트:</span>{' '}
          <strong>{v.label || '(비어있음)'}</strong>
        </div>
        <div className="break-all">
          <span className="text-gray-500">URL:</span>{' '}
          <code className="text-xs">{v.href || '(비어있음)'}</code>
        </div>
        <div>
          <span className="text-gray-500">열기:</span> {v.target ?? '_self'}
        </div>
      </div>
    )
  }
  // image
  const v = value as ImageValue
  return (
    <div className="space-y-1">
      {v.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={v.url}
          alt={v.alt ?? ''}
          className="max-h-32 w-full object-contain bg-white rounded"
        />
      ) : (
        <div className="h-32 bg-gray-100 flex items-center justify-center text-gray-400 text-sm rounded">
          (이미지 없음)
        </div>
      )}
      <div className="text-xs text-gray-600 truncate">
        <strong>alt:</strong> {v.alt || '(없음)'}
      </div>
    </div>
  )
}

// -------------------------------------------------------------
// 상태 배너 (saving/done/error 공용)
// -------------------------------------------------------------
function StatusBanner({
  tone,
  children,
}: {
  tone: 'info' | 'success' | 'error'
  children: React.ReactNode
}) {
  const cls =
    tone === 'success'
      ? 'bg-green-50 text-green-900 border-green-200'
      : tone === 'error'
      ? 'bg-red-50 text-red-900 border-red-200'
      : 'bg-blue-50 text-blue-900 border-blue-200'
  return (
    <div className={`p-4 rounded-md border ${cls} text-center font-medium`}>
      {children}
    </div>
  )
}
