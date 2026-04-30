'use client'

// ─────────────────────────────────────────────
// 광고 시트 sync 골격
//   1. 시트 CSV URL 등록
//   2. "지금 sync" 버튼 → fetch CSV → ad_metrics UPSERT
//   3. 최근 50건 미리보기
// ─────────────────────────────────────────────

import { useEffect, useState, useCallback } from 'react'

interface Config {
  sheet_csv_url: string | null
  last_synced_at: string | null
  last_status: string | null
  last_message: string | null
}

interface Metric {
  date: string
  channel: string
  service: string | null
  impressions: number
  clicks: number
  conversions: number
  spend: number
  source: string | null
  synced_at: string | null
}

export default function AdSyncManager() {
  const [config, setConfig] = useState<Config | null>(null)
  const [recent, setRecent] = useState<Metric[]>([])
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [msg, setMsg] = useState<string>('')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/ad-sync', { cache: 'no-store' })
    if (res.ok) {
      const j = await res.json()
      setConfig(j.config)
      setRecent(j.recent ?? [])
      setUrl(j.config?.sheet_csv_url ?? '')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const saveUrl = async () => {
    setWorking(true)
    setMsg('')
    const res = await fetch('/api/admin/ad-sync', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheet_csv_url: url || null }),
    })
    if (res.ok) {
      setMsg('✅ URL 저장 완료')
      void fetchAll()
    } else setMsg('❌ 저장 실패')
    setWorking(false)
  }

  const runSync = async () => {
    setWorking(true)
    setMsg('동기화 중…')
    const res = await fetch('/api/admin/ad-sync', { method: 'POST' })
    const j = await res.json().catch(() => ({}))
    if (res.ok) setMsg(`✅ ${j.rows}행 동기화 완료`)
    else setMsg(`❌ ${j.error ?? '실패'}`)
    setWorking(false)
    void fetchAll()
  }

  if (loading || !config) {
    return <div className="text-center py-12 text-ink-500">로딩 중...</div>
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-100">광고 성과 시트 sync</h1>
          <p className="text-sm text-ink-400 mt-1">
            Google Sheets 에 입력된 광고 일별 성과를 ad_metrics 테이블로 동기화합니다.
          </p>
        </div>
        <a
          href="/admin/help/utm"
          target="_blank"
          rel="noopener"
          className="text-xs text-naver-neon hover:underline"
        >
          🎯 UTM 표준 가이드 보기 ↗
        </a>
      </div>

      {/* URL 등록 */}
      <section className="bg-surface-darkSoft border border-ink-700 rounded-lg p-5 space-y-3">
        <h2 className="text-lg font-bold text-ink-100">1. 시트 URL</h2>
        <p className="text-xs text-ink-400">
          Google Sheets → 파일 → 공유 → "웹에 게시" → CSV 형식 → 게시 → URL 복사 후 붙여넣기
        </p>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
          className="w-full px-3 py-2 bg-ink-900 border border-ink-700 text-ink-100 rounded text-sm font-mono"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={saveUrl}
            disabled={working}
            className="px-4 py-2 bg-ink-700 text-ink-200 text-sm rounded hover:bg-ink-600 disabled:opacity-50"
          >
            URL 저장
          </button>
          <button
            type="button"
            onClick={runSync}
            disabled={working || !config.sheet_csv_url}
            className="px-4 py-2 bg-naver-green text-white text-sm font-bold rounded hover:bg-naver-dark disabled:opacity-50"
          >
            🔄 지금 동기화
          </button>
        </div>
        {msg && <div className="text-sm text-ink-300">{msg}</div>}
        {config.last_synced_at && (
          <p className="text-[11px] text-ink-500">
            마지막 동기화 : {new Date(config.last_synced_at).toLocaleString('ko-KR')}
            {' · '}
            <span className={config.last_status === 'success' ? 'text-naver-neon' : 'text-red-400'}>
              {config.last_status}
            </span>
            {' · '}
            {config.last_message}
          </p>
        )}
      </section>

      {/* CSV 컬럼 가이드 */}
      <section className="bg-ink-900 border border-ink-700 rounded-lg p-5">
        <h3 className="text-sm font-bold text-ink-200 mb-2">📋 시트 컬럼 가이드</h3>
        <p className="text-xs text-ink-400 mb-2">
          시트 1행에 다음 헤더 중 한 가지 (한글/영문 모두 OK):
        </p>
        <pre className="text-[11px] bg-ink-800 border border-ink-700 rounded p-3 overflow-x-auto text-ink-300">{`date(필수)        : 날짜 / 일자  ── YYYY-MM-DD
channel(필수)     : 매체 / 채널  ── naver-search / google-ads / meta / daangn ...
service          : 서비스 / 상품군 ── 토스단말기 / 인터넷가입 / POS (선택)
impressions      : 노출수 / 노출
clicks           : 클릭수 / 클릭
conversions      : 전환수 / 전환
spend            : 광고비 / 비용 ── 콤마(,)·₩·원 자동 제거`}</pre>
        <p className="text-[11px] text-ink-500 mt-2">
          ※ 동일 (date, channel, service) 행은 UPSERT — 덮어씀.
        </p>
      </section>

      {/* 최근 동기화 데이터 */}
      <section>
        <h3 className="text-sm font-bold text-ink-200 mb-2">최근 50건</h3>
        {recent.length === 0 ? (
          <p className="text-ink-500 text-sm">데이터 없음. 위 sync 실행 후 다시 확인.</p>
        ) : (
          <div className="bg-surface-darkSoft border border-ink-700 rounded-lg overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-ink-900 text-ink-400">
                <tr>
                  <th className="text-left px-3 py-2">날짜</th>
                  <th className="text-left px-3 py-2">매체</th>
                  <th className="text-left px-3 py-2">서비스</th>
                  <th className="text-right px-3 py-2">노출</th>
                  <th className="text-right px-3 py-2">클릭</th>
                  <th className="text-right px-3 py-2">전환</th>
                  <th className="text-right px-3 py-2">광고비</th>
                  <th className="text-left px-3 py-2">소스</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {recent.map((m, i) => (
                  <tr key={i} className="hover:bg-ink-800/30">
                    <td className="px-3 py-1.5 text-ink-300">{m.date}</td>
                    <td className="px-3 py-1.5 text-ink-200">{m.channel}</td>
                    <td className="px-3 py-1.5 text-ink-300">{m.service ?? '—'}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-ink-300">
                      {m.impressions.toLocaleString()}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-ink-300">
                      {m.clicks.toLocaleString()}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-ink-200">
                      {m.conversions.toLocaleString()}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-naver-neon">
                      {Number(m.spend).toLocaleString()}
                    </td>
                    <td className="px-3 py-1.5 text-ink-500">{m.source ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-ink-500">
        ※ 자동 동기화(매시간 cron)는 다음 세션에 추가 예정. 지금은 수동 실행만.
      </p>
    </div>
  )
}
