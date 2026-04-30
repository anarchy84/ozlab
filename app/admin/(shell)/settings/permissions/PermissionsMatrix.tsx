'use client'

// ─────────────────────────────────────────────
// 권한 매트릭스 — 가로 role × 세로 permission 체크박스 그리드
// super_admin 만 진입 가능. 셀 클릭 → 즉시 토글 + DB UPSERT/DELETE.
// ─────────────────────────────────────────────

import { useEffect, useState, useCallback } from 'react'

interface Role {
  code: string
  label: string
  description: string | null
  sort_order: number
  is_legacy: boolean
}
interface Permission {
  code: string
  group_label: string
  label: string
  description: string | null
  sort_order: number
}
type MatrixSet = Set<string>          // "role|perm"

function key(role: string, perm: string) {
  return `${role}|${perm}`
}

export default function PermissionsMatrix() {
  const [roles, setRoles] = useState<Role[]>([])
  const [perms, setPerms] = useState<Permission[]>([])
  const [matrix, setMatrix] = useState<MatrixSet>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [showLegacy, setShowLegacy] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/permissions', { cache: 'no-store' })
    if (res.ok) {
      const j = await res.json()
      setRoles(j.roles ?? [])
      setPerms(j.permissions ?? [])
      setMatrix(new Set((j.matrix ?? []).map((m: { role_code: string; permission_code: string }) => key(m.role_code, m.permission_code))))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const toggle = async (roleCode: string, permCode: string) => {
    if (roleCode === 'super_admin') {
      alert('super_admin 은 모든 권한을 자동으로 가집니다 (코드 강제).')
      return
    }
    const k = key(roleCode, permCode)
    const grant = !matrix.has(k)
    setSaving(k)

    const res = await fetch('/api/admin/permissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role_code: roleCode, permission_code: permCode, grant }),
    })

    if (res.ok) {
      setMatrix((prev) => {
        const next = new Set(prev)
        if (grant) next.add(k)
        else next.delete(k)
        return next
      })
    } else {
      const err = await res.json().catch(() => ({}))
      alert(err.error ?? '저장 실패')
    }
    setSaving(null)
  }

  if (loading) {
    return <div className="text-center py-12 text-ink-500">로딩 중...</div>
  }

  const visibleRoles = showLegacy ? roles : roles.filter((r) => !r.is_legacy)

  // 그룹별로 묶기
  const groups = Array.from(new Set(perms.map((p) => p.group_label)))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink-100">권한 매트릭스</h1>
          <p className="text-sm text-ink-400 mt-1">
            셀 클릭 = 즉시 부여/회수. super_admin 은 모든 권한 자동.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-300">
          <input
            type="checkbox"
            checked={showLegacy}
            onChange={(e) => setShowLegacy(e.target.checked)}
            className="w-4 h-4 accent-naver-green"
          />
          레거시 role 표시 (admin·marketer·viewer)
        </label>
      </div>

      <div className="bg-surface-darkSoft border border-ink-700 rounded-lg overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-ink-900 z-10">
            <tr>
              <th className="text-left px-3 py-3 text-ink-400 font-semibold sticky left-0 bg-ink-900 min-w-[260px]">
                권한
              </th>
              {visibleRoles.map((r) => (
                <th
                  key={r.code}
                  className={`px-3 py-3 text-center font-semibold whitespace-nowrap ${
                    r.is_legacy ? 'text-amber-400' : 'text-ink-200'
                  }`}
                  title={r.description ?? ''}
                >
                  {r.is_legacy && '⚠️ '}
                  {r.label}
                  <div className="text-[10px] text-ink-500 font-normal">
                    {r.code}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <Group key={g} group={g}>
                {perms
                  .filter((p) => p.group_label === g)
                  .map((p) => (
                    <tr key={p.code} className="border-t border-ink-800 hover:bg-ink-800/30">
                      <td className="px-3 py-2 sticky left-0 bg-surface-darkSoft">
                        <div className="text-ink-100">{p.label}</div>
                        <div className="text-[10px] text-ink-500">{p.code}</div>
                      </td>
                      {visibleRoles.map((r) => {
                        const k = key(r.code, p.code)
                        const granted =
                          r.code === 'super_admin' ? true : matrix.has(k)
                        const disabled = r.code === 'super_admin'
                        return (
                          <td
                            key={r.code}
                            className="px-3 py-2 text-center"
                          >
                            <button
                              type="button"
                              onClick={() => toggle(r.code, p.code)}
                              disabled={disabled || saving === k}
                              className={`w-7 h-7 rounded transition-all ${
                                granted
                                  ? 'bg-naver-green text-white'
                                  : 'bg-ink-700 text-ink-500 hover:bg-ink-600'
                              } ${disabled ? 'opacity-60 cursor-default' : 'cursor-pointer'}`}
                            >
                              {granted ? '✓' : ''}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
              </Group>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-ink-500">
        ※ 매트릭스 변경은 즉시 DB 반영. 페이지/API 가드 적용은 단계적으로 추가됩니다.
      </p>
    </div>
  )
}

function Group({
  group,
  children,
}: {
  group: string
  children: React.ReactNode
}) {
  return (
    <>
      <tr className="bg-ink-800/50">
        <td colSpan={99} className="px-3 py-1.5 text-[11px] font-bold text-naver-neon uppercase tracking-wider">
          {group}
        </td>
      </tr>
      {children}
    </>
  )
}
