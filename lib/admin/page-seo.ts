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
 * 페이지 generateMetadata 헬퍼 — base (publicMetadata 결과) + DB page_seo 병합
 *
 * DB 값이 있으면 우선, 없으면 base 그대로 (코드 fallback).
 *
 * 사용 예 (페이지 page.tsx):
 *
 *   export async function generateMetadata(): Promise<Metadata> {
 *     const base = publicMetadata({ title, description, path, keywords })
 *     return mergePageMetadata(path, base)
 *   }
 */
export async function mergePageMetadata(
  pagePath: string,
  base: Metadata,
): Promise<Metadata> {
  const seo = await getPageSeo(pagePath)
  if (!seo) return base

  const merged: Metadata = { ...base }

  if (seo.meta_title) merged.title = seo.meta_title
  if (seo.meta_description) merged.description = seo.meta_description
  if (seo.keywords) {
    merged.keywords = seo.keywords.split(',').map((k) => k.trim()).filter(Boolean)
  }

  const ogTitle = seo.og_title ?? seo.meta_title ?? (typeof base.title === 'string' ? base.title : undefined)
  const ogDescription = seo.og_description ?? seo.meta_description ?? base.description ?? undefined
  const images = seo.og_image_url ? [seo.og_image_url] : undefined

  merged.openGraph = {
    ...base.openGraph,
    title: ogTitle,
    description: ogDescription ?? undefined,
    ...(images ? { images } : {}),
  }
  merged.twitter = {
    ...base.twitter,
    card: (seo.twitter_card as 'summary_large_image') ?? 'summary_large_image',
    title: ogTitle,
    description: ogDescription ?? undefined,
    ...(images ? { images } : {}),
  }

  return merged
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
