'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

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

export interface MediaSelection {
  url: string
  altText: string
  media: MediaItem
}

interface MediaLibraryPickerProps {
  isOpen: boolean
  title?: string
  onClose: () => void
  onSelect: (selection: MediaSelection) => void
}

export default function MediaLibraryPicker({
  isOpen,
  title = '이미지 선택',
  onClose,
  onSelect,
}: MediaLibraryPickerProps) {
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchMedia = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/media', { cache: 'no-store' })
      const data = await res.json().catch(() => [])
      if (!res.ok) {
        const msg = data && typeof data.error === 'string' ? data.error : `HTTP ${res.status}`
        setError(`미디어 목록을 불러오지 못했어: ${msg}`)
        return
      }
      setMedia(Array.isArray(data) ? data : [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : '네트워크 오류'
      setError(`미디어 목록을 불러오지 못했어: ${msg}`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return
    setSelectedId(null)
    setQuery('')
    fetchMedia()
  }, [fetchMedia, isOpen])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const filteredMedia = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return media

    return media.filter((item) => {
      const haystack = `${item.file_name} ${item.alt_text || ''}`.toLowerCase()
      return haystack.includes(keyword)
    })
  }, [media, query])

  const selectedMedia = useMemo(
    () => media.find((item) => item.id === selectedId) || null,
    [media, selectedId],
  )

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    event.target.value = ''
    if (!files || files.length === 0) return

    setUploading(true)
    setError(null)

    const uploaded: MediaItem[] = []
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('alt_text', file.name.replace(/\.[^/.]+$/, ''))

        const res = await fetch('/api/admin/media', { method: 'POST', body: formData })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          const msg = data && typeof data.error === 'string' ? data.error : `HTTP ${res.status}`
          setError(`업로드 실패 (${file.name}): ${msg}`)
          continue
        }
        uploaded.push(data as MediaItem)
      }

      if (uploaded.length > 0) {
        setMedia((prev) => [...uploaded, ...prev])
        setSelectedId(uploaded[0].id)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '네트워크 오류'
      setError(`업로드 실패: ${msg}`)
    } finally {
      setUploading(false)
    }
  }

  const handleConfirm = () => {
    if (!selectedMedia) return

    onSelect({
      url: getMediaUrl(selectedMedia),
      altText: selectedMedia.alt_text || selectedMedia.file_name,
      media: selectedMedia,
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-ink-700 bg-ink-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-ink-700 px-4 py-3">
          <div>
            <h2 className="text-sm font-bold text-ink-100">{title}</h2>
            <p className="mt-0.5 text-xs text-ink-500">{media.length}개 이미지</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1.5 text-sm text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-100"
            aria-label="닫기"
            title="닫기"
          >
            닫기
          </button>
        </div>

        <div className="flex flex-col gap-3 border-b border-ink-700 px-4 py-3 md:flex-row md:items-center">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="파일명 또는 alt 검색"
            className="min-w-0 flex-1 rounded-lg border border-ink-700 bg-ink-800 px-3 py-2 text-sm text-ink-100 placeholder-ink-500 focus:outline-none focus:ring-2 focus:ring-naver-green"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={fetchMedia}
              disabled={loading || uploading}
              className="rounded-lg bg-ink-800 px-3 py-2 text-xs text-ink-300 transition-colors hover:bg-ink-700 hover:text-ink-100 disabled:opacity-50"
            >
              {loading ? '새로고침 중' : '새로고침'}
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="rounded-lg bg-naver-green px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-naver-dark disabled:opacity-50"
            >
              {uploading ? '업로드 중' : '업로드'}
            </button>
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

        {error && (
          <div className="border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-300">
            {error}
          </div>
        )}

        <div className="min-h-[360px] flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex h-72 items-center justify-center text-sm text-ink-500">
              불러오는 중...
            </div>
          ) : filteredMedia.length === 0 ? (
            <div className="flex h-72 flex-col items-center justify-center rounded-xl border border-dashed border-ink-700 text-center">
              <p className="text-sm text-ink-400">선택할 이미지가 없어.</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 rounded-lg bg-naver-green px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-naver-dark"
              >
                이미지 업로드
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {filteredMedia.map((item) => {
                const imageUrl = getMediaUrl(item)
                const isSelected = item.id === selectedId

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    aria-pressed={isSelected}
                    className={`group overflow-hidden rounded-lg border bg-surface-dark text-left transition-all ${
                      isSelected
                        ? 'border-naver-green ring-2 ring-naver-green/40'
                        : 'border-ink-700 hover:border-ink-500'
                    }`}
                  >
                    <div className="relative aspect-video bg-ink-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl}
                        alt={item.alt_text || item.file_name}
                        className="h-full w-full object-cover"
                      />
                      {isSelected && (
                        <span className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-naver-green text-xs font-bold text-white shadow">
                          선택
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 p-2.5">
                      <p className="truncate text-xs font-medium text-ink-100">{item.file_name}</p>
                      <p className="truncate text-[11px] text-ink-500">
                        {formatDimensions(item)} · {formatSize(item.file_size)}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-ink-700 px-4 py-3">
          <p className="truncate pr-4 text-xs text-ink-500">
            {selectedMedia ? getMediaUrl(selectedMedia) : '선택된 이미지 없음'}
          </p>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-ink-800 px-4 py-2 text-xs text-ink-300 transition-colors hover:bg-ink-700 hover:text-ink-100"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedMedia}
              className="rounded-lg bg-naver-green px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-naver-dark disabled:opacity-50"
            >
              선택
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function getMediaUrl(media: MediaItem) {
  return media.webp_path || media.storage_path
}

function formatSize(bytes: number | null) {
  if (!bytes) return '-'
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function formatDimensions(media: MediaItem) {
  if (!media.width || !media.height) return '-'
  return `${media.width}x${media.height}`
}
