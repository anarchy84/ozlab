// ─────────────────────────────────────────────
// /api/admin/distribution/redistribute — 재분배 트리거
// body : { mode: 'unassigned' | 'all' | 'from_counselor', counselor_id?, status_id?, limit? }
// ─────────────────────────────────────────────

import { createAdminClient } from '@/lib/supabase/admin'
import { guardApi } from '@/lib/admin/auth-helpers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const guard = await guardApi(['super_admin', 'marketing', 'tm_lead', 'admin'])
  if (!guard.ok) return guard.response

  const body = await request.json()
  const mode = body.mode ?? 'unassigned'
  const limit = Math.min(Number(body.limit ?? 100), 500)
  const statusId =
    body.status_id === null || body.status_id === undefined || body.status_id === ''
      ? null
      : Number(body.status_id)

  if (statusId !== null && !Number.isInteger(statusId)) {
    return NextResponse.json({ error: 'status_id가 올바르지 않습니다.' }, { status: 400 })
  }

  if (mode === 'from_counselor' && !body.counselor_id) {
    return NextResponse.json({ error: '회수할 담당자를 선택하세요.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin.rpc('redistribute_consultations', {
    p_target_counselor: mode === 'from_counselor' ? body.counselor_id ?? null : null,
    p_unassigned_only: mode === 'unassigned',
    p_limit: limit,
    p_status_id: statusId,
    p_exclude_counselor: mode === 'from_counselor' ? body.counselor_id ?? null : null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ assigned: (data as unknown[] | null)?.length ?? 0, results: data })
}
