// ─────────────────────────────────────────────
// /api/admin/statuses — db_statuses CRUD
//
// GET  : 목록 조회 (어드민 진입자 누구나)
// POST : 신규 상태 추가 (super_admin 만)
//
// 권한 :
//   - GET  : has_admin_access (lib/admin/auth-helpers guardApi)
//   - POST : super_admin 전용
// ─────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { guardApi } from '@/lib/admin/auth-helpers'
import type { DbStatusInput } from '@/lib/admin/types'

export const dynamic = 'force-dynamic'

// ----- GET : 목록 -----
export async function GET() {
  const guard = await guardApi()
  if (!guard.ok) return guard.response

  const supabase = createClient()
  const { data, error } = await supabase
    .from('db_statuses')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('[statuses GET]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ statuses: data ?? [] })
}

// ----- POST : 신규 추가 -----
export async function POST(req: NextRequest) {
  const guard = await guardApi(['super_admin'])
  if (!guard.ok) return guard.response

  let body: Partial<DbStatusInput>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  // 최소 검증
  if (!body.code || !body.label) {
    return NextResponse.json(
      { error: 'code 와 label 은 필수입니다.' },
      { status: 400 },
    )
  }
  if (body.code.length > 40 || body.label.length > 40) {
    return NextResponse.json(
      { error: 'code/label 은 40자 이하' },
      { status: 400 },
    )
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('db_statuses')
    .insert({
      sort_order: body.sort_order ?? 999,
      code: body.code,
      label: body.label,
      bg_color: body.bg_color ?? '#E5E7EB',
      text_color: body.text_color ?? '#111827',
      send_message: body.send_message ?? false,
      is_promising: body.is_promising ?? false,
      force_recall: body.force_recall ?? false,
      is_conversion: body.is_conversion ?? false,
      is_unapproved: body.is_unapproved ?? false,
      needs_counselor_confirm: body.needs_counselor_confirm ?? false,
      in_progress: body.in_progress ?? false,
      cannot_proceed: body.cannot_proceed ?? false,
      include_in_gcl: body.include_in_gcl ?? false,
      show_in_dashboard: body.show_in_dashboard ?? true,
      message_template_code: body.message_template_code ?? null,
      is_active: body.is_active ?? true,
    })
    .select()
    .single()

  if (error) {
    console.error('[statuses POST]', error)
    if (error.code === '23505') {
      return NextResponse.json(
        { error: `code "${body.code}" 가 이미 존재합니다.` },
        { status: 409 },
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, status: data }, { status: 201 })
}
