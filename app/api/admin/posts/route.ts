// ─────────────────────────────────────────────
// /api/admin/posts — 콘텐츠 글 목록·생성
// 권한 :
//   GET   : super_admin / admin / marketer / viewer
//   POST  : super_admin / admin / marketer
// ─────────────────────────────────────────────

import { createAdminClient } from '@/lib/supabase/admin'
import { guardApi } from '@/lib/admin/auth-helpers'
import { calcSeoScore, serializeScoreCache } from '@/lib/seo-score'
import { NextRequest, NextResponse } from 'next/server'

// slug 자동 생성
function makeSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-zA-Z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 80)
}

// ─── GET : 글 목록 ──────────────────────────
export async function GET(request: NextRequest) {
  const guard = await guardApi(['super_admin', 'admin', 'marketer', 'viewer'])
  if (!guard.ok) return guard.response

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') // 'published' | 'draft' | 'all'

  const admin = createAdminClient()
  let query = admin
    .from('content_posts')
    .select(
      'id, slug, title, excerpt, category, tags, focus_keyword, seo_scores, cover_image, view_count, is_pinned, is_published, published_at, created_at, updated_at, author_name'
    )
    .order('is_pinned', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(200)

  if (status === 'published') query = query.eq('is_published', true)
  else if (status === 'draft') query = query.eq('is_published', false)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// ─── POST : 글 작성 ─────────────────────────
export async function POST(request: NextRequest) {
  const guard = await guardApi(['super_admin', 'admin', 'marketer'])
  if (!guard.ok) return guard.response

  const body = await request.json()

  if (!body.title || typeof body.title !== 'string') {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  const slug = body.slug || makeSlug(body.title)
  const isPublished = body.is_published === true

  // 점수 계산 (저장 시점에 캐시)
  const seoResult = calcSeoScore({
    title: body.title,
    metaTitle: body.meta_title,
    metaDescription: body.meta_description,
    slug,
    bodyHtml: body.body_html ?? '',
    focusKeyword: body.focus_keyword ?? '',
    authorName: body.author_name ?? guard.profile.display_name ?? guard.profile.email,
    updatedAt: new Date().toISOString(),
  })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('content_posts')
    .insert({
      title: body.title,
      slug,
      body_html: body.body_html ?? '',
      body_md: body.body_md ?? null,
      excerpt: body.excerpt ?? null,
      category: body.category ?? 'guide',
      tags: body.tags ?? [],
      focus_keyword: body.focus_keyword ?? null,
      meta_title: body.meta_title ?? null,
      meta_description: body.meta_description ?? null,
      cover_image: body.cover_image ?? null,
      author_name: body.author_name ?? guard.profile.display_name ?? '오즈랩페이',
      author_id: guard.profile.user_id,
      is_pinned: body.is_pinned === true,
      is_published: isPublished,
      published_at: isPublished ? new Date().toISOString() : null,
      seo_scores: serializeScoreCache(seoResult),
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: '같은 slug 의 글이 이미 있습니다. slug 를 바꿔 주세요.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
