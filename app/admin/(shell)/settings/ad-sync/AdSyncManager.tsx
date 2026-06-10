'use client'

// ─────────────────────────────────────────────
// 광고 시트 sync — 페이드 미디어 전용
//
// 카드 :
//   · URL 입력 + 저장
//   · "페이드 미디어 sync"
//   · 마지막 sync 상태
//
// 상단 :
//   · 최근 50건 미리보기
// ─────────────────────────────────────────────

import { useEffect, useState, useCallback } from 'react'

type SourceType = 'paid_media'

interface Config {
  sheet_csv_url_paid: string | null
  last_synced_at_paid: string | null
  last_status_paid: string | null
  last_message_paid: string | null
}

interface Metric {
  date: string
  channel: string
  service: string | null
  impressions: number
  clicks: number
  conversions: number
  spend: number
  lead_qty: number | null
  source: string | null
  synced_at: string | null
}

export default function AdSyncManager() {
  const [config, setConfig] = useState<Config | null>(null)
  const [recent, setRecent] = useState<Metric[]>([])
  const [urlPaid, setUrlPaid] = useState('')
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
      setUrlPaid(j.config?.sheet_csv_url_paid ?? '')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const saveUrl = async (type: SourceType, url: string) => {
    setWorking(true)
    setMsg('')
    const res = await fetch('/api/admin/ad-sync', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheet_csv_url_paid: url || null }),
    })
    if (res.ok) {
      setMsg('✅ 페이드 미디어 URL 저장 완료')
      void fetchAll()
    } else setMsg('❌ 저장 실패')
    setWorking(false)
  }

  const runSync = async (type?: SourceType) => {
    setWorking(true)
    setMsg('페이드 미디어 sync 중…')
    const res = await fetch('/api/admin/ad-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'paid_media' }),
    })
    const j = await res.json().catch(() => ({}))
    if (res.ok) {
      const parts: string[] = []
      if (j.results) {
        for (const r of j.results) {
          parts.push(`페이드 ${r.rows ?? 0}행`)
        }
      } else if (j.rows !== undefined) {
        parts.push(`${j.rows}행`)
      }
      setMsg(`✅ ${parts.join(' + ')} 완료`)
    } else {
      setMsg(`❌ ${j.error ?? '실패'}`)
    }
    setWorking(false)
    void fetchAll()
  }

  if (loading || !config) {
    return <div className="text-center py-12 text-ink-500">로딩 중...</div>
  }

  return (
    <div className="space-y-5 max-w-5xl">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-100">광고 성과 시트 sync</h1>
          <p className="text-sm text-ink-400 mt-1">
            페이드 미디어(네이버/메타/구글) 성과 시트를 ad_metrics 로 동기화합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => runSync()}
          disabled={working || !config.sheet_csv_url_paid}
          className="px-4 py-2 bg-brand-blue text-white text-sm font-bold rounded hover:bg-brand-dark disabled:opacity-50"
        >
          🔄 페이드 미디어 sync
        </button>
      </div>

      {msg && (
        <div className="text-sm text-ink-200 bg-ink-900/60 border border-ink-700 rounded px-3 py-2">
          {msg}
        </div>
      )}

      {/* 페이드 미디어 카드 */}
      <SyncCard
        title="📣 페이드 미디어 시트"
        subtitle="네이버/메타/구글/카카오 등 광고 플랫폼 일별 성과. utm 어트리뷰션과 매칭."
        url={urlPaid}
        setUrl={setUrlPaid}
        onSave={() => saveUrl('paid_media', urlPaid)}
        onSync={() => runSync('paid_media')}
        working={working}
        lastSyncedAt={config.last_synced_at_paid}
        lastStatus={config.last_status_paid}
        lastMessage={config.last_message_paid}
        headerGuide={[
          '날짜          : YYYY-MM-DD',
          '출처          : naver-ads / google-ads / meta-ads / kakao-ads / ... (표준 channel_code)',
          '노출 (impressions) : 그 날 그 매체 노출수',
          '클릭 (clicks)      : 그 날 그 매체 클릭수',
          '전환 (conversions) : (선택) 광고 플랫폼 기준 전환',
          '광고비 (spend)     : 그 날 그 매체 소진 비용',
        ]}
        accentClass="bg-blue-900/10 border-blue-700/40"
      />

      {/* URL 변환 안내 */}
      <section className="bg-ink-900 border border-ink-700 rounded-lg p-4 text-xs text-ink-400">
        <h3 className="font-bold text-ink-200 mb-1">💡 URL 변환 자동</h3>
        <p>
          시트 주소(<span className="text-ink-300">/edit?usp=sharing</span> 또는 <span className="text-ink-300">#gid=123</span>)를 그대로 붙여넣으면 자동으로 CSV export 형태로 변환합니다.
          시트 권한은 <strong className="text-ink-200">&ldquo;링크가 있는 모든 사용자 — 뷰어&rdquo;</strong> 로 설정.
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
                  <th className="text-left px-3 py-2">소스</th>
                  <th className="text-left px-3 py-2">출처/채널</th>
                  <th className="text-right px-3 py-2">노출</th>
                  <th className="text-right px-3 py-2">클릭</th>
                  <th className="text-right px-3 py-2">전환</th>
                  <th className="text-right px-3 py-2">광고비</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {recent.map((m, i) => (
                  <tr key={i} className="hover:bg-ink-800/30">
                    <td className="px-3 py-1.5 text-ink-300 font-mono">{m.date}</td>
                    <td className="px-3 py-1.5">
                      <SourceBadge source={m.source} />
                    </td>
                    <td className="px-3 py-1.5 text-ink-200">{m.channel}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-ink-400">
                      {m.impressions ? m.impressions.toLocaleString() : '—'}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-ink-400">
                      {m.clicks ? m.clicks.toLocaleString() : '—'}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-ink-300">
                      {m.conversions ? m.conversions.toLocaleString() : '—'}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-brand-neon">
                      {Number(m.spend).toLocaleString()}원
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

// ─────────────────────────────────────────────
// 시트 카드 — 페이드 미디어
// ─────────────────────────────────────────────
function SyncCard({
  title,
  subtitle,
  url,
  setUrl,
  onSave,
  onSync,
  working,
  lastSyncedAt,
  lastStatus,
  lastMessage,
  headerGuide,
  accentClass,
}: {
  title: string
  subtitle: string
  url: string
  setUrl: (v: string) => void
  onSave: () => void
  onSync: () => void
  working: boolean
  lastSyncedAt: string | null
  lastStatus: string | null
  lastMessage: string | null
  headerGuide: string[]
  accentClass: string
}) {
  return (
    <section className={`${accentClass} border rounded-lg p-5 space-y-3`}>
      <div>
        <h2 className="text-base font-bold text-ink-100">{title}</h2>
        <p className="text-xs text-ink-400 mt-0.5">{subtitle}</p>
      </div>
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://docs.google.com/spreadsheets/d/.../edit?usp=sharing"
        className="w-full px-3 py-2 bg-ink-900 border border-ink-700 text-ink-100 rounded text-sm font-mono"
      />
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={onSave}
          disabled={working}
          className="px-3 py-1.5 bg-ink-700 text-ink-200 text-sm rounded hover:bg-ink-600 disabled:opacity-50"
        >
          URL 저장
        </button>
        <button
          type="button"
          onClick={onSync}
          disabled={working || !url}
          className="px-3 py-1.5 bg-brand-blue text-white text-sm font-bold rounded hover:bg-brand-dark disabled:opacity-50"
        >
          이 시트만 sync
        </button>
      </div>
      {lastSyncedAt && (
        <p className="text-[11px] text-ink-500">
          마지막 동기화 : {new Date(lastSyncedAt).toLocaleString('ko-KR')}
          {' · '}
          <span className={lastStatus === 'success' ? 'text-brand-neon' : 'text-red-400'}>
            {lastStatus ?? '-'}
          </span>
          {lastMessage && (
            <>
              {' · '}
              <span className="text-ink-400">{lastMessage}</span>
            </>
          )}
        </p>
      )}
      <details className="text-xs text-ink-400">
        <summary className="cursor-pointer text-ink-300 hover:text-ink-100">
          📋 시트 헤더 가이드 (펼치기)
        </summary>
        <pre className="mt-2 text-[11px] bg-ink-900 border border-ink-700 rounded p-3 overflow-x-auto text-ink-300">
{headerGuide.join('\n')}
        </pre>
      </details>
    </section>
  )
}

function SourceBadge({ source }: { source: string | null }) {
  if (source === 'paid_media') {
    return (
      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-blue-900/40 text-blue-200">
        페이드
      </span>
    )
  }
  return <span className="text-ink-500 text-[10px]">{source ?? '—'}</span>
}
