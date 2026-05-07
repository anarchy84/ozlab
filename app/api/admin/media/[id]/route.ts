// ─────────────────────────────────────────────
// /api/admin/media/[id] — 개별 미디어 삭제
//
// 권한 : super_admin / admin / marketer
//
// 흐름 :
//   1) DB 에서 row 조회 → storage_path + webp_path 추출
//   2) Storage 'media' 버킷에서 두 파일 삭제 (best-effort, 실패해도 진행)
//   3) DB row 삭제
//
// 주의 :
//   - 본문 글에서 이 URL 을 인용 중이면 그 글은 깨질 수 있음 (DB reference 없음).
//   - UI 에서 confirm 안전장치 필수.
// ─────────────────────────────────────────────

import { createAdminClient } from '@/lib/supabase/admin'
import { guardApi } from '@/lib/admin/auth-helpers'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BUCKET = 'media'

// public URL → storage 내부 path 추출
//   예: https://xxx.supabase.co/storage/v1/object/public/media/uploads/123-abc.webp
//        → uploads/123-abc.webp
function publicUrlToStoragePath(url: string | null | undefined): string | null {
  if (!url) return null
  const marker = `/object/public/${BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx < 0) return null
  return decodeURIComponent(url.slice(idx + marker.length))
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const guard = await guardApi(['super_admin', 'admin', 'marketer'])
  if (!guard.ok) return guard.response

  const id = params.id
  if (!id) return NextResponse.json({ error: 'id 누락' }, { status: 400 })

  const admin = createAdminClient()

  // 1) row 조회
  const { data: row, error: rowErr } = await admin
    .from('media')
    .select('id, storage_path, webp_path')
    .eq('id', id)
    .single()
  if (rowErr || !row) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  // 2) Storage 파일 삭제 (best-effort)
  const paths: string[] = []
  const orig = publicUrlToStoragePath(row.storage_path)
  const webp = publicUrlToStoragePath(row.webp_path)
  if (orig) paths.push(orig)
  if (webp) paths.push(webp)
  if (paths.length > 0) {
    const { error: rmErr } = await admin.storage.from(BUCKET).remove(paths)
    if (rmErr) {
      // 실패해도 DB row 삭제는 진행 (storage orphan 보다 inconsistency 방지)
      console.warn('[media DELETE] storage remove failed', rmErr.message, paths)
    }
  }

  // 3) DB row 삭제
  const { error: delErr } = await admin.from('media').delete().eq('id', id)
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, removedFiles: paths.length })
}
