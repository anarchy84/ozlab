import { createAdminClient } from '@/lib/supabase/admin'
import {
  CONSULTATION_POLICY_BLOCK_KEY,
  DEFAULT_DUPLICATE_PHONE_WINDOW_DAYS,
  coerceDuplicatePhoneWindowDays,
} from '@/lib/consultation-policy'

interface RawPolicyBlock {
  value: unknown
  updated_at: string | null
}

interface PolicyBlockValue {
  text: string
  duplicate_phone_window_days: number
}

export interface ConsultationPolicySettings {
  duplicatePhoneWindowDays: number
  updatedAt: string | null
  source: 'database' | 'default'
}

export function makeConsultationPolicyBlockValue(days: number): PolicyBlockValue {
  return {
    text: String(days),
    duplicate_phone_window_days: days,
  }
}

export function parseConsultationPolicyValue(
  value: unknown,
): number {
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return (
      coerceDuplicatePhoneWindowDays(record.duplicate_phone_window_days) ??
      coerceDuplicatePhoneWindowDays(record.text) ??
      DEFAULT_DUPLICATE_PHONE_WINDOW_DAYS
    )
  }

  return coerceDuplicatePhoneWindowDays(value) ?? DEFAULT_DUPLICATE_PHONE_WINDOW_DAYS
}

export async function getConsultationPolicySettings(): Promise<ConsultationPolicySettings> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('content_blocks')
      .select('value, updated_at')
      .eq('block_key', CONSULTATION_POLICY_BLOCK_KEY)
      .maybeSingle()

    if (error) {
      console.error('[consultation-policy GET]', error)
      return defaultSettings()
    }

    if (!data) return defaultSettings()

    const block = data as RawPolicyBlock
    return {
      duplicatePhoneWindowDays: parseConsultationPolicyValue(block.value),
      updatedAt: block.updated_at,
      source: 'database',
    }
  } catch (err) {
    console.error('[consultation-policy fallback]', err)
    return defaultSettings()
  }
}

function defaultSettings(): ConsultationPolicySettings {
  return {
    duplicatePhoneWindowDays: DEFAULT_DUPLICATE_PHONE_WINDOW_DAYS,
    updatedAt: null,
    source: 'default',
  }
}
