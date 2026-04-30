// ─────────────────────────────────────────────
// 블로그 글 fetch 헬퍼 (SSR 전용)
// ─────────────────────────────────────────────
import { createClient } from '@/lib/supabase/server'

export interface ContentPost {
  id: number
  slug: string
  title: string
  excerpt: string | null
  body_md: string
  cover_image: string | null
  category: 'blog' | 'news' | 'case_study' | 'faq' | 'guide'
  tags: string[]
  meta_title: string | null
  meta_description: string | null
  author_name: string
  view_count: number
  is_pinned: boolean
  is_published: boolean
  published_at: string | null
  created_at: string
  updated_at: string
}

const CATEGORY_LABELS: Record<ContentPost['category'], string> = {
  blog: '블로그',
  news: '뉴스',
  case_study: '사례',
  faq: 'FAQ',
  guide: '가이드',
}

export function getCategoryLabel(c: ContentPost['category']): string {
  return CATEGORY_LABELS[c] ?? c
}

export async function listPublishedPosts(category?: string): Promise<ContentPost[]> {
  const supabase = createClient()
  let q = supabase
    .from('content_posts')
    .select('*')
    .eq('is_published', true)
    .order('is_pinned', { ascending: false })
    .order('published_at', { ascending: false })
    .limit(50)
  if (category) q = q.eq('category', category)
  const { data, error } = await q
  if (error) {
    console.error('[listPublishedPosts]', error)
    return []
  }
  return (data as ContentPost[] | null) ?? []
}

export async function getPostBySlug(slug: string): Promise<ContentPost | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('content_posts')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()
  if (error) return null
  return (data as ContentPost | null) ?? null
}

export async function getAllPostSlugs(): Promise<string[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('content_posts')
    .select('slug')
    .eq('is_published', true)
  return (data ?? []).map((r: { slug: string }) => r.slug)
}
