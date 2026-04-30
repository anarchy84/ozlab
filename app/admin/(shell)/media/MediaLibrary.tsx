'use client'

// ─────────────────────────────────────────────
// 미디어 라이브러리 — 그리드 뷰 + URL 복사
// 우리편 패턴 그대로 + ozlab 다크 테마
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

export default function MediaLibrary({ canWrite }: { canWrite: boolean }) {
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
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

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-ink-100">미디어 라이브러리</h1>
        {canWrite && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 bg-naver-green hover:bg-naver-dark disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors"
          >
            {uploading ? '업로드 중...' : '+ 이미지 업로드'}
          </button>
        )}
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
        업로드 시 자동으로 WebP 변환 + 가로 1200px 리사이즈됩니다 (최대 5MB).
        본문에서는 webp_path 가 자동 사용됩니다.
      </p>

      {loading ? (
        <div className="text-center py-12 text-ink-500">로딩 중...</div>
      ) : media.length === 0 ? (
        <div className="text-center py-12 text-ink-500">업로드된 이미지가 없습니다.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {media.map((item) => (
            <div
              key={item.id}
              className="bg-ink-900 border border-ink-700 rounded-xl overflow-hidden group"
            >
              <div className="aspect-video bg-ink-800 relative overflow-hidden">
                <img
                  src={item.webp_path ?? item.storage_path}
                  alt={item.alt_text ?? item.file_name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => copyUrl(item.webp_path ?? item.storage_path)}
                    className="px-3 py-1.5 bg-naver-green text-white text-xs font-bold rounded-lg"
                  >
                    URL 복사
                  </button>
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
          ))}
        </div>
      )}
    </div>
  )
}
