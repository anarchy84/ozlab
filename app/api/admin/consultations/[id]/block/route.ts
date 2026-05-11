// ─────────────────────────────────────────────
// /api/admin/consultations/[id]/block
//
// abuse_blocklist 에 phone 또는 ip 등록 (영구 차단).
// 권한 : admin 이상
// ─────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { guardApi } from '@/lib/admin/auth-helpers'
import { normalizePhone, phoneBlockValues } from '@/lib/consultation-policy'

export const dynamic = 'force-dynamic'

interface BlockBody {
  block_type: 'phone' | 'ip' | 'all'
  reason?: string
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const guard = await guardApi(['super_admin', 'admin'])
  if (!guard.ok) return guard.response
  const { profile } = guard

  let body: BlockBody
  try {
    body = (await req.json()) as BlockBody
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  if (!['phone', 'ip'].includes(body.block_type)) {
    return NextResponse.json({ error: 'block_type must be phone or ip' }, { status: 400 })
  }

  const supabase = createClient()

  // 원본 consultation 에서 phone / ip 가져오기
  const { data: c, error: cErr } = await supabase
    .from('consultations')
    .select('phone, ip_address')
    .eq('id', params.id)
    .single()
  if (cErr || !c) {
    return NextResponse.json({ error: cErr?.message ?? 'not found' }, { status: 404 })
  }

  const value =
    body.block_type === 'phone'
      ? normalizePhone(c.phone)
      : c.ip_address?.toString() ?? null
  if (!value) {
    return NextResponse.json(
      { error: `${body.block_type} 값이 비어있어 차단할 수 없습니다.` },
      { status: 400 },
    )
  }

  const { error } = await supabase.from('abuse_blocklist').insert({
    block_type: body.block_type,
    block_value: value,
    reason: body.reason ?? '어드민 수동 차단',
    blocked_by: profile.user_id,
    source_consultation_id: params.id,
  })

  if (error) {
    // unique 위반은 OK (이미 차단됨)
    if (error.code === '23505') {
      return NextResponse.json({ success: true, already_blocked: true })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const guard = await guardApi(['super_admin', 'admin'])
  if (!guard.ok) return guard.response

  let body: BlockBody
  try {
    body = (await req.json()) as BlockBody
  } catch {
    body = { block_type: 'all' }
  }

  if (!['phone', 'ip', 'all'].includes(body.block_type)) {
    return NextResponse.json({ error: 'block_type must be phone, ip, or all' }, { status: 400 })
  }

  const supabase = createClient()
  const { data: c, error: cErr } = await supabase
    .from('consultations')
    .select('phone, ip_address')
    .eq('id', params.id)
    .single()
  if (cErr || !c) {
    return NextResponse.json({ error: cErr?.message ?? 'not found' }, { status: 404 })
  }

  const deleteTasks: Array<PromiseLike<{ error: unknown }>> = []
  if (body.block_type === 'phone' || body.block_type === 'all') {
    const values = phoneBlockValues(c.phone)
    if (values.length > 0) {
      deleteTasks.push(
        supabase
          .from('abuse_blocklist')
          .delete()
          .eq('block_type', 'phone')
          .in('block_value', values),
      )
    }
  }
  if ((body.block_type === 'ip' || body.block_type === 'all') && c.ip_address) {
    deleteTasks.push(
      supabase
        .from('abuse_blocklist')
        .delete()
        .eq('block_type', 'ip')
        .eq('block_value', c.ip_address.toString()),
    )
  }

  const results = await Promise.all(deleteTasks)
  const failed = results.find((result) => result.error)
  if (failed?.error) {
    return NextResponse.json({ error: String(failed.error) }, { status: 500 })
  }

  await supabase
    .from('consultations')
    .update({ is_blacklisted: false })
    .eq('id', params.id)

  return NextResponse.json({ success: true })
}
