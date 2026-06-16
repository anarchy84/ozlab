// ─────────────────────────────────────────────
// /api/admin/settings/consent — 선택 동의 항목(마케팅/제3자) 편집
//
// 권한: super_admin / admin (약관성 법적 문구라 운영 권한자에 한정)
//
// GET : 현재 두 동의 항목 { marketing, third_party } 반환
// PUT : 입력값 UPSERT (content_blocks)
//       body: { marketing?: {enabled,label,body}, third_party?: {enabled,label,body} }
//       안 보낸 항목은 변경하지 않음
//
// 적용 흐름:
//   - 저장 후 /api/consent (공개 폼이 읽는 엔드포인트) 캐시 무효화
//   - CDN s-maxage(600s) 때문에 외부 반영은 최대 10분 (stale-while-revalidate)
// ─────────────────────────────────────────────

import { createAdminClient } from '@/lib/supabase/admin'
import { guardApi } from '@/lib/admin/auth-helpers'
import { getConsentSettings } from '@/lib/consent-server'
import {
  CONSENT_KINDS,
  CONSENT_META,
  type ConsentItem,
  type ConsentKind,
} from '@/lib/consent'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const KINDS: ConsentKind[] = CONSENT_KINDS
const LABEL_MAX = 200
const BODY_MAX = 20000

export async function GET() {
  const guard = await guardApi(['super_admin', 'admin'])
  if (!guard.ok) return guard.response

  const settings = await getConsentSettings()
  return NextResponse.json(settings)
}

// 입력값 정규화·검증 — 잘못된 형태면 null 반환(=해당 항목 건너뜀)
function sanitizeItem(raw: unknown): ConsentItem | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const label = typeof r.label === 'string' ? r.label.trim() : ''
  const body = typeof r.body === 'string' ? r.body : ''
  if (label.length === 0) return null // 라벨은 필수
  if (label.length > LABEL_MAX || body.length > BODY_MAX) return null
  return {
    enabled: r.enabled === true,
    label,
    body,
  }
}

export async function PUT(req: NextRequest) {
  const guard = await guardApi(['super_admin', 'admin'])
  if (!guard.ok) return guard.response

  let body: Partial<Record<ConsentKind, unknown>>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 })
  }

  const admin = createAdminClient()
  const errors: Array<{ key: string; error: string }> = []

  for (const kind of KINDS) {
    if (!(kind in body)) continue // 안 보낸 항목은 변경 안 함
    const item = sanitizeItem(body[kind])
    if (!item) {
      errors.push({ key: kind, error: '라벨은 필수이며 길이 제한을 초과할 수 없습니다.' })
      continue
    }

    const { error } = await admin
      .from('content_blocks')
      .upsert(
        {
          block_key: CONSENT_META[kind].blockKey,
          block_type: 'text',
          value: item,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'block_key' },
      )
    if (error) errors.push({ key: kind, error: error.message })
  }

  if (errors.length > 0) {
    return NextResponse.json(
      { error: '일부 항목 저장 실패', details: errors },
      { status: 400 },
    )
  }

  // 공개 폼이 읽는 엔드포인트 캐시 무효화
  revalidatePath('/api/consent')

  const updated = await getConsentSettings()
  return NextResponse.json({ success: true, settings: updated })
}
