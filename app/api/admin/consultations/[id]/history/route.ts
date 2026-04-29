// ─────────────────────────────────────────────
// /api/admin/consultations/[id]/history
//
// 상담 1건의 상태 변경 이력 + 메시지 발송 이력 반환.
// 모달에서 이력 표시용.
// ─────────────────────────────────────────────
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { guardApi } from '@/lib/admin/auth-helpers'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const guard = await guardApi()
  if (!guard.ok) return guard.response

  const supabase = createClient()

  const [historyRes, messagesRes] = await Promise.all([
    supabase
      .from('consultation_status_history')
      .select(`
        id, changed_at, status_id, memo, changed_by,
        db_statuses(label, bg_color, text_color)
      `)
      .eq('consultation_id', params.id)
      .order('changed_at', { ascending: false })
      .limit(50),
    supabase
      .from('consultation_messages')
      .select('id, sent_at, channel, template_code, body, success, error_message')
      .eq('consultation_id', params.id)
      .order('sent_at', { ascending: false })
      .limit(50),
  ])

  return NextResponse.json({
    history: historyRes.data ?? [],
    messages: messagesRes.data ?? [],
    history_error: historyRes.error?.message,
    messages_error: messagesRes.error?.message,
  })
}
