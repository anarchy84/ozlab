// ─────────────────────────────────────────────
// /api/admin/slack/channels/[id] — 개별 채널 수정·삭제
//
// PATCH  : 채널 정보 수정
// DELETE : 채널 제거 (alert_rules 가 참조하면 코드만 무효화됨)
// ─────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { guardApi } from '@/lib/admin/auth-helpers'
import { invalidateSlackChannelCache } from '@/lib/slack'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// 형식: hooks(.)slack(.)com/services/T{팀ID}/B{봇ID}/{토큰}
function isValidSlackWebhook(url: string): boolean {
  return /^https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[A-Za-z0-9]+$/.test(url)
}

interface PatchBody {
  label?: string
  channel_purpose?: string | null
  webhook_url?: string
  is_active?: boolean
  note?: string | null
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const guard = await guardApi(['super_admin'])
  if (!guard.ok) return guard.response

  let body: PatchBody
  try {
    body = (await req.json()) as PatchBody
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}
  if (body.label !== undefined) {
    const v = body.label.trim()
    if (v.length < 1 || v.length > 80) {
      return NextResponse.json({ error: '채널 이름은 1~80자' }, { status: 400 })
    }
    update.label = v
  }
  if (body.channel_purpose !== undefined) update.channel_purpose = body.channel_purpose
  if (body.webhook_url !== undefined) {
    const v = body.webhook_url.trim()
    if (!isValidSlackWebhook(v)) {
      return NextResponse.json(
        { error: '슬랙 Webhook URL 형식이 아닙니다.' },
        { status: 400 },
      )
    }
    update.webhook_url = v
  }
  if (body.is_active !== undefined) update.is_active = !!body.is_active
  if (body.note !== undefined) update.note = body.note

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: '변경할 필드가 없습니다.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('slack_channels')
    .update(update)
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  invalidateSlackChannelCache(data.code)
  return NextResponse.json({ success: true, channel: data })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const guard = await guardApi(['super_admin'])
  if (!guard.ok) return guard.response

  const supabase = createAdminClient()
  // 채널 코드 먼저 조회 → 캐시 무효화
  const { data: found } = await supabase
    .from('slack_channels')
    .select('code')
    .eq('id', params.id)
    .maybeSingle()

  const { error } = await supabase
    .from('slack_channels')
    .delete()
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (found?.code) invalidateSlackChannelCache(found.code)
  return NextResponse.json({ success: true })
}
