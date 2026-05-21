'use client'

// ─────────────────────────────────────────────
// AlertRulesClient — 이상 시그널 룰 빌더 (CRUD + 프리셋 + 테스트)
// ─────────────────────────────────────────────

import { useState } from 'react'

interface AlertRule {
  id: string
  name: string
  description: string | null
  metric: string
  dimension: string
  dim_filter: Record<string, unknown>
  comparison: string
  threshold: number
  comparison_basis: string
  baseline_value: number | null
  channel_codes: string[]
  user_ids: string[]
  cooldown_minutes: number
  is_active: boolean
  created_at: string
}

interface ChannelOpt {
  code: string
  label: string
}
interface UserOpt {
  user_id: string
  display_name: string | null
  role: string
  slack_user_id: string | null
}

interface Props {
  initialRules: AlertRule[]
  availableChannels: ChannelOpt[]
  availableUsers: UserOpt[]
}

const METRIC_LABELS: Record<string, string> = {
  lead_count: '신규 리드 수',
  cpa: 'CPA (전환당 비용)',
  roas: 'ROAS (%)',
  conversion_rate: '전환율 (%)',
  unassigned_count: '미배정 30분 경과 리드',
  channel_no_lead: '특정 매체 24h 0건',
}

const COMPARISON_LABELS: Record<string, string> = {
  multiplier: '배수 이상 (예: 2배)',
  absolute: '절대값 비교',
  percentage_of_avg: '평균 대비 % 미만 (예: 50%)',
}

const BASIS_LABELS: Record<string, string> = {
  target: '목표값 직접 박기',
  rolling_30d_avg: '최근 30일 평균',
  previous_week: '지난주 동일 시점',
}

// 추천 프리셋 5종 (원클릭 등록)
const PRESETS: Array<Omit<AlertRule, 'id' | 'created_at'>> = [
  {
    name: '신규 리드 어제 0건',
    description: '어제 신규 리드가 1건도 없으면 알림',
    metric: 'lead_count',
    dimension: 'global',
    dim_filter: {},
    comparison: 'absolute',
    threshold: 1,
    comparison_basis: 'target',
    baseline_value: null,
    channel_codes: ['alerts_warning'],
    user_ids: [],
    cooldown_minutes: 720,
    is_active: true,
  },
  {
    name: '미배정 30분 경과 누적',
    description: '담당자 배정 안 된 리드가 30분 이상 쌓이면 알림',
    metric: 'unassigned_count',
    dimension: 'global',
    dim_filter: {},
    comparison: 'absolute',
    threshold: 0,
    comparison_basis: 'target',
    baseline_value: null,
    channel_codes: ['alerts_warning'],
    user_ids: [],
    cooldown_minutes: 60,
    is_active: true,
  },
  {
    name: 'CPA 30일 평균 2배 초과',
    description: '어제 CPA 가 최근 30일 평균의 2배 이상',
    metric: 'cpa',
    dimension: 'global',
    dim_filter: {},
    comparison: 'multiplier',
    threshold: 2,
    comparison_basis: 'rolling_30d_avg',
    baseline_value: null,
    channel_codes: ['alerts_warning'],
    user_ids: [],
    cooldown_minutes: 720,
    is_active: true,
  },
  {
    name: 'ROAS 100% 미만',
    description: '어제 ROAS 가 100% (광고비=매출) 미만이면 적자',
    metric: 'roas',
    dimension: 'global',
    dim_filter: {},
    comparison: 'absolute',
    threshold: 100,
    comparison_basis: 'target',
    baseline_value: 100,
    channel_codes: ['alerts_warning'],
    user_ids: [],
    cooldown_minutes: 720,
    is_active: true,
  },
  {
    name: '일 리드 30일 평균 50% 미만',
    description: '어제 신규 리드가 30일 평균의 절반에도 못 미치면',
    metric: 'lead_count',
    dimension: 'global',
    dim_filter: {},
    comparison: 'percentage_of_avg',
    threshold: 0.5,
    comparison_basis: 'rolling_30d_avg',
    baseline_value: null,
    channel_codes: ['alerts_warning'],
    user_ids: [],
    cooldown_minutes: 720,
    is_active: true,
  },
]

export default function AlertRulesClient({
  initialRules,
  availableChannels,
  availableUsers,
}: Props) {
  const [rules, setRules] = useState<AlertRule[]>(initialRules)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  async function addPreset(preset: Omit<AlertRule, 'id' | 'created_at'>) {
    if (busy) return
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/alert-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preset),
      })
      const data = await res.json()
      if (!res.ok) {
        setMsg({ kind: 'err', text: data?.error ?? '등록 실패' })
        return
      }
      setRules((p) => [data.rule, ...p])
      setMsg({ kind: 'ok', text: `'${preset.name}' 등록 완료` })
    } finally {
      setBusy(false)
    }
  }

  async function toggleRule(rule: AlertRule) {
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/alert-rules/${rule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !rule.is_active }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMsg({ kind: 'err', text: data?.error ?? '변경 실패' })
        return
      }
      setRules((p) => p.map((r) => (r.id === rule.id ? data.rule : r)))
    } finally {
      setBusy(false)
    }
  }

  async function deleteRule(rule: AlertRule) {
    if (!confirm(`'${rule.name}' 룰을 삭제할까요?`)) return
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/alert-rules/${rule.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setMsg({ kind: 'err', text: data?.error ?? '삭제 실패' })
        return
      }
      setRules((p) => p.filter((r) => r.id !== rule.id))
      setMsg({ kind: 'ok', text: '삭제 완료' })
    } finally {
      setBusy(false)
    }
  }

  async function evaluateRule(rule: AlertRule) {
    if (busy) return
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/admin/alert-rules/${rule.id}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (!res.ok) {
        setMsg({ kind: 'err', text: data?.error ?? '평가 실패' })
        return
      }
      const summary =
        `평가: 값=${data.value ?? '-'} / 기준=${data.baseline ?? '-'} → ${data.contextLabel}`
      setMsg({ kind: data.triggered ? 'ok' : 'err', text: summary })
    } finally {
      setBusy(false)
    }
  }

  function formatDimFilter(f: Record<string, unknown>): string {
    const entries = Object.entries(f)
    if (entries.length === 0) return '전체'
    return entries.map(([k, v]) => `${k}=${v}`).join(', ')
  }

  function formatComparison(rule: AlertRule): string {
    const metric = METRIC_LABELS[rule.metric] ?? rule.metric
    const cmp = COMPARISON_LABELS[rule.comparison] ?? rule.comparison
    const basis = BASIS_LABELS[rule.comparison_basis] ?? rule.comparison_basis
    return `${metric} · ${cmp} · 기준 ${basis}${rule.baseline_value !== null ? ` (${rule.baseline_value})` : ''} · 임계 ${rule.threshold}`
  }

  return (
    <div className="space-y-8">
      {msg && (
        <div
          className={`rounded-md border px-4 py-3 text-sm ${
            msg.kind === 'ok'
              ? 'border-naver-green/40 bg-naver-green/5 text-naver-neon'
              : 'border-accent-red/40 bg-accent-red/5 text-accent-red'
          }`}
        >
          {msg.kind === 'ok' ? '✅' : '⚠️'} {msg.text}
        </div>
      )}

      {/* 안내 */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-ink-200 break-keep">
        💡 매시간 Vercel Cron 이 활성 룰을 평가해서 슬랙으로 알립니다. 어제 데이터 기준.
        쿨다운 동안은 같은 룰이 중복 발송되지 않아요. 룰별 [평가] 버튼으로 즉시 테스트.
      </div>

      {/* 추천 프리셋 */}
      <section>
        <h2 className="text-lg font-bold text-ink-100 mb-3">⚡ 추천 룰 (원클릭 추가)</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => addPreset(p)}
              disabled={busy}
              className="rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-left text-sm text-ink-200 hover:bg-ink-800 disabled:opacity-50"
            >
              <div className="font-bold">+ {p.name}</div>
              <div className="text-xs text-ink-500">{p.description}</div>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-500">
          ※ 프리셋은 channel_codes=[&quot;alerts_warning&quot;] 으로 들어감. 채널 안 등록되어 있으면 발송 X.
        </p>
      </section>

      {/* 등록 룰 목록 */}
      <section>
        <h2 className="text-lg font-bold text-ink-100 mb-3">
          📋 등록 룰 ({rules.length})
        </h2>

        {rules.length === 0 ? (
          <div className="rounded-md border border-dashed border-ink-700 bg-ink-900/30 px-4 py-6 text-center text-sm text-ink-500">
            룰이 없습니다. 위 프리셋에서 추가하세요.
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="rounded-lg border border-ink-700 bg-ink-900/30 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                          rule.is_active
                            ? 'bg-naver-green/20 text-naver-neon'
                            : 'bg-ink-800 text-ink-500'
                        }`}
                      >
                        {rule.is_active ? 'ON' : 'OFF'}
                      </span>
                      <h3 className="font-bold text-ink-100">{rule.name}</h3>
                    </div>
                    {rule.description && (
                      <p className="mt-1 text-sm text-ink-400">{rule.description}</p>
                    )}
                    <div className="mt-2 text-xs text-ink-500 space-y-0.5">
                      <div>📐 {formatComparison(rule)}</div>
                      <div>🎯 차원: {rule.dimension} ({formatDimFilter(rule.dim_filter)})</div>
                      <div>
                        📢 채널: {rule.channel_codes.length === 0 ? '(없음)' : rule.channel_codes.join(', ')}
                        {' · '}쿨다운 {rule.cooldown_minutes}분
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleRule(rule)}
                      disabled={busy}
                      className="rounded border border-ink-700 px-2 py-1 text-xs text-ink-200 hover:bg-ink-800 disabled:opacity-30"
                    >
                      {rule.is_active ? '비활성' : '활성화'}
                    </button>
                    <button
                      type="button"
                      onClick={() => evaluateRule(rule)}
                      disabled={busy}
                      className="rounded border border-naver-green/40 px-2 py-1 text-xs text-naver-neon hover:bg-naver-green/10 disabled:opacity-30"
                    >
                      평가
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteRule(rule)}
                      disabled={busy}
                      className="rounded border border-accent-red/40 px-2 py-1 text-xs text-accent-red hover:bg-accent-red/10 disabled:opacity-30"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 환경 안내 */}
      <section className="rounded-lg border border-ink-700 bg-ink-900/30 p-4 text-sm text-ink-300 space-y-2">
        <h3 className="font-bold text-ink-100">참고</h3>
        <div className="text-xs text-ink-400 space-y-1">
          <div>· <strong>채널 등록</strong>: <a href="/admin/settings/slack" className="text-naver-neon underline">슬랙 알림 설정</a> 에서 먼저 채널 등록.</div>
          <div>· <strong>등록된 채널</strong>: {availableChannels.length === 0 ? '(없음 — 슬랙 설정 먼저!)' : availableChannels.map((c) => c.code).join(', ')}</div>
          <div>· <strong>등록된 사용자</strong>: {availableUsers.filter((u) => u.slack_user_id).length}명 (슬랙 ID 매핑 완료)</div>
          <div>· <strong>cron 스케줄</strong>: <code>/api/cron/alerts</code> 매시간 / <code>/api/cron/daily-digest</code> 매일 07:00 KST</div>
          <div>· <strong>인증</strong>: Vercel env <code>CRON_SECRET</code> 권장 (운영 시).</div>
        </div>
      </section>
    </div>
  )
}
