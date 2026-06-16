// ─────────────────────────────────────────────
// /api/admin/posts/[id] — 글 단건 조회·수정·삭제
// ─────────────────────────────────────────────

import { createAdminClient } from '@/lib/supabase/admin'
import { guardApi } from '@/lib/admin/auth-helpers'
import { calcSeoScore, serializeScoreCache } from '@/lib/seo-score'
import { renderMarkdown } from '@/lib/markdown'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

function adminClientOrResponse() {
  try {
    return { admin: createAdminClient(), response: null }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Supabase admin client init failed'
    return { admin: null, response: NextResponse.json({ error: message }, { status: 500 }) }
  }
}

function publicPostPath(category: string | null | undefined, slug: string): string {
  return category === 'blog' ? `/blog/${slug}` : `/tips/${slug}`
}

// slug 정규화 — 수동 입력값에도 적용해서 공백/이상 문자 제거
// (DB CHECK 제약 content_posts_slug_no_whitespace 위반 방지 + 깨진 URL 재발 차단)
function normalizeSlug(raw: string | null | undefined): string {
  return (raw ?? '')
    .trim() // 앞뒤 공백 제거 (' toss-...' → 'toss-...')
    .replace(/\s+/g, '-') // 중간 공백 → 하이픈
    .replace(/-+/g, '-') // 연속 하이픈 정리
    .replace(/^-+|-+$/g, '') // 앞뒤 하이픈 제거
}

function revalidatePostPaths(category: string | null | undefined, slug: string) {
  revalidatePath(publicPostPath(category, slug))
  revalidatePath(category === 'blog' ? '/blog' : '/tips')
  revalidatePath('/sitemap.xml')
  revalidatePath('/llms.txt')
}

// ─── GET : 단건 조회 ────────────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await guardApi(['super_admin', 'admin', 'marketer', 'viewer'])
  if (!guard.ok) return guard.response

  const { admin, response } = adminClientOrResponse()
  if (!admin) return response

  const { data, error } = await admin
    .from('content_posts')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })

  // Lazy migration: body_html 비었고 body_md 있으면 변환해서 반환
  // (저장 시점에 영구 저장됨)
  if ((!data.body_html || data.body_html.trim() === '') && data.body_md) {
    data.body_html = renderMarkdown(data.body_md)
  }

  return NextResponse.json(data)
}

// ─── PUT : 수정 ────────────────────────────
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await guardApi(['super_admin', 'admin', 'marketer'])
  if (!guard.ok) return guard.response

  const body = await request.json()
  const { admin, response } = adminClientOrResponse()
  if (!admin) return response

  const { data: existingPost } = await admin
    .from('content_posts')
    .select('published_at, slug, category, is_published')
    .eq('id', params.id)
    .single()

  // 수동 입력 slug 정규화 (공백 등 오염 차단)
  const slug = normalizeSlug(body.slug)

  // 처음 발행 시 published_at 보존
  let publishedAt: string | null | undefined = body.published_at
  if (body.is_published) {
    if (!publishedAt) {
      publishedAt = existingPost?.published_at ?? new Date().toISOString()
    }
  } else {
    publishedAt = null
  }

  // 점수 재계산 + 캐시
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

  const { data, error } = await admin
    .from('content_posts')
    .update({
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
      author_name: body.author_name,
      is_pinned: body.is_pinned === true,
      is_published: body.is_published === true,
      published_at: publishedAt,
      seo_scores: serializeScoreCache(seoResult),
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: '같은 slug 의 글이 이미 있습니다.' },
        { status: 409 }
      )
    }
    if (error.code === '23514') {
      // CHECK 제약(content_posts_slug_no_whitespace) 위반
      return NextResponse.json(
        { error: 'slug 에 공백을 넣을 수 없습니다. 영문 소문자·숫자·하이픈(-)만 사용하세요.' },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 발행된 글이면 캐시 무효화 (즉시 라이브 반영)
  if (data?.is_published && data?.slug) {
    revalidatePostPaths(data.category, data.slug)
  }
  if (
    existingPost?.is_published &&
    existingPost.slug &&
    (existingPost.slug !== data?.slug || existingPost.category !== data?.category)
  ) {
    revalidatePostPaths(existingPost.category, existingPost.slug)
  }

  return NextResponse.json(data)
}

// ─── DELETE : 삭제 ─────────────────────────
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await guardApi(['super_admin', 'admin'])
  if (!guard.ok) return guard.response

  const { admin, response } = adminClientOrResponse()
  if (!admin) return response

  // 삭제 전 slug 확보 (캐시 무효화용)
  const { data: existing } = await admin
    .from('content_posts')
    .select('slug, category, is_published')
    .eq('id', params.id)
    .single()

  const { error } = await admin.from('content_posts').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (existing?.is_published && existing?.slug) {
    revalidatePostPaths(existing.category, existing.slug)
  }

  return NextResponse.json({ success: true })
}
