// ─────────────────────────────────────────────
// /api/admin/distribution/redistribute — 재분배 트리거
// body : { mode: 'unassigned' | 'all' | 'from_counselor', counselor_id?, limit? }
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

  const admin = createAdminClient()
  const { data, error } = await admin.rpc('redistribute_consultations', {
    p_target_counselor: mode === 'from_counselor' ? body.counselor_id ?? null : null,
    p_unassigned_only: mode === 'unassigned',
    p_limit: limit,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ assigned: (data as unknown[] | null)?.length ?? 0, results: data })
}
