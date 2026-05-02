'use client'

// ─────────────────────────────────────────────
// 콘텐츠 글 매니저 — 목록 ↔ 에디터 토글
// ─────────────────────────────────────────────

import { useEffect, useState, useCallback } from 'react'
import ContentEditor from './ContentEditor'
import type { AdminRole } from '@/lib/admin/types'

interface PostRow {
  id: number
  slug: string
  title: string
  excerpt: string | null
  category: string
  tags: string[]
  focus_keyword: string | null
  seo_scores: { tier1?: number; tier2?: number; tier3?: number; total?: number; grade?: string } | null
  cover_image: string | null
  view_count: number
  is_pinned: boolean
  is_published: boolean
  published_at: string | null
  created_at: string
  updated_at: string
  author_name: string
}

const CATEGORY_LABELS: Record<string, string> = {
  blog: '블로그',
  guide: '가이드',
  case_study: '사례',
  news: '뉴스',
  faq: 'FAQ',
}

export default function ContentManager({
  myRole,
  myName,
}: {
  myRole: AdminRole
  myName: string
}) {
  const [posts, setPosts] = useState<PostRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all')
  const [showEditor, setShowEditor] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const canWrite = myRole === 'super_admin' || myRole === 'admin' || myRole === 'marketer'
  const canDelete = myRole === 'super_admin' || myRole === 'admin'

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    const url = filter === 'all' ? '/api/admin/posts' : `/api/admin/posts?status=${filter}`
    const res = await fetch(url, { cache: 'no-store' })
    if (res.ok) setPosts(await res.json())
    setLoading(false)
  }, [filter])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`"${title}" 글을 삭제할까요? 라이브에서도 즉시 사라집니다.`)) return
    const res = await fetch(`/api/admin/posts/${id}`, { method: 'DELETE' })
    if (res.ok) fetchPosts()
    else alert('삭제 실패')
  }

  if (showEditor) {
    return (
      <ContentEditor
        postId={editingId}
        myName={myName}
        onClose={() => {
          setShowEditor(false)
          setEditingId(null)
          fetchPosts()
        }}
      />
    )
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold text-ink-100 break-keep">콘텐츠 관리</h1>
        {canWrite && (
          <button
            onClick={() => {
              setEditingId(null)
              setShowEditor(true)
            }}
            className="w-full sm:w-auto px-4 py-2 bg-naver-green hover:bg-naver-dark text-white text-sm font-bold rounded-lg transition-colors"
          >
            + 새 글 작성
          </button>
        )}
      </div>

      {/* 필터 */}
      <div className="flex gap-2 mb-4">
        {(['all', 'published', 'draft'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs rounded transition-colors ${
              filter === f
                ? 'bg-naver-green text-white font-bold'
                : 'bg-ink-800 text-ink-300 hover:bg-ink-700'
            }`}
          >
            {f === 'all' ? '전체' : f === 'published' ? '발행' : '임시저장'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-ink-500">로딩 중...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-ink-500">
          <p className="mb-2">글이 없습니다.</p>
          {canWrite && (
            <button
              onClick={() => setShowEditor(true)}
              className="text-naver-neon hover:underline text-sm"
            >
              첫 번째 글 작성하기 →
            </button>
          )}
        </div>
      ) : (
        <div className="bg-ink-900 border border-ink-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-700 text-ink-400">
                <th className="text-left px-4 py-3 font-medium">제목</th>
                <th className="text-center px-4 py-3 font-medium">카테고리</th>
                <th className="text-center px-4 py-3 font-medium">SEO</th>
                <th className="text-center px-4 py-3 font-medium">상태</th>
                <th className="text-right px-4 py-3 font-medium">조회</th>
                <th className="text-left px-4 py-3 font-medium">수정일</th>
                <th className="text-center px-4 py-3 font-medium">관리</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-ink-800 hover:bg-ink-800/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {p.is_pinned && <span title="고정">📌</span>}
                      <button
                        onClick={() => {
                          setEditingId(p.id)
                          setShowEditor(true)
                        }}
                        className="text-ink-100 font-medium hover:text-naver-neon text-left break-keep"
                      >
                        {p.title}
                      </button>
                    </div>
                    <p className="text-[11px] text-ink-500 mt-0.5">/{p.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-0.5 bg-ink-800 text-ink-300 text-xs rounded">
                      {CATEGORY_LABELS[p.category] ?? p.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <SeoBadge scores={p.seo_scores} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-0.5 text-xs rounded ${
                        p.is_published
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-ink-700 text-ink-400'
                      }`}
                    >
                      {p.is_published ? '발행' : '임시저장'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-ink-400">{p.view_count}</td>
                  <td className="px-4 py-3 text-ink-500 text-xs">
                    {new Date(p.updated_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {p.is_published && (
                      <a
                        href={`/blog/${p.slug}`}
                        target="_blank"
                        rel="noopener"
                        className="text-naver-neon hover:underline text-xs mr-2"
                      >
                        보기
                      </a>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(p.id, p.title)}
                        className="text-red-400 hover:text-red-300 text-xs"
                      >
                        삭제
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
function SeoBadge({
  scores,
}: {
  scores: PostRow['seo_scores']
}) {
  if (!scores || typeof scores.total !== 'number') {
    return <span className="text-ink-600 text-xs">—</span>
  }
  const { total, grade } = scores
  const cls =
    total >= 70
      ? 'bg-emerald-500/20 text-emerald-300'
      : total >= 40
        ? 'bg-amber-500/20 text-amber-300'
        : 'bg-red-500/20 text-red-300'
  return (
    <span className={`px-2 py-0.5 text-xs font-bold rounded ${cls}`}>
      {total} {grade && `· ${grade}`}
    </span>
  )
}
