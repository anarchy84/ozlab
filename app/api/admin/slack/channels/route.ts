// ─────────────────────────────────────────────
// /api/admin/slack/channels — 슬랙 채널 CRUD (super_admin)
//
// GET  : 채널 목록
// POST : 신규 채널 등록
//        body: { code, label, channel_purpose?, webhook_url, is_active?, note? }
// ─────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { guardApi } from '@/lib/admin/auth-helpers'
import { invalidateSlackChannelCache } from '@/lib/slack'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ----- 슬랙 Webhook URL 형식 검증 -----
// 형식: hooks(.)slack(.)com/services/T{팀ID}/B{봇ID}/{토큰}
function isValidSlackWebhook(url: string): boolean {
  return /^https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[A-Za-z0-9]+$/.test(url)
}

function isValidCode(code: string): boolean {
  return /^[a-z][a-z0-9_]{2,40}$/.test(code)
}

interface PostBody {
  code?: string
  label?: string
  channel_purpose?: string | null
  webhook_url?: string
  is_active?: boolean
  note?: string | null
}

export async function GET() {
  const guard = await guardApi(['super_admin'])
  if (!guard.ok) return guard.response

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('slack_channels')
    .select('id, code, label, channel_purpose, webhook_url, is_active, note, created_at, updated_at')
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ channels: data ?? [] })
}

export async function POST(req: NextRequest) {
  const guard = await guardApi(['super_admin'])
  if (!guard.ok) return guard.response

  let body: PostBody
  try {
    body = (await req.json()) as PostBody
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  const code = (body.code ?? '').trim().toLowerCase()
  const label = (body.label ?? '').trim()
  const webhookUrl = (body.webhook_url ?? '').trim()

  if (!isValidCode(code)) {
    return NextResponse.json(
      { error: '채널 코드: 소문자/숫자/언더스코어, 3~40자, 영문 시작' },
      { status: 400 },
    )
  }
  if (label.length < 1 || label.length > 80) {
    return NextResponse.json({ error: '채널 이름은 1~80자' }, { status: 400 })
  }
  if (!isValidSlackWebhook(webhookUrl)) {
    return NextResponse.json(
      {
        error:
          '슬랙 Webhook URL 형식이 아닙니다. (https://hooks.slack.com/services/...)',
      },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('slack_channels')
    .insert({
      code,
      label,
      channel_purpose: body.channel_purpose ?? null,
      webhook_url: webhookUrl,
      is_active: body.is_active ?? true,
      note: body.note ?? null,
      created_by: guard.profile.user_id,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: `채널 코드 '${code}' 가 이미 존재합니다.` },
        { status: 409 },
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  invalidateSlackChannelCache(code)
  return NextResponse.json({ success: true, channel: data })
}
