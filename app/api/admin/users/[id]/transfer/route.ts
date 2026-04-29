// ─────────────────────────────────────────────
// /api/admin/users/[id]/transfer — 배정 인수인계
//
// POST body :
//   { policy: 'auto_unassign' | 'bulk_transfer', transfer_to_user_id?: string }
//
// 동작 :
//   auto_unassign  : 퇴사자의 진행중 상담을 counselor_id NULL 로 풀기 (개통완료/허수 제외)
//   bulk_transfer  : 다른 1명에게 일괄 재배정 (개통완료/허수 제외)
//
// 권한 : super_admin 또는 admin
// ─────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { guardApi } from '@/lib/admin/auth-helpers'

export const dynamic = 'force-dynamic'

interface TransferBody {
  policy: 'auto_unassign' | 'bulk_transfer'
  transfer_to_user_id?: string
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const guard = await guardApi(['super_admin', 'admin'])
  if (!guard.ok) return guard.response

  const fromUserId = params.id
  let body: TransferBody
  try {
    body = (await req.json()) as TransferBody
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // 종결 상태(개통완료, 미승인) 는 인수인계 대상에서 제외
  const { data: terminalStatuses } = await supabase
    .from('db_statuses')
    .select('id')
    .or('is_conversion.eq.true,is_unapproved.eq.true')
  const excludeIds = (terminalStatuses ?? []).map((s) => s.id)

  let result: { count: number | null }
  if (body.policy === 'auto_unassign') {
    const q = supabase
      .from('consultations')
      .update(
        { counselor_id: null, assigned_at: null },
        { count: 'exact' },
      )
      .eq('counselor_id', fromUserId)
    const filtered = excludeIds.length > 0
      ? q.not('status_id', 'in', `(${excludeIds.join(',')})`)
      : q

    const { error, count } = await filtered
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    result = { count }
  } else if (body.policy === 'bulk_transfer') {
    if (!body.transfer_to_user_id) {
      return NextResponse.json(
        { error: 'bulk_transfer 정책은 transfer_to_user_id 필수' },
        { status: 400 },
      )
    }
    const q = supabase
      .from('consultations')
      .update(
        {
          counselor_id: body.transfer_to_user_id,
          assigned_at: new Date().toISOString(),
        },
        { count: 'exact' },
      )
      .eq('counselor_id', fromUserId)
    const filtered = excludeIds.length > 0
      ? q.not('status_id', 'in', `(${excludeIds.join(',')})`)
      : q

    const { error, count } = await filtered
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    result = { count }
  } else {
    return NextResponse.json(
      { error: `유효하지 않은 policy: ${body.policy}` },
      { status: 400 },
    )
  }

  return NextResponse.json({
    success: true,
    policy: body.policy,
    transferred_count: result.count ?? 0,
  })
}
