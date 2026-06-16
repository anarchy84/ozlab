// ─────────────────────────────────────────────
// 동의 항목 — 서버 전용 조회 헬퍼
//   - content_blocks 에서 세 동의 항목을 읽어 ConsentSettings 로 반환
//   - 공개 API(/api/consent) 와 어드민 읽기에서 사용
//   - Server Component · Route Handler 에서만 import 할 것
// ─────────────────────────────────────────────

import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  CONSENT_KINDS,
  CONSENT_META,
  DEFAULT_CONSENTS,
  parseConsentItem,
  type ConsentSettings,
} from './consent'

/** 세 동의 항목을 1쿼리로 조회 (없으면 기본값으로 채움) */
export async function getConsentSettings(): Promise<ConsentSettings> {
  try {
    const supabase = createAdminClient()
    const keys = CONSENT_KINDS.map((k) => CONSENT_META[k].blockKey)
    const { data, error } = await supabase
      .from('content_blocks')
      .select('block_key, value')
      .in('block_key', keys)

    if (error || !data) return DEFAULT_CONSENTS

    const byKey = new Map<string, unknown>()
    for (const row of data) byKey.set(row.block_key, row.value)

    const result = {} as ConsentSettings
    for (const kind of CONSENT_KINDS) {
      result[kind] = parseConsentItem(
        byKey.get(CONSENT_META[kind].blockKey),
        DEFAULT_CONSENTS[kind],
      )
    }
    return result
  } catch (err) {
    console.error('[consent settings fallback]', err)
    return DEFAULT_CONSENTS
  }
}
