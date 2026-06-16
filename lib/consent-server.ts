// ─────────────────────────────────────────────
// 선택 동의 — 서버 전용 조회 헬퍼
//   - content_blocks 에서 두 동의 항목을 읽어 ConsentSettings 로 반환
//   - 공개 API(/api/consent) 와 어드민 읽기에서 사용
//   - Server Component · Route Handler 에서만 import 할 것
// ─────────────────────────────────────────────

import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  CONSENT_BLOCK_KEYS,
  DEFAULT_CONSENTS,
  parseConsentItem,
  type ConsentSettings,
} from './consent'

/** 두 동의 항목을 1쿼리로 조회 (없으면 기본값으로 채움) */
export async function getConsentSettings(): Promise<ConsentSettings> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('content_blocks')
      .select('block_key, value')
      .in('block_key', [CONSENT_BLOCK_KEYS.marketing, CONSENT_BLOCK_KEYS.third_party])

    if (error || !data) return DEFAULT_CONSENTS

    const byKey = new Map<string, unknown>()
    for (const row of data) byKey.set(row.block_key, row.value)

    return {
      marketing: parseConsentItem(
        byKey.get(CONSENT_BLOCK_KEYS.marketing),
        DEFAULT_CONSENTS.marketing,
      ),
      third_party: parseConsentItem(
        byKey.get(CONSENT_BLOCK_KEYS.third_party),
        DEFAULT_CONSENTS.third_party,
      ),
    }
  } catch (err) {
    console.error('[consent settings fallback]', err)
    return DEFAULT_CONSENTS
  }
}
