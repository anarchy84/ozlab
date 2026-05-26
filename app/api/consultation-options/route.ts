// ─────────────────────────────────────────────
// /api/consultation-options
//   상담 입력 5개 필드 드롭다운 옵션 — 익명 read 전용 공개 엔드포인트.
//
// 권한 :
//   - 인증 불필요 (랜딩 신청서·CTA 위자드에서 호출)
//   - RLS 정책으로 is_active=true 만 노출
//
// 캐싱 :
//   - revalidate 60s — 옵션은 자주 안 바뀌므로 1분 캐시면 충분
// ─────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const revalidate = 60

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    return NextResponse.json({ error: 'env missing' }, { status: 500 })
  }

  // anon client — RLS 가 is_active 필터를 처리
  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await supabase
    .from('consultation_field_options')
    .select('id, field_key, value, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('value', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data ?? [], {
    headers: {
      // CDN/브라우저 캐시 — 1분 / stale-while-revalidate 5분
      'cache-control': 'public, max-age=60, stale-while-revalidate=300',
    },
  })
}
