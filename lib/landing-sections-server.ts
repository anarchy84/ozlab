import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { normalizeLandingSlotItem, type LandingSlotsByKey } from '@/lib/landing-sections'

export async function getLandingSlotsForPage(pagePath: string): Promise<LandingSlotsByKey> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('landing_slot_items')
    .select(
      'id,page_path,slot_key,item_type,title,content,sort_order,is_active,variant_key,traffic_weight,experiment_key,note,created_at,updated_at'
    )
    .eq('page_path', pagePath)
    .eq('is_active', true)
    .order('slot_key', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    // 마이그레이션이 아직 원격 DB에 적용되지 않은 배포 환경에서도 페이지 렌더는 유지한다.
    console.error('[landing-sections] failed to load slot items', { pagePath, error })
    return {}
  }

  return (data ?? []).reduce<LandingSlotsByKey>((acc, row) => {
    const item = normalizeLandingSlotItem(row as Record<string, unknown>)
    if (!acc[item.slot_key]) acc[item.slot_key] = []
    acc[item.slot_key].push(item)
    return acc
  }, {})
}
