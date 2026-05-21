// ─────────────────────────────────────────────
// lib/admin/page-seo.ts — 페이지별 SEO 메타 헬퍼 (DB-first)
//
// generateMetadata 에서 사용:
//   const seo = await getPageSeo('/')
//   return { title: seo?.meta_title ?? '기본 제목', openGraph: { images: [seo?.og_image_url] } }
// ─────────────────────────────────────────────

import { createAdminClient } from '@/lib/supabase/admin'
import type { Metadata } from 'next'

export interface PageSeo {
  page_path: string
  page_label: string | null
  og_image_url: string | null
  og_title: string | null
  og_description: string | null
  meta_title: string | null
  meta_description: string | null
  twitter_card: string | null
  keywords: string | null
  is_active: boolean
  updated_at: string
}

/** 단일 페이지 SEO 조회 — 없으면 null */
export async function getPageSeo(pagePath: string): Promise<PageSeo | null> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('page_seo')
      .select(
        'page_path, page_label, og_image_url, og_title, og_description, meta_title, meta_description, twitter_card, keywords, is_active, updated_at',
      )
      .eq('page_path', pagePath)
      .eq('is_active', true)
      .maybeSingle()
    if (error) {
      console.error('[getPageSeo]', error)
      return null
    }
    return data
  } catch (err) {
    console.error('[getPageSeo] failed', err)
    return null
  }
}

/** 모든 페이지 SEO 목록 */
export async function listPageSeo(): Promise<PageSeo[]> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('page_seo')
      .select(
        'page_path, page_label, og_image_url, og_title, og_description, meta_title, meta_description, twitter_card, keywords, is_active, updated_at',
      )
      .order('page_path', { ascending: true })
    if (error) {
      console.error('[listPageSeo]', error)
      return []
    }
    return data ?? []
  } catch (err) {
    console.error('[listPageSeo] failed', err)
    return []
  }
}

/**
 * 페이지 generateMetadata 헬퍼
 *
 * 사용 예 (페이지 page.tsx 에 추가):
 *
 *   export async function generateMetadata(): Promise<Metadata> {
 *     return buildPageMetadata('/internet', {
 *       title: '인터넷 가입 | 오즈랩페이',
 *       description: '소상공인 전용 인터넷·전화 가입 — 최저가 보장',
 *     })
 *   }
 *
 * DB 값 우선, 없으면 defaults, defaults 도 없으면 layout 의 기본값.
 */
export async function buildPageMetadata(
  pagePath: string,
  defaults: { title?: string; description?: string; keywords?: string } = {},
): Promise<Metadata> {
  const seo = await getPageSeo(pagePath)
  const title = seo?.meta_title ?? defaults.title
  const description = seo?.meta_description ?? defaults.description
  const ogTitle = seo?.og_title ?? seo?.meta_title ?? defaults.title
  const ogDescription = seo?.og_description ?? seo?.meta_description ?? defaults.description
  const images = seo?.og_image_url ? [seo.og_image_url] : undefined

  const md: Metadata = {}
  if (title) md.title = title
  if (description) md.description = description
  if (seo?.keywords || defaults.keywords) {
    md.keywords = (seo?.keywords ?? defaults.keywords)?.split(',').map((k) => k.trim()).filter(Boolean)
  }

  md.openGraph = {
    title: ogTitle,
    description: ogDescription,
    images,
    type: 'website',
    locale: 'ko_KR',
  }
  md.twitter = {
    card: (seo?.twitter_card as 'summary_large_image') ?? 'summary_large_image',
    title: ogTitle,
    description: ogDescription,
    images,
  }

  return md
}

/** Upsert (어드민에서 저장) */
export async function upsertPageSeo(
  pagePath: string,
  patch: Partial<Omit<PageSeo, 'page_path' | 'updated_at'>>,
  userId: string,
): Promise<{ ok: true; data: PageSeo } | { ok: false; error: string }> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('page_seo')
      .upsert(
        {
          page_path: pagePath,
          ...patch,
          updated_by: userId,
        },
        { onConflict: 'page_path' },
      )
      .select()
      .single()
    if (error) return { ok: false, error: error.message }
    return { ok: true, data: data as PageSeo }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
