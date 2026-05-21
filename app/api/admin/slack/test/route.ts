// ─────────────────────────────────────────────
// /api/admin/slack/test — 테스트 메시지 발송 (super_admin)
//
// POST { channel_code?: string, slack_user_id?: string, text?: string }
//   - channel_code 주면 해당 채널로 broadcast
//   - slack_user_id 주면 해당 사용자에게 DM (SLACK_BOT_TOKEN 필요)
//   - 둘 다 비면 400
// ─────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { guardApi } from '@/lib/admin/auth-helpers'
import { sendToSlackChannel, sendSlackDM } from '@/lib/slack'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface TestBody {
  channel_code?: string
  slack_user_id?: string
  text?: string
}

export async function POST(req: NextRequest) {
  const guard = await guardApi(['super_admin'])
  if (!guard.ok) return guard.response

  let body: TestBody
  try {
    body = (await req.json()) as TestBody
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  const text =
    (body.text && body.text.trim().length > 0
      ? body.text.trim()
      : `✅ *오즈랩페이 슬랙 알림 테스트*\n발송자: ${guard.profile.display_name ?? guard.profile.email}\n시각: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`)

  if (body.channel_code) {
    const ok = await sendToSlackChannel(body.channel_code, { text })
    return NextResponse.json({
      success: ok,
      message: ok
        ? `채널 '${body.channel_code}' 으로 발송 완료`
        : `발송 실패 — 채널이 등록되지 않았거나 Webhook URL 이 잘못됨`,
    })
  }

  if (body.slack_user_id) {
    const ok = await sendSlackDM(body.slack_user_id, { text })
    return NextResponse.json({
      success: ok,
      message: ok
        ? `사용자 ${body.slack_user_id} 에게 DM 발송 완료`
        : `DM 실패 — SLACK_BOT_TOKEN 환경변수 미설정 또는 사용자 ID 가 잘못됨`,
    })
  }

  return NextResponse.json(
    { error: 'channel_code 또는 slack_user_id 중 하나는 필수' },
    { status: 400 },
  )
}
