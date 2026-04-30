// ─────────────────────────────────────────────
// /api/admin/permissions — role × permission 매트릭스 조회·편집
// 권한 :
//   GET  : 모든 admin (UI 표시용)
//   POST : super_admin 만 (매트릭스 변경)
//
// POST body : { role_code, permission_code, grant: boolean }
// ─────────────────────────────────────────────

import { createAdminClient } from '@/lib/supabase/admin'
import { guardApi } from '@/lib/admin/auth-helpers'
import { invalidatePermissionsCache } from '@/lib/admin/permissions-check'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const guard = await guardApi()
  if (!guard.ok) return guard.response

  const admin = createAdminClient()
  const [roles, perms, matrix] = await Promise.all([
    admin.from('app_roles').select('*').order('sort_order'),
    admin.from('app_permissions').select('*').order('sort_order'),
    admin.from('role_permissions').select('role_code, permission_code'),
  ])

  if (roles.error || perms.error || matrix.error) {
    return NextResponse.json(
      { error: roles.error?.message ?? perms.error?.message ?? matrix.error?.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    roles: roles.data,
    permissions: perms.data,
    matrix: matrix.data,
  })
}

export async function POST(request: NextRequest) {
  const guard = await guardApi(['super_admin'])
  if (!guard.ok) return guard.response

  const body = await request.json()
  const { role_code, permission_code, grant } = body
  if (!role_code || !permission_code || typeof grant !== 'boolean') {
    return NextResponse.json(
      { error: 'role_code / permission_code / grant(boolean) 필수' },
      { status: 400 }
    )
  }

  const admin = createAdminClient()
  if (grant) {
    const { error } = await admin
      .from('role_permissions')
      .upsert({ role_code, permission_code }, { onConflict: 'role_code,permission_code' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await admin
      .from('role_permissions')
      .delete()
      .eq('role_code', role_code)
      .eq('permission_code', permission_code)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  invalidatePermissionsCache()
  return NextResponse.json({ success: true })
}
