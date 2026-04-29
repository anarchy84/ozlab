// ─────────────────────────────────────────────
// /api/admin/cta — cta_buttons CRUD
//
// GET  : 목록 (어드민 진입자 누구나 — 페이지 렌더는 비인증도 가능)
// POST : 신규 추가 (super_admin)
// ─────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { guardApi } from '@/lib/admin/auth-helpers'
import { CTA_PLACEMENTS, CTA_STYLES } from '@/lib/admin/types'
import type { CtaButtonInput } from '@/lib/admin/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await guardApi()
  if (!guard.ok) return guard.response

  const supabase = createClient()
  const { data, error } = await supabase
    .from('cta_buttons')
    .select('*')
    .order('placement')
    .order('sort_order')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ctas: data ?? [] })
}

export async function POST(req: NextRequest) {
  const guard = await guardApi(['super_admin'])
  if (!guard.ok) return guard.response

  let body: Partial<CtaButtonInput>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  if (!body.placement || !body.label) {
    return NextResponse.json(
      { error: 'placement / label 은 필수' },
      { status: 400 },
    )
  }
  if (!CTA_PLACEMENTS.includes(body.placement)) {
    return NextResponse.json(
      { error: `유효하지 않은 placement: ${body.placement}` },
      { status: 400 },
    )
  }
  if (body.style && !CTA_STYLES.includes(body.style)) {
    return NextResponse.json(
      { error: `유효하지 않은 style: ${body.style}` },
      { status: 400 },
    )
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('cta_buttons')
    .insert({
      placement: body.placement,
      sort_order: body.sort_order ?? 999,
      label: body.label,
      target_href: body.target_href ?? '#apply',
      target_blank: body.target_blank ?? false,
      utm_source: body.utm_source ?? 'site',
      utm_medium: body.utm_medium ?? 'cta',
      utm_campaign: body.utm_campaign ?? `cta_${body.placement}_custom`,
      utm_content: body.utm_content ?? null,
      style: body.style ?? 'primary',
      is_active: body.is_active ?? true,
      note: body.note ?? null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true, cta: data }, { status: 201 })
}
