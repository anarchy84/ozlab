// ─────────────────────────────────────────────
// /api/admin/distribution/users/[userId] — 담당자별 자동분배 상태
// ─────────────────────────────────────────────

import { createAdminClient } from '@/lib/supabase/admin'
import { guardApi } from '@/lib/admin/auth-helpers'
import { NextRequest, NextResponse } from 'next/server'

const REASONS = new Set(['manual', 'leave', 'busy', 'other'])

interface PatchBody {
  distribution_enabled?: unknown
  distribution_pause_reason?: unknown
  distribution_paused_until?: unknown
  distribution_note?: unknown
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } },
) {
  const guard = await guardApi(['super_admin', 'marketing', 'tm_lead', 'admin'])
  if (!guard.ok) return guard.response

  const body = (await request.json()) as PatchBody
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (body.distribution_enabled !== undefined) {
    update.distribution_enabled = Boolean(body.distribution_enabled)
  }

  if (body.distribution_pause_reason !== undefined) {
    const reason =
      typeof body.distribution_pause_reason === 'string'
        ? body.distribution_pause_reason
        : ''
    update.distribution_pause_reason = REASONS.has(reason) ? reason : null
  }

  if (body.distribution_paused_until !== undefined) {
    const value =
      typeof body.distribution_paused_until === 'string'
        ? body.distribution_paused_until.trim()
        : ''
    if (!value) {
      update.distribution_paused_until = null
    } else {
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) {
        return NextResponse.json(
          { error: '분배 중지 종료일이 올바르지 않습니다.' },
          { status: 400 },
        )
      }
      update.distribution_paused_until = date.toISOString()
    }
  }

  if (body.distribution_note !== undefined) {
    const note =
      typeof body.distribution_note === 'string'
        ? body.distribution_note.trim().slice(0, 500)
        : ''
    update.distribution_note = note.length ? note : null
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('admin_users')
    .update(update)
    .eq('user_id', params.userId)
    .select(
      `user_id, role, display_name, department, is_active,
       distribution_enabled, distribution_pause_reason,
       distribution_paused_until, distribution_note`,
    )
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ member: data })
}
