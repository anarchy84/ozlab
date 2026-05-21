// ─────────────────────────────────────────────
// site_settings 헬퍼 (서버 전용)
//
// 패턴:
//   - getSiteSettings()  → 모든 키 한 번에 로드 (layout.tsx SSR 시 1회)
//   - upsertSiteSetting(key, value) → 어드민 API 에서만 호출
//
// 보안:
//   - super_admin 만 수정 가능 (호출자가 guardApi 로 사전 검증해야 함)
//   - service_role 사용 (RLS 우회). 따라서 lib/admin/* 에 둠.
//
// 우선순위 정책:
//   - DB-first + env fallback
//     예: GTM ID → site_settings.gtm_id 우선, 없으면 process.env.NEXT_PUBLIC_GTM_ID, 그것도 없으면 'GTM-N3HSNZPJ' 코드 fallback
//   - 어드민에서 변경하면 즉시 모든 페이지에 반영 (SSR 라 cache 만 풀면 됨)
// ─────────────────────────────────────────────

import { createAdminClient } from '@/lib/supabase/admin'

/** 어드민에서 편집 가능한 모든 키 — UI 필드와 1:1 매핑 */
export const SITE_SETTING_KEYS = [
  'gtm_id',
  'ga4_measurement_id',
  'meta_pixel_id',
  'google_site_verification',
  'naver_site_verification',
  'custom_head_html',
] as const

export type SiteSettingKey = (typeof SITE_SETTING_KEYS)[number]

/** 어드민에서 읽은 site_settings 의 메모리 표현 — value 는 string|null 로 정규화 */
export type SiteSettings = Record<SiteSettingKey, string | null>

const EMPTY: SiteSettings = {
  gtm_id: null,
  ga4_measurement_id: null,
  meta_pixel_id: null,
  google_site_verification: null,
  naver_site_verification: null,
  custom_head_html: null,
}

/**
 * 모든 site_settings 키 한 번에 로드 (layout.tsx SSR 시 호출).
 *   - DB 오류 시 빈 객체 리턴 (사이트 다운 안 시킴)
 *   - value 가 jsonb 'null' 이면 string|null 의 null 로 매핑
 *   - value 가 jsonb string 이면 그대로 string 로 매핑
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('site_settings')
      .select('key, value')
      .in('key', SITE_SETTING_KEYS as unknown as string[])
    if (error || !data) return { ...EMPTY }

    const out: SiteSettings = { ...EMPTY }
    for (const row of data) {
      const k = row.key as SiteSettingKey
      if (!(SITE_SETTING_KEYS as readonly string[]).includes(k)) continue
      const v = row.value
      if (typeof v === 'string') out[k] = v
      else if (v === null) out[k] = null
      else out[k] = typeof v === 'object' ? JSON.stringify(v) : String(v)
    }
    return out
  } catch {
    return { ...EMPTY }
  }
}

/**
 * 특정 키 UPSERT. updated_by 는 호출자가 user_id 전달.
 *   - 빈 문자열은 DB NOT NULL 제약에 맞춰 '' 로 저장 (앱에서는 falsy 로 비어 있음 처리)
 *   - super_admin 권한 체크는 호출자(API 라우트) 책임
 */
export async function upsertSiteSetting(
  key: SiteSettingKey,
  value: string | null,
  updatedBy: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const admin = createAdminClient()
    const stored = value && value.trim().length > 0 ? value.trim() : ''
    const { error } = await admin
      .from('site_settings')
      .upsert(
        {
          key,
          value: stored as unknown as object, // jsonb — 빈 값도 NOT NULL 제약 때문에 '' 로 저장
          updated_by: updatedBy,
        },
        { onConflict: 'key' },
      )
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown' }
  }
}

/**
 * env 우선 → DB fallback → hardcode fallback 의 단일 helper.
 *   - GTM ID 처럼 "코드 박힌 default + 어드민 동적 override" 패턴에 사용
 */
export function resolveValue(opts: {
  dbValue: string | null
  envValue: string | undefined
  fallback?: string | null
}): string | null {
  if (opts.dbValue) return opts.dbValue
  if (opts.envValue) return opts.envValue
  return opts.fallback ?? null
}
