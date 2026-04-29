// ─────────────────────────────────────────────
// CTA 서버사이드 조회 (페이지 SSR 시 placement 별 활성 CTA 가져오기)
// ─────────────────────────────────────────────
import { createClient } from '@/lib/supabase/server'
import type { CtaButton, CtaPlacement } from '@/lib/admin/types'

/**
 * 모든 활성 CTA 를 placement → CtaButton[] 맵으로 반환.
 * 페이지 layout 또는 page 에서 한 번 호출, 모든 DynamicCTA 가 props 로 받음.
 */
export async function fetchCtasByPlacement(): Promise<
  Partial<Record<CtaPlacement, CtaButton[]>>
> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('cta_buttons')
    .select('*')
    .eq('is_active', true)
    .order('placement')
    .order('sort_order')

  if (error || !data) {
    console.error('[fetchCtasByPlacement]', error)
    return {}
  }

  const map: Partial<Record<CtaPlacement, CtaButton[]>> = {}
  for (const cta of data as CtaButton[]) {
    const list = map[cta.placement] ?? []
    list.push(cta)
    map[cta.placement] = list
  }
  return map
}
