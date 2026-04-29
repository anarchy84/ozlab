// ─────────────────────────────────────────────
// 사용자 관리 클라이언트 컴포넌트
//
// - 목록 fetch → 표 렌더
// - [+ 사용자 초대] 모달
// - 행 [편집] → 인라인 편집 (role/부서/활성 토글)
// - 행 [삭제] → confirm + DELETE
// ─────────────────────────────────────────────
'use client'

import { useEffect, useState } from 'react'
import {
  ROLE_LABELS,
  ROLE_BADGE_CLASSES,
  ROLE_EMOJI,
  INVITABLE_ROLES,
} from '@/lib/admin/permissions'
import type { AdminRole } from '@/lib/admin/types'
import type { AdminUserRow } from './page'

export function UsersManager({ myUserId }: { myUserId: string }) {
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' })
      if (!res.ok) {
        const j = (await res.json()) as { error?: string }
        throw new Error(j.error ?? `HTTP ${res.status}`)
      }
      const j = (await res.json()) as { users: AdminUserRow[] }
      setUsers(j.users)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function handleDelete(u: AdminUserRow) {
    if (u.user_id === myUserId) {
      alert('본인은 삭제할 수 없습니다.')
      return
    }
    if (!confirm(`"${u.display_name ?? u.email ?? '사용자'}" 를 영구 삭제할까요?\n\n이 작업은 되돌릴 수 없습니다. 데이터 보존이 필요하면 비활성화를 사용하세요.`)) return

    try {
      const res = await fetch(`/api/admin/users/${u.user_id}`, { method: 'DELETE' })
      if (!res.ok) {
        const j = (await res.json()) as { error?: string }
        throw new Error(j.error ?? `HTTP ${res.status}`)
      }
      await load()
    } catch (e) {
      alert('삭제 실패: ' + (e instanceof Error ? e.message : String(e)))
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-ink-500">총 {users.length}명</span>
        <button
          type="button"
          onClick={() => setShowInvite(true)}
          className="px-3 py-1.5 text-sm font-medium bg-naver-green text-white rounded hover:bg-naver-dark"
        >
          + 사용자 초대
        </button>
      </div>

      {error && (
        <div className="rounded border border-red-800/50 bg-red-900/20 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded border border-ink-700 bg-surface-darkSoft">
        <table className="w-full text-sm">
          <thead className="bg-ink-900 text-ink-600">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">이름</th>
              <th className="px-3 py-2 text-left font-semibold">이메일</th>
              <th className="px-3 py-2 text-left font-semibold">역할</th>
              <th className="px-3 py-2 text-left font-semibold">부서</th>
              <th className="px-3 py-2 text-left font-semibold">최근 로그인</th>
              <th className="px-3 py-2 text-center font-semibold">상태</th>
              <th className="px-3 py-2 text-center font-semibold">관리</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ink-500">
                  불러오는 중...
                </td>
              </tr>
            )}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ink-500">
                  사용자가 없습니다.
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.user_id} className="border-t border-ink-700 hover:bg-ink-800/40">
                <td className="px-3 py-2 font-medium text-ink-100">
                  {u.display_name ?? <span className="text-ink-500">(이름 미설정)</span>}
                  {u.user_id === myUserId && (
                    <span className="ml-1.5 text-[10px] text-ink-500">(본인)</span>
                  )}
                </td>
                <td className="px-3 py-2 text-ink-600">{u.email ?? '-'}</td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium border rounded ${ROLE_BADGE_CLASSES[u.role]}`}
                  >
                    <span>{ROLE_EMOJI[u.role]}</span>
                    {ROLE_LABELS[u.role]}
                  </span>
                </td>
                <td className="px-3 py-2 text-ink-600">{u.department ?? '-'}</td>
                <td className="px-3 py-2 text-ink-500 text-xs">
                  {u.last_sign_in_at
                    ? new Date(u.last_sign_in_at).toLocaleString('ko-KR')
                    : '한 번도 없음'}
                </td>
                <td className="px-3 py-2 text-center">
                  {u.is_active ? (
                    <span className="text-naver-neon text-xs">🟢 활성</span>
                  ) : (
                    <span className="text-ink-500 text-xs">⚫ 비활성</span>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  <div className="flex gap-1.5 justify-center">
                    <button
                      type="button"
                      onClick={() => setEditingId(u.user_id)}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      편집
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(u)}
                      className="text-xs text-red-400 hover:text-red-300"
                      disabled={u.user_id === myUserId}
                    >
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onInvited={() => {
            setShowInvite(false)
            void load()
          }}
        />
      )}

      {editingId && (
        <EditUserModal
          user={users.find((u) => u.user_id === editingId)!}
          isMe={editingId === myUserId}
          onClose={() => setEditingId(null)}
          onSaved={() => {
            setEditingId(null)
            void load()
          }}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// 초대 모달
// ─────────────────────────────────────────────
function InviteModal({
  onClose,
  onInvited,
}: {
  onClose: () => void
  onInvited: () => void
}) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<AdminRole>('counselor')
  const [displayName, setDisplayName] = useState('')
  const [department, setDepartment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/users/invite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          role,
          display_name: displayName.trim() || undefined,
          department: department.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const j = (await res.json()) as { error?: string; hint?: string }
        throw new Error([j.error, j.hint].filter(Boolean).join(' / '))
      }
      onInvited()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <form
        onSubmit={handleSubmit}
        className="bg-surface-darkSoft rounded-lg shadow-xl w-full max-w-md p-6 space-y-4"
      >
        <h3 className="text-lg font-bold text-ink-100">새 사용자 초대</h3>
        <p className="text-xs text-ink-500">
          이메일로 초대 링크를 보냅니다. 받은 사람이 비번을 설정하면 자동으로 어드민 진입할 수 있습니다.
        </p>

        <label className="block text-sm">
          <span className="text-ink-200 font-medium">이메일 *</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="kim@ozlabpay.kr"
            className="mt-1 w-full px-3 py-2 bg-ink-900 border border-ink-700 text-ink-100 placeholder-ink-500 rounded text-sm focus:outline-none focus:border-naver-green"
          />
        </label>

        <label className="block text-sm">
          <span className="text-ink-200 font-medium">역할 *</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as AdminRole)}
            className="mt-1 w-full px-3 py-2 bg-ink-900 border border-ink-700 text-ink-100 placeholder-ink-500 rounded text-sm focus:outline-none focus:border-naver-green"
          >
            {INVITABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_EMOJI[r]} {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="text-ink-200 font-medium">표시 이름</span>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="김상담"
            className="mt-1 w-full px-3 py-2 bg-ink-900 border border-ink-700 text-ink-100 placeholder-ink-500 rounded text-sm focus:outline-none focus:border-naver-green"
          />
        </label>

        <label className="block text-sm">
          <span className="text-ink-200 font-medium">부서 (선택)</span>
          <input
            type="text"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="영업1팀"
            className="mt-1 w-full px-3 py-2 bg-ink-900 border border-ink-700 text-ink-100 placeholder-ink-500 rounded text-sm focus:outline-none focus:border-naver-green"
          />
        </label>

        {error && (
          <div className="rounded border border-red-800/50 bg-red-900/20 p-2 text-xs text-red-300">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm border border-ink-700 rounded hover:bg-ink-900"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={submitting || !email.trim()}
            className="px-3 py-1.5 text-sm bg-naver-green text-white rounded hover:bg-naver-dark disabled:opacity-50"
          >
            {submitting ? '발송 중...' : '초대 보내기'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─────────────────────────────────────────────
// 편집 모달
// ─────────────────────────────────────────────
function EditUserModal({
  user,
  isMe,
  onClose,
  onSaved,
}: {
  user: AdminUserRow
  isMe: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [role, setRole] = useState<AdminRole>(user.role)
  const [displayName, setDisplayName] = useState(user.display_name ?? '')
  const [department, setDepartment] = useState(user.department ?? '')
  const [note, setNote] = useState(user.note ?? '')
  const [isActive, setIsActive] = useState(user.is_active)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/users/${user.user_id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          role,
          display_name: displayName.trim() || null,
          department: department.trim() || null,
          note: note.trim() || null,
          is_active: isActive,
        }),
      })
      if (!res.ok) {
        const j = (await res.json()) as { error?: string }
        throw new Error(j.error ?? `HTTP ${res.status}`)
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <form
        onSubmit={handleSubmit}
        className="bg-surface-darkSoft rounded-lg shadow-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <h3 className="text-lg font-bold text-ink-100">
          사용자 편집 {isMe && <span className="text-sm text-ink-500">(본인)</span>}
        </h3>

        <div className="text-xs text-ink-500">
          이메일: <span className="font-mono text-ink-200">{user.email ?? '-'}</span>
        </div>

        <label className="block text-sm">
          <span className="text-ink-200 font-medium">역할</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as AdminRole)}
            disabled={isMe}
            className="mt-1 w-full px-3 py-2 bg-ink-900 border border-ink-700 text-ink-100 placeholder-ink-500 rounded text-sm focus:outline-none focus:border-naver-green disabled:bg-ink-900"
          >
            <option value="super_admin">👑 최고관리자</option>
            <option value="admin">🛠 운영자</option>
            <option value="counselor">👤 상담사</option>
            <option value="marketer">📊 마케터</option>
            <option value="viewer">👁 뷰어</option>
          </select>
          {isMe && (
            <span className="text-xs text-ink-500">본인은 강등할 수 없습니다.</span>
          )}
        </label>

        <label className="block text-sm">
          <span className="text-ink-200 font-medium">표시 이름</span>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 w-full px-3 py-2 bg-ink-900 border border-ink-700 text-ink-100 placeholder-ink-500 rounded text-sm focus:outline-none focus:border-naver-green"
          />
        </label>

        <label className="block text-sm">
          <span className="text-ink-200 font-medium">부서</span>
          <input
            type="text"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="mt-1 w-full px-3 py-2 bg-ink-900 border border-ink-700 text-ink-100 placeholder-ink-500 rounded text-sm focus:outline-none focus:border-naver-green"
          />
        </label>

        <label className="block text-sm">
          <span className="text-ink-200 font-medium">메모</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="mt-1 w-full px-3 py-2 bg-ink-900 border border-ink-700 text-ink-100 placeholder-ink-500 rounded text-sm focus:outline-none focus:border-naver-green"
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            disabled={isMe}
            className="w-4 h-4"
          />
          <span className="text-ink-200">활성 (체크 해제 시 어드민 진입 차단)</span>
        </label>
        {isMe && (
          <span className="text-xs text-ink-500 -mt-2">
            본인은 비활성화할 수 없습니다.
          </span>
        )}

        {error && (
          <div className="rounded border border-red-800/50 bg-red-900/20 p-2 text-xs text-red-300">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm border border-ink-700 rounded hover:bg-ink-900"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-3 py-1.5 text-sm bg-naver-green text-white rounded hover:bg-naver-dark disabled:opacity-50"
          >
            {submitting ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </div>
  )
}
