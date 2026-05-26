// ─────────────────────────────────────────────
// /api/admin/consultation-options
//   상담 입력 5개 필드(업종/지역/단말기/약정/통화시간) 드롭다운 옵션 마스터.
//
// 권한 :
//   GET  : 모든 admin (전체 조회, 비활성 포함)
//   POST : super_admin / admin (신규 옵션 추가)
//
// 신입사원 친화 :
//   - field_key 5종 외에는 400 으로 차단
//   - value 중복(공백·대소문자 정규화) 은 409 로 친절한 한글 안내
// ─────────────────────────────────────────────
import { createAdminClient } from '@/lib/supabase/admin'
import { guardApi } from '@/lib/admin/auth-helpers'
import { NextRequest, NextResponse } from 'next/server'

const VALID_FIELD_KEYS = [
  'industry',
  'region',
  'device_type',
  'contract_period',
  'callable_time',
] as const

type FieldKey = (typeof VALID_FIELD_KEYS)[number]

function isValidFieldKey(value: unknown): value is FieldKey {
  return typeof value === 'string' && (VALID_FIELD_KEYS as readonly string[]).includes(value)
}

export async function GET(request: NextRequest) {
  const guard = await guardApi()
  if (!guard.ok) return guard.response

  // ?field_key=industry 같이 필터링 가능 (생략 시 전체)
  const fieldKey = request.nextUrl.searchParams.get('field_key')

  const admin = createAdminClient()
  let query = admin
    .from('consultation_field_options')
    .select('*')
    .order('field_key', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('value', { ascending: true })

  if (fieldKey) {
    if (!isValidFieldKey(fieldKey)) {
      return NextResponse.json(
        { error: 'field_key 가 잘못되었습니다.', allowed: VALID_FIELD_KEYS },
        { status: 400 }
      )
    }
    query = query.eq('field_key', fieldKey)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const guard = await guardApi(['super_admin', 'admin'])
  if (!guard.ok) return guard.response

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: '본문 형식이 잘못되었습니다.' }, { status: 400 })
  }

  const { field_key, value, sort_order, is_active } = body as {
    field_key?: unknown
    value?: unknown
    sort_order?: unknown
    is_active?: unknown
  }

  if (!isValidFieldKey(field_key)) {
    return NextResponse.json(
      { error: 'field_key 가 잘못되었습니다.', allowed: VALID_FIELD_KEYS },
      { status: 400 }
    )
  }
  const trimmedValue = typeof value === 'string' ? value.trim() : ''
  if (!trimmedValue) {
    return NextResponse.json({ error: '옵션 값(value)을 입력하세요.' }, { status: 400 })
  }
  if (trimmedValue.length > 80) {
    return NextResponse.json(
      { error: '옵션 값은 80자 이내로 입력하세요.' },
      { status: 400 }
    )
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('consultation_field_options')
    .insert({
      field_key,
      value: trimmedValue,
      sort_order: typeof sort_order === 'number' ? sort_order : 0,
      is_active: is_active !== false,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: '같은 필드에 동일한 옵션이 이미 존재합니다.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
