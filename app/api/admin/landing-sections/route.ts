import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { guardApi } from '@/lib/admin/auth-helpers'
import {
  getDefaultLandingModuleContent,
  isLandingModuleType,
  normalizeLandingSlotItem,
  type LandingModuleContent,
} from '@/lib/landing-sections'
import type { AdminRole } from '@/lib/admin/types'

export const dynamic = 'force-dynamic'

const ALLOWED_ROLES: AdminRole[] = ['super_admin', 'admin', 'marketing', 'marketer']
const SELECT_COLUMNS =
  'id,page_path,slot_key,item_type,title,content,sort_order,is_active,variant_key,traffic_weight,experiment_key,note,created_at,updated_at'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function asObject(value: unknown): LandingModuleContent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as LandingModuleContent
}

function asNullableText(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function clampWeight(value: unknown) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 100
  return Math.max(0, Math.min(100, Math.round(parsed)))
}

function revalidateMaybe(pagePath: unknown) {
  if (typeof pagePath === 'string' && pagePath.startsWith('/')) {
    revalidatePath(pagePath)
  }
}

export async function GET(request: NextRequest) {
  const guard = await guardApi(ALLOWED_ROLES)
  if (!guard.ok) return guard.response

  const { searchParams } = new URL(request.url)
  const pagePath = searchParams.get('page_path')
  const slotKey = searchParams.get('slot_key')
  const supabase = createClient()

  let query = supabase
    .from('landing_slot_items')
    .select(SELECT_COLUMNS)
    .order('page_path', { ascending: true })
    .order('slot_key', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (pagePath) query = query.eq('page_path', pagePath)
  if (slotKey) query = query.eq('slot_key', slotKey)

  const { data, error } = await query
  if (error) return jsonError(error.message, 500)

  return NextResponse.json({
    items: (data ?? []).map((row) => normalizeLandingSlotItem(row as Record<string, unknown>)),
  })
}

export async function POST(request: NextRequest) {
  const guard = await guardApi(ALLOWED_ROLES)
  if (!guard.ok) return guard.response

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') return jsonError('잘못된 요청입니다.')

  const pagePath = asNullableText((body as Record<string, unknown>).page_path)
  const slotKey = asNullableText((body as Record<string, unknown>).slot_key)
  const itemTypeRaw = (body as Record<string, unknown>).item_type

  if (!pagePath || !pagePath.startsWith('/')) return jsonError('page_path 가 필요합니다.')
  if (!slotKey) return jsonError('slot_key 가 필요합니다.')
  if (!isLandingModuleType(itemTypeRaw)) return jsonError('지원하지 않는 모듈 타입입니다.')

  const content = asObject((body as Record<string, unknown>).content)
  const supabase = createClient()
  const { data, error } = await supabase
    .from('landing_slot_items')
    .insert({
      page_path: pagePath,
      slot_key: slotKey,
      item_type: itemTypeRaw,
      title: asNullableText((body as Record<string, unknown>).title),
      content: Object.keys(content).length > 0 ? content : getDefaultLandingModuleContent(itemTypeRaw),
      sort_order: Number((body as Record<string, unknown>).sort_order) || 10,
      is_active: (body as Record<string, unknown>).is_active !== false,
      variant_key: asNullableText((body as Record<string, unknown>).variant_key) ?? 'A',
      traffic_weight: clampWeight((body as Record<string, unknown>).traffic_weight),
      experiment_key: asNullableText((body as Record<string, unknown>).experiment_key),
      note: asNullableText((body as Record<string, unknown>).note),
      updated_by: guard.profile.user_id,
    })
    .select(SELECT_COLUMNS)
    .single()

  if (error) return jsonError(error.message, 500)
  revalidateMaybe(pagePath)

  return NextResponse.json({
    item: normalizeLandingSlotItem(data as Record<string, unknown>),
  })
}

export async function PATCH(request: NextRequest) {
  const guard = await guardApi(ALLOWED_ROLES)
  if (!guard.ok) return guard.response

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') return jsonError('잘못된 요청입니다.')
  const raw = body as Record<string, unknown>
  const id = asNullableText(raw.id)
  if (!id) return jsonError('id 가 필요합니다.')

  const update: Record<string, unknown> = {
    updated_by: guard.profile.user_id,
  }

  if ('item_type' in raw) {
    if (!isLandingModuleType(raw.item_type)) return jsonError('지원하지 않는 모듈 타입입니다.')
    update.item_type = raw.item_type
  }
  if ('title' in raw) update.title = asNullableText(raw.title)
  if ('content' in raw) update.content = asObject(raw.content)
  if ('sort_order' in raw) update.sort_order = Number(raw.sort_order) || 0
  if ('is_active' in raw) update.is_active = raw.is_active !== false
  if ('variant_key' in raw) update.variant_key = asNullableText(raw.variant_key) ?? 'A'
  if ('traffic_weight' in raw) update.traffic_weight = clampWeight(raw.traffic_weight)
  if ('experiment_key' in raw) update.experiment_key = asNullableText(raw.experiment_key)
  if ('note' in raw) update.note = asNullableText(raw.note)

  const supabase = createClient()
  const { data, error } = await supabase
    .from('landing_slot_items')
    .update(update)
    .eq('id', id)
    .select(SELECT_COLUMNS)
    .single()

  if (error) return jsonError(error.message, 500)
  revalidateMaybe(raw.page_path ?? data?.page_path)

  return NextResponse.json({
    item: normalizeLandingSlotItem(data as Record<string, unknown>),
  })
}

export async function DELETE(request: NextRequest) {
  const guard = await guardApi(ALLOWED_ROLES)
  if (!guard.ok) return guard.response

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') return jsonError('잘못된 요청입니다.')
  const raw = body as Record<string, unknown>
  const id = asNullableText(raw.id)
  if (!id) return jsonError('id 가 필요합니다.')

  const supabase = createClient()
  const { error } = await supabase
    .from('landing_slot_items')
    .delete()
    .eq('id', id)

  if (error) return jsonError(error.message, 500)
  revalidateMaybe(raw.page_path)

  return NextResponse.json({ success: true })
}
