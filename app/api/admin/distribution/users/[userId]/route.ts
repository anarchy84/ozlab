// ─────────────────────────────────────────────
// /api/admin/distribution/users/[userId] — 담당자별 자동분배 상태
// ─────────────────────────────────────────────

import { createAdminClient } from '@/lib/supabase/admin'
import { guardApi } from '@/lib/admin/auth-helpers'
import { NextRequest, NextResponse } from 'next/server'

interface PatchBody {
  distribution_enabled?: unknown
  distribution_weight?: unknown
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
    update.distribution_pause_reason = null
    update.distribution_paused_until = null
    update.distribution_note = null
  }

  if (body.distribution_weight !== undefined) {
    const weight = Number(body.distribution_weight)
    if (![0.5, 1, 2].includes(weight)) {
      return NextResponse.json(
        { error: '분배 배수는 1/2배수, 1배수, 2배수만 가능합니다.' },
        { status: 400 },
      )
    }
    update.distribution_weight = weight
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('admin_users')
    .update(update)
    .eq('user_id', params.userId)
    .select(
      `user_id, role, display_name, department, is_active,
       distribution_enabled, distribution_pause_reason,
       distribution_paused_until, distribution_note,
       distribution_weight, distribution_score`,
    )
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ member: data })
}
