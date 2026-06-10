// ─────────────────────────────────────────────
// channel_mapping → ChannelDict 로더 (서버 전용)
//
// 사용 :
//   서버 컴포넌트/route 에서 호출해 클라이언트에 prop 으로 전달.
//   channel_code 중복 시 sort_order 가 낮은 행(대표 라벨)을 채택.
// ─────────────────────────────────────────────
import { createClient } from '@/lib/supabase/server'
import type { ChannelDict } from './channel-ui'

export async function loadChannelDictionary(): Promise<ChannelDict> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('channel_mapping')
      .select('channel_code, channel_label, is_paid, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error || !data) return {}

    const dict: ChannelDict = {}
    for (const row of data) {
      // sort_order 오름차순이므로 첫 등장 행이 대표 라벨
      if (!dict[row.channel_code]) {
        dict[row.channel_code] = { label: row.channel_label, isPaid: row.is_paid }
      }
    }
    return dict
  } catch {
    // 사전 로드 실패해도 화면은 폴백 라벨로 동작해야 한다
    return {}
  }
}
