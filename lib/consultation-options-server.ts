// ─────────────────────────────────────────────
// 서버 컴포넌트 / API 라우트에서 사용하는 상담 옵션 fetch 헬퍼.
//
// ⚠️ 서버 전용. 'use client' 컴포넌트에서 import 금지.
//
// 사용처 :
//   - app/(home)/page.tsx 등 랜딩 ApplyForm 부모 (SSR 시 prefetch)
//   - app/admin/(shell)/settings/consultation-options/page.tsx (전체 리스트 SSR)
// ─────────────────────────────────────────────

import { createAdminClient } from '@/lib/supabase/admin'
import {
  CONSULTATION_FIELD_KEYS,
  FALLBACK_OPTIONS,
  groupOptionsByField,
  type ConsultationFieldKey,
  type ConsultationFieldOption,
} from './consultation-options'

/**
 * 활성 옵션 전체를 필드별로 묶어 반환.
 * DB fetch 실패 시 FALLBACK_OPTIONS 로 안전망 처리.
 */
export async function loadActiveConsultationOptions(): Promise<
  Record<ConsultationFieldKey, string[]>
> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('consultation_field_options')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('value', { ascending: true })

    if (error || !data) {
      console.warn('[loadActiveConsultationOptions] fallback 사용:', error?.message)
      return buildFallback()
    }
    return groupOptionsByField(data as ConsultationFieldOption[])
  } catch (e) {
    console.warn('[loadActiveConsultationOptions] 예외 발생, fallback 사용:', e)
    return buildFallback()
  }
}

/**
 * 어드민 설정 페이지용 — 비활성 포함 전체 옵션 리스트.
 */
export async function loadAllConsultationOptions(): Promise<ConsultationFieldOption[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('consultation_field_options')
    .select('*')
    .order('field_key', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('value', { ascending: true })

  if (error) {
    console.error('[loadAllConsultationOptions]', error)
    return []
  }
  return (data ?? []) as ConsultationFieldOption[]
}

function buildFallback(): Record<ConsultationFieldKey, string[]> {
  const result = {} as Record<ConsultationFieldKey, string[]>
  for (const key of CONSULTATION_FIELD_KEYS) {
    result[key] = [...FALLBACK_OPTIONS[key]]
  }
  return result
}
