// ─────────────────────────────────────────────
// 인라인 편집 — 텍스트/링크 저장 API
//  GET    : 단일/다중 블록 조회 (관리자 에디터용 — RLS 덕에 ANON key로 읽기 가능)
//  PATCH  : 블록 생성/수정 (인증 필요)
//           1) 기존 값 조회 → history 에 스냅샷
//           2) content_blocks UPSERT
//           3) revalidatePath / revalidateTag
// ─────────────────────────────────────────────

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { cacheTagFor, cacheTagForPage } from '@/lib/content-blocks'

// -------------------------------------------------------------
// GET /api/admin/content-blocks?keys=a,b,c
//     /api/admin/content-blocks?page_path=/
// -------------------------------------------------------------
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)

  const keys     = searchParams.get('keys')       // 'a,b,c'
  const pagePath = searchParams.get('page_path')  // '/'

  let query = supabase.from('content_blocks').select('*')

  if (keys) {
    query = query.in('block_key', keys.split(',').map((k) => k.trim()).filter(Boolean))
  } else if (pagePath) {
    query = query.eq('page_path', pagePath)
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ blocks: data ?? [] })
}

// -------------------------------------------------------------
// PATCH /api/admin/content-blocks
// body :
//   {
//     block_key:    'home.hero.slide1.title',
//     block_type:   'text',
//     value:        { text: '새 헤드카피' },
//     semantic_tag: 'h1',
//     page_path:    '/',
//     note:         'A/B: CTA 강화 가설 1'
//   }
// -------------------------------------------------------------
interface PatchBody {
  block_key:     string
  block_type:    'text' | 'image' | 'link'
  value:         Record<string, unknown>
  semantic_tag?: string | null
  page_path?:    string | null
  note?:         string | null
}

export async function PATCH(request: NextRequest) {
  const supabase = createClient()

  // 인증 체크
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: PatchBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // 최소 검증
  if (!body.block_key || !body.block_type || !body.value) {
    return NextResponse.json(
      { error: 'block_key, block_type, value 는 필수입니다.' },
      { status: 400 }
    )
  }
  if (!['text', 'image', 'link'].includes(body.block_type)) {
    return NextResponse.json({ error: 'block_type 이 올바르지 않습니다.' }, { status: 400 })
  }

  // 1) 기존 값 조회 → history 스냅샷 (있을 때만)
  const { data: existing } = await supabase
    .from('content_blocks')
    .select('block_key, value, semantic_tag')
    .eq('block_key', body.block_key)
    .maybeSingle()

  if (existing) {
    await supabase.from('content_block_history').insert({
      block_key:    existing.block_key,
      value:        existing.value,
      semantic_tag: existing.semantic_tag,
      updated_by:   user.id,
    })
  }

  // 2) UPSERT
  const { data: saved, error: upsertError } = await supabase
    .from('content_blocks')
    .upsert(
      {
        block_key:    body.block_key,
        block_type:   body.block_type,
        value:        body.value,
        semantic_tag: body.semantic_tag ?? null,
        page_path:    body.page_path ?? null,
        note:         body.note ?? null,
        updated_by:   user.id,
        updated_at:   new Date().toISOString(),
      },
      { onConflict: 'block_key' }
    )
    .select()
    .single()

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  // 3) 캐시 무효화 — page_path 가 있으면 해당 경로 재생성
  try {
    revalidateTag(cacheTagFor(body.block_key))
    if (body.page_path) {
      revalidateTag(cacheTagForPage(body.page_path))
      revalidatePath(body.page_path)
    }
  } catch (err) {
    // revalidate 실패는 저장 자체를 막지 않음 (로그만)
    console.error('[content-blocks] revalidate 실패:', err)
  }

  return NextResponse.json({ block: saved, success: true })
}

// -------------------------------------------------------------
// DELETE /api/admin/content-blocks?key=home.hero.slide1.title
//   — 블록 자체 제거 (fallback 값으로 복귀)
// -------------------------------------------------------------
export async function DELETE(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const key = searchParams.get('key')
  if (!key) {
    return NextResponse.json({ error: 'key 파라미터가 필요합니다.' }, { status: 400 })
  }

  // history 에 마지막 스냅샷 남기고 제거
  const { data: existing } = await supabase
    .from('content_blocks')
    .select('block_key, value, semantic_tag, page_path')
    .eq('block_key', key)
    .maybeSingle()

  if (existing) {
    await supabase.from('content_block_history').insert({
      block_key:    existing.block_key,
      value:        existing.value,
      semantic_tag: existing.semantic_tag,
      updated_by:   user.id,
    })
  }

  const { error } = await supabase.from('content_blocks').delete().eq('block_key', key)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  try {
    revalidateTag(cacheTagFor(key))
    if (existing?.page_path) {
      revalidateTag(cacheTagForPage(existing.page_path))
      revalidatePath(existing.page_path)
    }
  } catch {}

  return NextResponse.json({ success: true })
}
