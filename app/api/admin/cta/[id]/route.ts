// ─────────────────────────────────────────────
// /api/admin/cta/[id] — 개별 CTA 수정·삭제 (super_admin)
// ─────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { guardApi } from '@/lib/admin/auth-helpers'
import type { CtaButtonInput } from '@/lib/admin/types'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const guard = await guardApi(['super_admin'])
  if (!guard.ok) return guard.response

  const id = parseInt(params.id, 10)
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 })
  }

  let body: Partial<CtaButtonInput>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  const allowed: (keyof CtaButtonInput)[] = [
    'placement', 'sort_order', 'label', 'target_href', 'target_blank',
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_content',
    'style', 'is_active', 'note',
  ]
  const update: Partial<CtaButtonInput> = {}
  for (const key of allowed) {
    if (key in body) {
      // @ts-expect-error 동적 키 (검증된 화이트리스트)
      update[key] = body[key]
    }
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: '변경할 필드가 없습니다.' }, { status: 400 })
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('cta_buttons')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, cta: data })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const guard = await guardApi(['super_admin'])
  if (!guard.ok) return guard.response

  const id = parseInt(params.id, 10)
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 })
  }

  const supabase = createClient()
  const { error } = await supabase.from('cta_buttons').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
