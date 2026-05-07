'use client'

// ─────────────────────────────────────────────
// MediaLibraryPicker — Supabase Storage 미디어 선택 모달
//
// 우리편 admin-editor/MediaLibraryPicker.tsx (commit 869d663+) 이식.
//   - autoSelectOnUpload prop : 본문 모달은 업로드 즉시 삽입+닫힘
//   - 드래그 앤 드롭 (모달 위에 파일 끌어다 놓기)
//   - 검색 + 새로고침 + 일반 업로드
// ─────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, ImagePlus, Loader2, RefreshCw, Search, Upload, X } from 'lucide-react'
import type { Media } from '@/lib/admin/types'

export interface MediaSelection {
  url: string
  altText: string
  media: Media
}

interface MediaLibraryPickerProps {
  isOpen: boolean
  title?: string
  autoSelectOnUpload?: boolean
  onClose: () => void
  onSelect: (selection: MediaSelection) => void
}

export default function MediaLibraryPicker({
  isOpen,
  title = '이미지 선택',
  autoSelectOnUpload = false,
  onClose,
  onSelect,
}: MediaLibraryPickerProps) {
  const [media, setMedia] = useState<Media[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // 드래그 앤 드롭 — 모달 위에 파일 끌어다 놓기 가능
  const [isDragging, setIsDragging] = useState(false)
  const dragCounter = useRef(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchMedia = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/media', { method: 'GET' })
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

  const selectMedia = useCallback((item: Media) => {
    onSelect({
      url: getMediaUrl(item),
      altText: item.alt_text || item.file_name,
      media: item,
    })
  }, [onSelect])

  // 파일 업로드 공통 처리 — input·드래그앤드롭 둘 다 사용
  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (list.length === 0) {
      setError('이미지 파일만 업로드 가능해.')
      return
    }

    setUploading(true)
    setError(null)

    const uploaded: Media[] = []
    try {
      for (const file of list) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('alt_text', file.name.replace(/\.[^/.]+$/, ''))
        // 본문 일반 업로드 — content preset (max 1600px·종횡비 유지)
        formData.append('preset', 'content')

        const res = await fetch('/api/admin/media', { method: 'POST', body: formData })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          const msg = data && typeof data.error === 'string' ? data.error : `HTTP ${res.status}`
          setError(`업로드 실패 (${file.name}): ${msg}`)
          continue
        }
        uploaded.push(data as Media)
      }

      if (uploaded.length > 0) {
        setMedia((prev) => [...uploaded, ...prev])
        setSelectedId(uploaded[0].id)
        if (autoSelectOnUpload) {
          uploaded.forEach(selectMedia)
          onClose()
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '네트워크 오류'
      setError(`업로드 실패: ${msg}`)
    } finally {
      setUploading(false)
    }
  }, [autoSelectOnUpload, onClose, selectMedia])

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    event.target.value = ''
    if (!files || files.length === 0) return
    await uploadFiles(files)
  }

  // ── 드래그 앤 드롭 핸들러 ─────────────────────────────
  // dragenter/leave 이벤트는 자식 요소에서 자주 fire 되므로 카운터로 안정화
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.types.includes('Files')) {
      dragCounter.current += 1
      setIsDragging(true)
    }
  }
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current -= 1
    if (dragCounter.current <= 0) {
      dragCounter.current = 0
      setIsDragging(false)
    }
  }
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'copy'
  }
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current = 0
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      await uploadFiles(files)
    }
  }

  const handleConfirm = () => {
    if (!selectedMedia) return

    selectMedia(selectedMedia)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 py-6">
      <div
        className={`relative flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border bg-gray-900 shadow-2xl transition-colors ${
          isDragging
            ? 'border-blue-500 ring-2 ring-blue-500/50'
            : 'border-gray-700'
        }`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* 드래그 중 오버레이 — 모달 위에 안내 문구 */}
        {isDragging && (
          <div className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center bg-blue-500/15 backdrop-blur-sm">
            <Upload className="mb-3 h-12 w-12 text-blue-300" />
            <p className="text-base font-semibold text-white">여기에 떨어뜨리면 업로드돼</p>
            <p className="mt-1 text-sm text-blue-200">이미지 파일 (jpg·png·webp·gif)</p>
          </div>
        )}
        <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
          <div>
            <h2 className="text-sm font-bold text-white">{title}</h2>
            <p className="mt-0.5 text-xs text-gray-500">{media.length}개 이미지</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
            aria-label="닫기"
            title="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3 border-b border-gray-800 px-4 py-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="파일명 또는 alt 검색"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 pl-9 pr-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={fetchMedia}
              disabled={loading || uploading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gray-800 px-3 py-2 text-xs text-gray-300 transition-colors hover:bg-gray-700 hover:text-white disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              새로고침
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
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
            <div className="flex h-72 items-center justify-center text-sm text-gray-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              불러오는 중...
            </div>
          ) : filteredMedia.length === 0 ? (
            <div className="flex h-72 flex-col items-center justify-center rounded-xl border border-dashed border-gray-700 text-center">
              <ImagePlus className="mb-3 h-8 w-8 text-gray-600" />
              <p className="text-sm text-gray-400">선택할 이미지가 없어.</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-500"
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
                    className={`group overflow-hidden rounded-lg border bg-gray-950 text-left transition-all ${
                      isSelected
                        ? 'border-blue-500 ring-2 ring-blue-500/40'
                        : 'border-gray-800 hover:border-gray-600'
                    }`}
                  >
                    <div className="relative aspect-video bg-gray-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl}
                        alt={item.alt_text || item.file_name}
                        className="h-full w-full object-cover"
                      />
                      {isSelected && (
                        <span className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white shadow">
                          <Check className="h-4 w-4" />
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 p-2.5">
                      <p className="truncate text-xs font-medium text-white">{item.file_name}</p>
                      <p className="truncate text-[11px] text-gray-500">
                        {formatDimensions(item)} · {formatSize(item.file_size)}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-gray-800 px-4 py-3">
          <p className="truncate pr-4 text-xs text-gray-500">
            {selectedMedia ? getMediaUrl(selectedMedia) : '선택된 이미지 없음'}
          </p>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-gray-800 px-4 py-2 text-xs text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedMedia}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
            >
              선택
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function getMediaUrl(media: Media) {
  return media.webp_path || media.storage_path
}

function formatSize(bytes: number | null) {
  if (!bytes) return '-'
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function formatDimensions(media: Media) {
  if (!media.width || !media.height) return '-'
  return `${media.width}x${media.height}`
}
