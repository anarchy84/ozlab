// ─────────────────────────────────────────────
// /api/cron/daily-digest — 매일 07:00 KST (= 22:00 UTC) 일일 다이제스트
//
// 어제 신규 리드 / 전환 / 매출 / ROAS / 이상 시그널 건수를
// slack_channels.code='daily_digest' 채널로 발송.
//
// 인증: Vercel Cron Authorization Bearer <CRON_SECRET>
// ─────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendDailyDigest } from '@/lib/slack'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

function kstDateString(daysAgo = 0): string {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000 - daysAgo * 24 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  const supabase = createAdminClient()
  const date = kstDateString(1)

  try {
    // 1) 어제 신규 리드 (매체별)
    const { data: leads } = await supabase
      .from('consultations')
      .select('inferred_channel, status:db_statuses!consultations_status_id_fkey(is_conversion)')
      .gte('created_at', `${date}T00:00:00+09:00`)
      .lt('created_at', `${date}T24:00:00+09:00`)

    const newLeads = leads?.length ?? 0
    const conversions = (leads ?? []).filter((r) => {
      const s = r.status as { is_conversion?: boolean } | null
      return s?.is_conversion === true
    }).length

    const channelCount = new Map<string, number>()
    for (const r of leads ?? []) {
      const ch = r.inferred_channel ?? '직접유입'
      channelCount.set(ch, (channelCount.get(ch) ?? 0) + 1)
    }
    const byChannel = Array.from(channelCount.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([channel, count]) => ({ channel, count }))

    // 2) 어제 매출
    const { data: revRows } = await supabase
      .from('revenue_records')
      .select('amount, gift_amount, net_amount')
      .eq('recognized_at', date)
    const revenue = (revRows ?? []).reduce(
      (s, r) => s + Number(r.net_amount ?? (Number(r.amount ?? 0) - Number(r.gift_amount ?? 0))),
      0,
    )

    // 3) 어제 광고비 + ROAS
    const { data: adRows } = await supabase
      .from('ad_metrics')
      .select('spend')
      .eq('date', date)
    const spend = (adRows ?? []).reduce((s, r) => s + Number(r.spend ?? 0), 0)
    const roasPct = spend > 0 ? (revenue / spend) * 100 : null

    // 4) 어제 이상 시그널 건수
    const { count: alertCount } = await supabase
      .from('alert_log')
      .select('id', { count: 'exact', head: true })
      .gte('triggered_at', `${date}T00:00:00+09:00`)
      .lt('triggered_at', `${date}T24:00:00+09:00`)
      .eq('success', true)

    await sendDailyDigest({
      date,
      newLeads,
      byChannel,
      conversions,
      revenue,
      roasPct,
      alertCount: alertCount ?? 0,
    })

    return NextResponse.json({
      success: true,
      digest: { date, newLeads, conversions, revenue, spend, roasPct, alertCount: alertCount ?? 0 },
    })
  } catch (err) {
    console.error('[/api/cron/daily-digest] failed', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
