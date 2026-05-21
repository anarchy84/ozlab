// ─────────────────────────────────────────────
// /api/admin/page-seo — 페이지 SEO 목록 + Upsert (super_admin)
//
// GET  : 모든 페이지 SEO 목록
// PUT  : { page_path, ...patch } upsert
// POST : 신규 page_path 등록 (시드 외 페이지)
// ─────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { guardApi } from '@/lib/admin/auth-helpers'
import { listPageSeo, upsertPageSeo, type PageSeo } from '@/lib/admin/page-seo'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await guardApi(['super_admin'])
  if (!guard.ok) return guard.response
  const rows = await listPageSeo()
  return NextResponse.json({ pages: rows })
}

export async function PUT(req: NextRequest) {
  const guard = await guardApi(['super_admin'])
  if (!guard.ok) return guard.response

  let body: Partial<PageSeo> & { page_path?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  const pagePath = (body.page_path ?? '').trim()
  if (!pagePath.startsWith('/')) {
    return NextResponse.json({ error: 'page_path 는 / 로 시작' }, { status: 400 })
  }

  // 길이 검증 (가벼움)
  if (body.meta_title && body.meta_title.length > 200) {
    return NextResponse.json({ error: 'meta_title 200자 초과' }, { status: 400 })
  }
  if (body.meta_description && body.meta_description.length > 500) {
    return NextResponse.json({ error: 'meta_description 500자 초과' }, { status: 400 })
  }

  const patch: Partial<PageSeo> = {}
  for (const k of [
    'page_label',
    'og_image_url',
    'og_title',
    'og_description',
    'meta_title',
    'meta_description',
    'twitter_card',
    'keywords',
    'is_active',
  ] as const) {
    if (body[k] !== undefined) {
      // 빈 문자열은 null 로 정규화
      const v = body[k]
      ;(patch as Record<string, unknown>)[k] =
        typeof v === 'string' && v.trim().length === 0 ? null : v
    }
  }

  const r = await upsertPageSeo(pagePath, patch, guard.profile.user_id)
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 500 })
  return NextResponse.json({ success: true, page: r.data })
}

export async function POST(req: NextRequest) {
  const guard = await guardApi(['super_admin'])
  if (!guard.ok) return guard.response

  let body: { page_path?: string; page_label?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  const pagePath = (body.page_path ?? '').trim()
  if (!pagePath.startsWith('/')) {
    return NextResponse.json({ error: 'page_path 는 / 로 시작' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('page_seo')
    .insert({
      page_path: pagePath,
      page_label: body.page_label ?? pagePath,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '이미 등록된 페이지' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true, page: data })
}
