// ─────────────────────────────────────────────
// /api/admin/consultations/bulk — 벌크 액션
//
// 권한 :
//   set_status / assign_counselor : super_admin / marketing / tm_lead / admin
//   delete : super_admin only
//
// body: { ids: string[], action: 'set_status'|'assign_counselor'|'delete', ... }
// ─────────────────────────────────────────────

import { createAdminClient } from '@/lib/supabase/admin'
import { guardApi } from '@/lib/admin/auth-helpers'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const MAX_IDS = 500

export async function POST(req: NextRequest) {
  const guard = await guardApi()
  if (!guard.ok) return guard.response

  const body = await req.json()
  const ids: string[] = Array.isArray(body.ids) ? body.ids : []
  const action: string = body.action

  if (ids.length === 0 || ids.length > MAX_IDS) {
    return NextResponse.json(
      { error: `ids 1~${MAX_IDS}개 사이여야 합니다.` },
      { status: 400 }
    )
  }

  const role = guard.profile.role
  const isSuper = role === 'super_admin'
  const isManagerLevel =
    isSuper || role === 'marketing' || role === 'tm_lead' || role === 'admin'

  const admin = createAdminClient()

  // ─── set_status ────────────────────────────
  if (action === 'set_status') {
    if (!isManagerLevel) {
      return NextResponse.json({ error: '권한 없음' }, { status: 403 })
    }
    const statusId = parseInt(body.status_id, 10)
    if (!Number.isFinite(statusId)) {
      return NextResponse.json({ error: 'status_id 누락' }, { status: 400 })
    }
    const { error, count } = await admin
      .from('consultations')
      .update({
        status_id: statusId,
        updated_at: new Date().toISOString(),
        last_contacted_at: new Date().toISOString(),
      }, { count: 'exact' })
      .in('id', ids)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // 상태 이력 일괄 INSERT
    const histRows = ids.map((id) => ({
      consultation_id: id,
      status_id: statusId,
      counselor_id: guard.profile.user_id,
      memo: '벌크 변경',
    }))
    await admin.from('consultation_status_history').insert(histRows)

    return NextResponse.json({ success: true, affected: count ?? ids.length })
  }

  // ─── assign_counselor ──────────────────────
  if (action === 'assign_counselor') {
    if (!isManagerLevel) {
      return NextResponse.json({ error: '권한 없음' }, { status: 403 })
    }
    const counselorId = body.counselor_id
    if (!counselorId) {
      return NextResponse.json({ error: 'counselor_id 누락' }, { status: 400 })
    }
    const { error, count } = await admin
      .from('consultations')
      .update({
        counselor_id: counselorId,
        assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { count: 'exact' })
      .in('id', ids)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, affected: count ?? ids.length })
  }

  // ─── delete ────────────────────────────────
  if (action === 'delete') {
    if (!isSuper) {
      return NextResponse.json({ error: 'super_admin 만 가능' }, { status: 403 })
    }
    const { error, count } = await admin
      .from('consultations')
      .delete({ count: 'exact' })
      .in('id', ids)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, affected: count ?? ids.length })
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}
