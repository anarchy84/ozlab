// ─────────────────────────────────────────────
// /api/admin/consultation-policy — 상담 DB 접수 정책 설정
//   - 동일 연락처 중복 접수 제한 기간을 content_blocks 에 저장
//   - 설정값이 없으면 public 신청 API 는 기본 30일로 동작
// ─────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { guardApi } from '@/lib/admin/auth-helpers'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  CONSULTATION_POLICY_BLOCK_KEY,
  MAX_DUPLICATE_PHONE_WINDOW_DAYS,
  MIN_DUPLICATE_PHONE_WINDOW_DAYS,
  coerceDuplicatePhoneWindowDays,
} from '@/lib/consultation-policy'
import {
  getConsultationPolicySettings,
  makeConsultationPolicyBlockValue,
} from '@/lib/consultation-policy-server'

export async function GET() {
  const guard = await guardApi()
  if (!guard.ok) return guard.response

  const settings = await getConsultationPolicySettings()
  return NextResponse.json({ settings })
}

interface PatchBody {
  duplicatePhoneWindowDays?: unknown
  duplicate_phone_window_days?: unknown
}

export async function PATCH(request: NextRequest) {
  const guard = await guardApi(['super_admin', 'admin', 'marketing', 'tm_lead'])
  if (!guard.ok) return guard.response

  let body: PatchBody
  try {
    body = (await request.json()) as PatchBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const days = coerceDuplicatePhoneWindowDays(
    body.duplicatePhoneWindowDays ?? body.duplicate_phone_window_days,
  )

  if (!days) {
    return NextResponse.json(
      {
        error: `중복 DB 인정기간은 ${MIN_DUPLICATE_PHONE_WINDOW_DAYS}~${MAX_DUPLICATE_PHONE_WINDOW_DAYS}일 사이로 입력해주세요.`,
      },
      { status: 400 },
    )
  }

  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('content_blocks')
    .select('block_key, value, semantic_tag')
    .eq('block_key', CONSULTATION_POLICY_BLOCK_KEY)
    .maybeSingle()

  if (existing) {
    await admin.from('content_block_history').insert({
      block_key: existing.block_key,
      value: existing.value,
      semantic_tag: existing.semantic_tag,
      updated_by: guard.profile.user_id,
    })
  }

  const { data, error } = await admin
    .from('content_blocks')
    .upsert(
      {
        block_key: CONSULTATION_POLICY_BLOCK_KEY,
        block_type: 'text',
        value: makeConsultationPolicyBlockValue(days),
        semantic_tag: null,
        page_path: null,
        note: '상담 신청 동일 연락처 중복 접수 제한 기간(일)',
        updated_by: guard.profile.user_id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'block_key' },
    )
    .select('value, updated_at')
    .single()

  if (error) {
    console.error('[consultation-policy PATCH]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    settings: {
      duplicatePhoneWindowDays: days,
      updatedAt: data?.updated_at ?? null,
      source: 'database',
    },
  })
}
