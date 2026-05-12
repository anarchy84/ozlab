// ─────────────────────────────────────────────
// /api/admin/blacklist — 블랙리스트 통합 관리
//
// 권한 : super_admin / admin
// 기능 : 활성 차단 목록 조회, 수동 추가, 해제
// ─────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { guardApi } from '@/lib/admin/auth-helpers'
import {
  ABUSE_BLOCK_TYPES,
  type AbuseBlockType,
  type AbuseBlocklistEntry,
} from '@/lib/admin/types'
import { normalizePhone } from '@/lib/consultation-policy'

export const dynamic = 'force-dynamic'

interface AbuseBlockRow {
  id: number
  block_type: AbuseBlockType
  block_value: string
  reason: string | null
  blocked_by: string | null
  blocked_at: string
  expires_at: string | null
  source_consultation_id: string | null
  hit_count: number
}

interface CreateBlockBody {
  block_type?: unknown
  block_value?: unknown
  reason?: unknown
  expires_at?: unknown
  source_consultation_id?: unknown
}

export async function GET(req: NextRequest) {
  const guard = await guardApi(['super_admin', 'admin'])
  if (!guard.ok) return guard.response

  const typeParam = req.nextUrl.searchParams.get('type')
  const query = (req.nextUrl.searchParams.get('q') ?? '').trim().toLowerCase()

  if (typeParam && !isAbuseBlockType(typeParam)) {
    return NextResponse.json({ error: '유효하지 않은 블랙리스트 유형입니다.' }, { status: 400 })
  }

  const admin = createAdminClient()
  let request = admin
    .from('abuse_blocklist')
    .select(
      'id, block_type, block_value, reason, blocked_by, blocked_at, expires_at, source_consultation_id, hit_count',
    )

  if (typeParam) {
    request = request.eq('block_type', typeParam)
  }

  const { data, error } = await request.order('blocked_at', { ascending: false }).limit(1000)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const normalizedQuery = normalizePhone(query)
  let entries = ((data ?? []) as AbuseBlockRow[]).filter(isActiveBlock)

  if (query) {
    entries = entries.filter((entry) => {
      const haystack = [
        entry.block_type,
        entry.block_value,
        entry.reason ?? '',
        entry.source_consultation_id ?? '',
      ]
        .join(' ')
        .toLowerCase()

      return (
        haystack.includes(query) ||
        (normalizedQuery.length > 0 && normalizePhone(entry.block_value).includes(normalizedQuery))
      )
    })
  }

  const sourceMap = await getSourceConsultationMap(
    entries
      .map((entry) => entry.source_consultation_id)
      .filter((id): id is string => Boolean(id)),
  )

  const hydrated: AbuseBlocklistEntry[] = entries.map((entry) => ({
    ...entry,
    source_consultation: entry.source_consultation_id
      ? sourceMap.get(entry.source_consultation_id) ?? null
      : null,
  }))

  return NextResponse.json({ entries: hydrated })
}

export async function POST(req: NextRequest) {
  const guard = await guardApi(['super_admin', 'admin'])
  if (!guard.ok) return guard.response

  let body: CreateBlockBody
  try {
    body = (await req.json()) as CreateBlockBody
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  if (!isAbuseBlockType(body.block_type)) {
    return NextResponse.json({ error: '차단 유형을 선택해주세요.' }, { status: 400 })
  }

  const blockValue = normalizeBlockValue(body.block_type, body.block_value)
  if (!blockValue) {
    return NextResponse.json({ error: '차단 값을 입력해주세요.' }, { status: 400 })
  }
  if (body.block_type === 'phone' && blockValue.length < 7) {
    return NextResponse.json({ error: '연락처를 정확히 입력해주세요.' }, { status: 400 })
  }

  const expiresAt = parseNullableDate(body.expires_at)
  if (expiresAt === false) {
    return NextResponse.json({ error: '만료일 형식이 올바르지 않습니다.' }, { status: 400 })
  }

  const sourceConsultationId =
    typeof body.source_consultation_id === 'string' && body.source_consultation_id.trim()
      ? body.source_consultation_id.trim()
      : null

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('abuse_blocklist')
    .insert({
      block_type: body.block_type,
      block_value: blockValue,
      reason: cleanText(body.reason, 500) ?? '어드민 수동 차단',
      blocked_by: guard.profile.user_id,
      expires_at: expiresAt,
      source_consultation_id: sourceConsultationId,
    })
    .select(
      'id, block_type, block_value, reason, blocked_by, blocked_at, expires_at, source_consultation_id, hit_count',
    )
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '이미 활성화된 블랙리스트입니다.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (sourceConsultationId) {
    await admin
      .from('consultations')
      .update({ is_blacklisted: true })
      .eq('id', sourceConsultationId)
  }

  const entry = data as AbuseBlockRow
  const sourceMap = await getSourceConsultationMap(
    entry.source_consultation_id ? [entry.source_consultation_id] : [],
  )

  return NextResponse.json({
    entry: {
      ...entry,
      source_consultation: entry.source_consultation_id
        ? sourceMap.get(entry.source_consultation_id) ?? null
        : null,
    } satisfies AbuseBlocklistEntry,
  })
}

export async function DELETE(req: NextRequest) {
  const guard = await guardApi(['super_admin', 'admin'])
  if (!guard.ok) return guard.response

  let body: { id?: unknown }
  try {
    body = (await req.json()) as { id?: unknown }
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  const id = typeof body.id === 'number' ? body.id : Number(body.id)
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: '해제할 블랙리스트 ID가 필요합니다.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: row, error: rowError } = await admin
    .from('abuse_blocklist')
    .select('id, source_consultation_id')
    .eq('id', id)
    .single()

  if (rowError || !row) {
    return NextResponse.json({ error: rowError?.message ?? 'not found' }, { status: 404 })
  }

  const { error } = await admin.from('abuse_blocklist').delete().eq('id', id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const sourceConsultationId = (row as { source_consultation_id: string | null }).source_consultation_id
  if (sourceConsultationId) {
    const { data: remaining } = await admin
      .from('abuse_blocklist')
      .select('id, expires_at')
      .eq('source_consultation_id', sourceConsultationId)
      .limit(20)

    const hasActiveBlock = ((remaining ?? []) as Array<{ expires_at: string | null }>).some(
      isActiveBlock,
    )
    if (!hasActiveBlock) {
      await admin
        .from('consultations')
        .update({ is_blacklisted: false })
        .eq('id', sourceConsultationId)
    }
  }

  return NextResponse.json({ success: true })
}

function isAbuseBlockType(value: unknown): value is AbuseBlockType {
  return typeof value === 'string' && ABUSE_BLOCK_TYPES.includes(value as AbuseBlockType)
}

function normalizeBlockValue(type: AbuseBlockType, value: unknown): string {
  if (typeof value !== 'string') return ''
  const raw = value.trim()
  if (type === 'phone') return normalizePhone(raw)
  if (type === 'email') return raw.toLowerCase()
  return raw
}

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim().slice(0, max)
  return text.length > 0 ? text : null
}

function parseNullableDate(value: unknown): string | null | false {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string') return false
  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? false : new Date(timestamp).toISOString()
}

function isActiveBlock(row: { expires_at: string | null }): boolean {
  if (!row.expires_at) return true
  return new Date(row.expires_at).getTime() > Date.now()
}

async function getSourceConsultationMap(sourceIds: string[]) {
  const uniqueIds = Array.from(new Set(sourceIds))
  const map = new Map<string, NonNullable<AbuseBlocklistEntry['source_consultation']>>()
  if (uniqueIds.length === 0) return map

  const admin = createAdminClient()
  const { data } = await admin
    .from('consultations')
    .select('id, name, phone, store_name, is_blacklisted, created_at')
    .in('id', uniqueIds)

  for (const row of data ?? []) {
    map.set(row.id, row)
  }

  return map
}
