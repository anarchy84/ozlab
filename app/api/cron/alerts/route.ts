// ─────────────────────────────────────────────
// /api/cron/alerts — Vercel Cron 매시간 진입점 (이상 시그널 평가)
//
// 인증: Vercel Cron 은 자동으로 Authorization: Bearer <CRON_SECRET> 헤더를 박음.
//      CRON_SECRET env 미설정 시엔 anyone 호출 가능 (개발용). 운영에서는 필수.
//
// 동작: 모든 활성 룰을 평가하고 위반 시 슬랙 발송.
//      쿨다운은 evaluator 내부에서 체크.
// ─────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { evaluateAllActiveRules } from '@/lib/alerts/evaluator'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 룰 30개+30일평균 시 시간 소요 가능

export async function GET(req: NextRequest) {
  // Vercel Cron 인증
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  try {
    const startedAt = Date.now()
    const results = await evaluateAllActiveRules()
    const elapsed = Date.now() - startedAt

    const triggered = results.filter((r) => r.result.triggered).length
    const skipped = results.length - triggered

    return NextResponse.json({
      success: true,
      summary: {
        total: results.length,
        triggered,
        skipped,
        elapsed_ms: elapsed,
      },
      results: results.map((r) => ({
        rule_id: r.ruleId,
        rule_name: r.ruleName,
        triggered: r.result.triggered,
        value: r.result.value,
        baseline: r.result.baseline,
        context: r.result.contextLabel,
      })),
    })
  } catch (err) {
    console.error('[/api/cron/alerts] failed', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
