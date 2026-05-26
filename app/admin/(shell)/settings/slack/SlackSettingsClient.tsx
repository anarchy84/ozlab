'use client'

// ─────────────────────────────────────────────
// SlackSettingsClient — 슬랙 채널 + 사용자 매핑 통합 어드민 UI
//
// 영역:
//   A. 채널 목록 (Webhook URL + 활성 토글 + 테스트 + 편집/삭제)
//   B. 추천 채널 안내 (leads_main / alerts_warning / daily_digest / conversions)
//   C. 사용자 매핑 (admin_users.slack_user_id + slack_dm_enabled)
//
// 슬랙 사용자 ID 찾는 법:
//   슬랙 → 본인 프로필 클릭 → 더보기(...) → 멤버 ID 복사 (U03ABC123 같은 형식)
// ─────────────────────────────────────────────

import { useState } from 'react'

interface SlackChannel {
  id: string
  code: string
  label: string
  channel_purpose: string | null
  webhook_url: string
  is_active: boolean
  note: string | null
  created_at: string
}

interface AdminUser {
  user_id: string
  display_name: string | null
  role: string
  is_active: boolean
  slack_user_id: string | null
  slack_dm_enabled: boolean
}

interface Props {
  initialChannels: SlackChannel[]
  initialUsers: AdminUser[]
}

// 추천 채널 프리셋 (대웅이 안 알아도 클릭 한 번에 폼 자동 채움)
const RECOMMENDED_CHANNELS = [
  { code: 'leads_main', label: '신규 리드 채널', purpose: '신규 디비 broadcast — 들어올 때마다' },
  { code: 'alerts_warning', label: '이상 시그널 알림', purpose: 'CPA 2배·신청 50%↓·ROAS 100%↓ 등 룰 트리거' },
  { code: 'daily_digest', label: '일일 다이제스트', purpose: '매일 07:00 어제 KPI 요약' },
  { code: 'conversions', label: '개통 알림', purpose: '매출 발생 시 broadcast (선택)' },
]

function maskWebhook(url: string): string {
  if (!url) return ''
  // 마지막 토큰 부분 마스킹
  return url.replace(/\/[A-Za-z0-9]{20,}$/, '/********')
}

export default function SlackSettingsClient({
  initialChannels,
  initialUsers,
}: Props) {
  const [channels, setChannels] = useState<SlackChannel[]>(initialChannels)
  const [users, setUsers] = useState<AdminUser[]>(initialUsers)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  // ----- 신규 채널 폼 상태 -----
  const [newCode, setNewCode] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [newPurpose, setNewPurpose] = useState('')
  const [newUrl, setNewUrl] = useState('')

  function fillPreset(p: { code: string; label: string; purpose: string }) {
    setNewCode(p.code)
    setNewLabel(p.label)
    setNewPurpose(p.purpose)
    setNewUrl('')
    setMsg(null)
  }

  async function handleCreateChannel() {
    if (busy) return
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/slack/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCode,
          label: newLabel,
          channel_purpose: newPurpose || null,
          webhook_url: newUrl,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMsg({ kind: 'err', text: data?.error ?? '등록 실패' })
        return
      }
      setChannels((p) => [...p, data.channel])
      setNewCode('')
      setNewLabel('')
      setNewPurpose('')
      setNewUrl('')
      setMsg({ kind: 'ok', text: '채널 등록 완료' })
    } catch (e) {
      setMsg({ kind: 'err', text: `네트워크 오류: ${String(e)}` })
    } finally {
      setBusy(false)
    }
  }

  async function handleToggleChannel(ch: SlackChannel) {
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/slack/channels/${ch.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !ch.is_active }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMsg({ kind: 'err', text: data?.error ?? '변경 실패' })
        return
      }
      setChannels((p) => p.map((c) => (c.id === ch.id ? data.channel : c)))
    } finally {
      setBusy(false)
    }
  }

  async function handleDeleteChannel(ch: SlackChannel) {
    if (!confirm(`'${ch.label}' 채널을 삭제할까요? 알람 룰이 이 채널을 가리키고 있으면 발송이 멈춥니다.`)) return
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/slack/channels/${ch.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setMsg({ kind: 'err', text: data?.error ?? '삭제 실패' })
        return
      }
      setChannels((p) => p.filter((c) => c.id !== ch.id))
      setMsg({ kind: 'ok', text: '삭제 완료' })
    } finally {
      setBusy(false)
    }
  }

  async function handleTestChannel(ch: SlackChannel) {
    if (busy) return
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/slack/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel_code: ch.code }),
      })
      const data = await res.json()
      setMsg({
        kind: data.success ? 'ok' : 'err',
        text: data.message ?? (data.success ? '발송 완료' : '발송 실패'),
      })
    } finally {
      setBusy(false)
    }
  }

  // ----- 사용자 슬랙 ID 매핑 -----
  async function handleUpdateUser(
    user: AdminUser,
    patch: { slack_user_id?: string | null; slack_dm_enabled?: boolean },
  ) {
    if (busy) return
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/admin/users/${user.user_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const data = await res.json()
      if (!res.ok) {
        setMsg({ kind: 'err', text: data?.error ?? '저장 실패' })
        return
      }
      setUsers((p) =>
        p.map((u) => (u.user_id === user.user_id ? { ...u, ...patch } as AdminUser : u)),
      )
      setMsg({ kind: 'ok', text: '저장 완료' })
    } finally {
      setBusy(false)
    }
  }

  async function handleTestUserDM(user: AdminUser) {
    if (!user.slack_user_id) {
      setMsg({ kind: 'err', text: '슬랙 사용자 ID 가 비어있음' })
      return
    }
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/admin/slack/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slack_user_id: user.slack_user_id }),
      })
      const data = await res.json()
      setMsg({
        kind: data.success ? 'ok' : 'err',
        text: data.message ?? (data.success ? 'DM 발송 완료' : 'DM 실패'),
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* ──────── 메시지 영역 ──────── */}
      {msg && (
        <div
          className={`rounded-md border px-4 py-3 text-sm ${
            msg.kind === 'ok'
              ? 'border-brand-blue/40 bg-brand-blue/5 text-brand-neon'
              : 'border-accent-red/40 bg-accent-red/5 text-accent-red'
          }`}
        >
          {msg.kind === 'ok' ? '✅' : '⚠️'} {msg.text}
        </div>
      )}

      {/* ──────── 안내 박스 ──────── */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-ink-200 break-keep">
        💡 <strong className="text-ink-100">실무 팀장 핸드오프용.</strong>{' '}
        슬랙 워크스페이스를 만들고 채널별 Incoming Webhook URL 을 발급해서 여기에 박으면
        됩니다. Bot Token 발급하면 DM 도 동작.
        <br />
        Webhook 발급:{' '}
        <a
          href="https://api.slack.com/apps"
          target="_blank"
          rel="noreferrer"
          className="text-brand-neon underline"
        >
          api.slack.com/apps
        </a>{' '}
        → Create New App → Incoming Webhooks → Add New Webhook to Workspace
      </div>

      {/* ──────── 섹션 A: 채널 목록 ──────── */}
      <section>
        <h2 className="text-lg font-bold text-ink-100 mb-3">📢 채널 목록</h2>

        {channels.length === 0 ? (
          <div className="rounded-md border border-dashed border-ink-700 bg-ink-900/30 px-4 py-6 text-center text-sm text-ink-500">
            등록된 채널이 없습니다. 아래에서 추가하세요.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-ink-700">
            <table className="w-full text-sm">
              <thead className="bg-ink-900 text-xs text-ink-400 uppercase">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">코드</th>
                  <th className="px-3 py-2 text-left font-medium">이름</th>
                  <th className="px-3 py-2 text-left font-medium">Webhook URL (마스킹)</th>
                  <th className="px-3 py-2 text-left font-medium">활성</th>
                  <th className="px-3 py-2 text-right font-medium">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {channels.map((ch) => (
                  <tr key={ch.id} className="text-ink-200">
                    <td className="px-3 py-2 font-mono text-xs text-brand-neon">{ch.code}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{ch.label}</div>
                      {ch.channel_purpose && (
                        <div className="text-xs text-ink-500">{ch.channel_purpose}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs font-mono text-ink-500">
                      {maskWebhook(ch.webhook_url)}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => handleToggleChannel(ch)}
                        disabled={busy}
                        className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                          ch.is_active
                            ? 'bg-brand-blue/20 text-brand-neon'
                            : 'bg-ink-800 text-ink-500'
                        }`}
                      >
                        {ch.is_active ? 'ON' : 'OFF'}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleTestChannel(ch)}
                        disabled={busy}
                        className="rounded border border-ink-700 px-2 py-1 text-xs text-ink-200 hover:bg-ink-800"
                      >
                        테스트
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteChannel(ch)}
                        disabled={busy}
                        className="ml-2 rounded border border-accent-red/40 px-2 py-1 text-xs text-accent-red hover:bg-accent-red/10"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ──────── 섹션 B: 신규 채널 추가 + 프리셋 ──────── */}
      <section className="rounded-lg border border-ink-700 bg-ink-900/30 p-4">
        <h2 className="text-lg font-bold text-ink-100 mb-3">➕ 채널 추가</h2>

        <div className="mb-3 flex flex-wrap gap-2">
          {RECOMMENDED_CHANNELS.map((p) => (
            <button
              key={p.code}
              type="button"
              onClick={() => fillPreset(p)}
              className="rounded-md border border-ink-700 bg-ink-900 px-3 py-1 text-xs text-ink-300 hover:bg-ink-800"
            >
              + {p.label}{' '}
              <span className="font-mono text-ink-500">({p.code})</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-ink-200">코드 (영문/숫자/_)</span>
            <input
              type="text"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toLowerCase())}
              placeholder="leads_main"
              className="rounded border border-ink-700 bg-ink-900 px-3 py-2 font-mono text-sm text-ink-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-ink-200">이름</span>
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="신규 리드 채널"
              className="rounded border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-medium text-ink-200">용도 설명 (선택)</span>
            <input
              type="text"
              value={newPurpose}
              onChange={(e) => setNewPurpose(e.target.value)}
              placeholder="신규 디비 들어올 때마다 broadcast"
              className="rounded border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-medium text-ink-200">Webhook URL</span>
            <input
              type="text"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="hooks(.)slack(.)com/services/T../B../<토큰>"
              className="rounded border border-ink-700 bg-ink-900 px-3 py-2 font-mono text-xs text-ink-100"
            />
          </label>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleCreateChannel}
            disabled={busy || !newCode || !newLabel || !newUrl}
            className="rounded-md bg-brand-blue px-5 py-2 text-sm font-bold text-white transition hover:bg-brand-dark disabled:opacity-50"
          >
            {busy ? '저장 중…' : '추가'}
          </button>
        </div>
      </section>

      {/* ──────── 섹션 C: 사용자 매핑 ──────── */}
      <section>
        <h2 className="text-lg font-bold text-ink-100 mb-3">👥 사용자 슬랙 ID 매핑</h2>
        <p className="text-xs text-ink-500 mb-3 break-keep">
          담당자에게 DM 으로 새 리드 알리려면 슬랙 사용자 ID 필요. 슬랙 → 본인 프로필 →
          더보기(...) → 멤버 ID 복사 (U 로 시작하는 영문/숫자). SLACK_BOT_TOKEN 환경변수
          설정된 경우만 DM 실제 발송.
        </p>

        <div className="overflow-hidden rounded-lg border border-ink-700">
          <table className="w-full text-sm">
            <thead className="bg-ink-900 text-xs text-ink-400 uppercase">
              <tr>
                <th className="px-3 py-2 text-left font-medium">이름</th>
                <th className="px-3 py-2 text-left font-medium">Role</th>
                <th className="px-3 py-2 text-left font-medium">슬랙 사용자 ID</th>
                <th className="px-3 py-2 text-left font-medium">DM 수신</th>
                <th className="px-3 py-2 text-right font-medium">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800">
              {users.map((u) => (
                <UserRow
                  key={u.user_id}
                  user={u}
                  busy={busy}
                  onSave={(patch) => handleUpdateUser(u, patch)}
                  onTestDM={() => handleTestUserDM(u)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

// 사용자 한 줄 — 슬랙 ID 인라인 편집 + DM 토글 + 테스트
function UserRow({
  user,
  busy,
  onSave,
  onTestDM,
}: {
  user: AdminUser
  busy: boolean
  onSave: (patch: { slack_user_id?: string | null; slack_dm_enabled?: boolean }) => void
  onTestDM: () => void
}) {
  const [sid, setSid] = useState(user.slack_user_id ?? '')
  const dirty = (sid.trim() || null) !== user.slack_user_id

  return (
    <tr className="text-ink-200">
      <td className="px-3 py-2 font-medium">{user.display_name ?? '(이름 없음)'}</td>
      <td className="px-3 py-2 text-xs text-ink-400">{user.role}</td>
      <td className="px-3 py-2">
        <input
          type="text"
          value={sid}
          onChange={(e) => setSid(e.target.value)}
          placeholder="U03ABC123"
          className="w-40 rounded border border-ink-700 bg-ink-900 px-2 py-1 font-mono text-xs text-ink-100"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="checkbox"
          checked={user.slack_dm_enabled}
          disabled={busy}
          onChange={(e) => onSave({ slack_dm_enabled: e.target.checked })}
        />
      </td>
      <td className="px-3 py-2 text-right">
        <button
          type="button"
          onClick={() => onSave({ slack_user_id: sid.trim() || null })}
          disabled={busy || !dirty}
          className="rounded border border-brand-blue/40 px-2 py-1 text-xs text-brand-neon hover:bg-brand-blue/10 disabled:opacity-30"
        >
          저장
        </button>
        <button
          type="button"
          onClick={onTestDM}
          disabled={busy || !user.slack_user_id}
          className="ml-2 rounded border border-ink-700 px-2 py-1 text-xs text-ink-200 hover:bg-ink-800 disabled:opacity-30"
        >
          DM 테스트
        </button>
      </td>
    </tr>
  )
}
