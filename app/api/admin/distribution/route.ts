// ─────────────────────────────────────────────
// /api/admin/distribution — DB 자동배분 정책 + 재분배 트리거
// 권한 :
//   GET  : 모든 admin
//   PATCH/POST(redistribute) : super_admin / marketing / tm_lead / admin
// ─────────────────────────────────────────────

import { createAdminClient } from '@/lib/supabase/admin'
import { guardApi } from '@/lib/admin/auth-helpers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const guard = await guardApi()
  if (!guard.ok) return guard.response

  const admin = createAdminClient()
  const [{ data: rule, error }, { data: members, error: membersError }] = await Promise.all([
    admin
      .from('distribution_rules')
      .select('*')
      .eq('id', 1)
      .single(),
    admin
      .from('admin_users')
      .select(
        `user_id, role, display_name, department, is_active,
         distribution_enabled, distribution_pause_reason,
         distribution_paused_until, distribution_note`,
      )
      .in('role', ['super_admin', 'admin', 'marketing', 'tm_lead', 'counselor'])
      .order('display_name', { ascending: true, nullsFirst: false }),
  ])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (membersError) {
    return NextResponse.json({ error: membersError.message }, { status: 500 })
  }

  return NextResponse.json({ rule, members: members ?? [] })
}

export async function PATCH(request: NextRequest) {
  const guard = await guardApi(['super_admin', 'marketing', 'tm_lead', 'admin'])
  if (!guard.ok) return guard.response

  const body = await request.json()
  const update: Record<string, unknown> = { updated_at: new Date().toISOString(), updated_by: guard.profile.user_id }
  for (const k of ['is_enabled', 'mode', 'eligible_roles']) {
    if (body[k] !== undefined) update[k] = body[k]
  }

  const admin = createAdminClient()
  const { data: rule, error } = await admin
    .from('distribution_rules')
    .update(update)
    .eq('id', 1)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rule })
}
