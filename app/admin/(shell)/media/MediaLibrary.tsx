'use client'

// ─────────────────────────────────────────────
// 미디어 라이브러리 — 그리드 뷰 + URL 복사 + 삭제 + 전체 비우기
//   - 카드 hover : URL 복사 / 🗑 삭제 (개별 confirm)
//   - 상단 : 🗑 전체 비우기 (super_admin 전용, 강한 confirm — "DELETE" 타이핑)
// ─────────────────────────────────────────────

import { useEffect, useState, useCallback, useRef } from 'react'

interface MediaItem {
  id: string
  file_name: string
  storage_path: string
  webp_path: string | null
  mime_type: string
  file_size: number | null
  width: number | null
  height: number | null
  alt_text: string | null
  created_at: string
}

export default function MediaLibrary({
  canWrite,
  isSuperAdmin,
}: {
  canWrite: boolean
  isSuperAdmin?: boolean
}) {
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [clearingAll, setClearingAll] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchMedia = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/media', { cache: 'no-store' })
    if (res.ok) setMedia(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchMedia()
  }, [fetchMedia])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    for (const file of Array.from(files)) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('alt_text', file.name.replace(/\.[^/.]+$/, ''))
      const res = await fetch('/api/admin/media', { method: 'POST', body: formData })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(`${file.name} 업로드 실패: ${err.error ?? 'unknown'}`)
      }
    }
    setUploading(false)
    fetchMedia()
    e.target.value = ''
  }

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    alert('URL 복사 완료')
  }

  // ─── 개별 삭제 ───────────────────────────────
  const deleteItem = async (item: MediaItem) => {
    if (deletingId) return
    const ok = confirm(
      `"${item.file_name}" 이미지를 삭제할까요?\n\n` +
        `이미 발행된 글이 이 이미지를 사용 중이면 그 글에서 깨질 수 있습니다.\n` +
        `복구 불가.`,
    )
    if (!ok) return
    setDeletingId(item.id)
    try {
      const res = await fetch(`/api/admin/media/${item.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(`삭제 실패: ${err.error ?? 'unknown'}`)
        return
      }
      setMedia((prev) => prev.filter((m) => m.id !== item.id))
    } catch (err) {
      alert(`네트워크 오류: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setDeletingId(null)
    }
  }

  // ─── 전체 비우기 ─────────────────────────────
  const clearAll = async () => {
    if (clearingAll) return
    if (media.length === 0) {
      alert('비울 이미지가 없습니다.')
      return
    }
    const typed = window.prompt(
      `⚠️ 미디어 라이브러리의 모든 이미지를 삭제합니다.\n` +
        `총 ${media.length}건. 복구 불가.\n\n` +
        `진짜 진행하려면 아래에 DELETE 를 입력하세요.`,
    )
    if (typed !== 'DELETE') {
      if (typed !== null) alert('취소됨 — 정확히 "DELETE" 를 입력해야 진행합니다.')
      return
    }
    setClearingAll(true)
    try {
      const res = await fetch(
        '/api/admin/media?confirm=CONFIRM_DELETE_ALL',
        { method: 'DELETE' },
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(`전체 비움 실패: ${data.error ?? 'unknown'}`)
        return
      }
      alert(
        `✅ 전체 비움 완료\n` +
          `· 삭제 row : ${data.deletedRows ?? 0}건\n` +
          `· 삭제 파일 : ${data.deletedFiles ?? 0}개`,
      )
      setMedia([])
    } catch (err) {
      alert(`네트워크 오류: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setClearingAll(false)
    }
  }

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <h1 className="text-2xl font-bold text-ink-100 break-keep">미디어 라이브러리</h1>
        <div className="flex flex-wrap gap-2">
          {canWrite && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 bg-naver-green hover:bg-naver-dark disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors"
            >
              {uploading ? '업로드 중...' : '+ 이미지 업로드'}
            </button>
          )}
          {/*
            전체 비우기 — super_admin 전용. 백엔드도 super_admin 만 허용.
            UI 클릭 후 'DELETE' 타이핑 confirm 까지 통과해야 호출.
          */}
          {isSuperAdmin && media.length > 0 && (
            <button
              onClick={clearAll}
              disabled={clearingAll}
              className="px-4 py-2 bg-red-600/80 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors"
              title="모든 이미지를 영구 삭제 (복구 불가)"
            >
              {clearingAll ? '비우는 중...' : `🗑 전체 비우기 (${media.length}건)`}
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleUpload}
          className="hidden"
        />
      </div>

      <p className="text-xs text-ink-500 mb-6">
        업로드 시 자동으로 WebP 변환 + 가로 1600px 리사이즈됩니다 (최대 30MB).
        본문에서는 webp_path 가 자동 사용됩니다.
      </p>

      {loading ? (
        <div className="text-center py-12 text-ink-500">로딩 중...</div>
      ) : media.length === 0 ? (
        <div className="text-center py-12 text-ink-500">업로드된 이미지가 없습니다.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {media.map((item) => {
            const url = item.webp_path ?? item.storage_path
            const isDeleting = deletingId === item.id
            return (
              <div
                key={item.id}
                className="bg-ink-900 border border-ink-700 rounded-xl overflow-hidden group"
              >
                <div className="aspect-video bg-ink-800 relative overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={item.alt_text ?? item.file_name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => copyUrl(url)}
                      className="px-3 py-1.5 bg-naver-green text-white text-xs font-bold rounded-lg"
                    >
                      URL 복사
                    </button>
                    {canWrite && (
                      <button
                        onClick={() => deleteItem(item)}
                        disabled={isDeleting}
                        className="px-3 py-1.5 bg-red-600/90 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg"
                        title="이미지 삭제 (복구 불가)"
                      >
                        {isDeleting ? '삭제 중…' : '🗑 삭제'}
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-2.5">
                  <p className="text-xs text-ink-100 truncate">{item.file_name}</p>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-ink-500">
                    <span>
                      {item.width}×{item.height}
                    </span>
                    <span>·</span>
                    <span>{formatSize(item.file_size)}</span>
                  </div>
                  {item.alt_text && (
                    <p className="text-[11px] text-ink-600 truncate mt-0.5">
                      alt: {item.alt_text}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
