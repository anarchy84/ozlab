// ─────────────────────────────────────────────
// /api/admin/media — 이미지 업로드 + WebP 자동변환 + 미디어 목록
//
// 권한 : super_admin / admin / marketer
//
// POST :
//   1) multipart/form-data (file, alt_text)
//   2) Sharp 로 1200px 가로 리사이즈 + WebP quality 82 변환
//   3) 원본 + WebP 둘 다 Storage('media' bucket) 업로드
//   4) media 테이블에 메타 INSERT
//
// GET : 최근순 100건
// ─────────────────────────────────────────────

import { createAdminClient } from '@/lib/supabase/admin'
import { guardApi } from '@/lib/admin/auth-helpers'
import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const BUCKET = 'media'

// ─── GET : 미디어 목록 ───────────────────────
export async function GET() {
  const guard = await guardApi(['super_admin', 'admin', 'marketer'])
  if (!guard.ok) return guard.response

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('media')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

// ─── POST : 업로드 ───────────────────────────
export async function POST(request: NextRequest) {
  const guard = await guardApi(['super_admin', 'admin', 'marketer'])
  if (!guard.ok) return guard.response

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const altText = (formData.get('alt_text') as string) || ''

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Invalid file type: ${file.type}` },
      { status: 400 }
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  // 파일명 정리 (한글 → 안전한 slug)
  const baseName = file.name
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9가-힣]/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase()
    .substring(0, 60)
  const timestamp = Date.now()

  // Sharp 로 메타 추출 + WebP 변환
  let webpBuffer: Buffer
  let metadata: sharp.Metadata
  try {
    const sharpInstance = sharp(buffer)
    metadata = await sharpInstance.metadata()
    webpBuffer = await sharpInstance
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer()
  } catch (e) {
    console.error('[media POST] sharp', e)
    return NextResponse.json({ error: 'Image processing failed' }, { status: 500 })
  }

  const admin = createAdminClient()
  const ext = file.type.split('/')[1] || 'bin'
  const originalPath = `uploads/${timestamp}-${baseName}.${ext}`
  const webpPath = `uploads/${timestamp}-${baseName}.webp`

  // 원본 업로드
  const { error: origErr } = await admin.storage
    .from(BUCKET)
    .upload(originalPath, buffer, { contentType: file.type, upsert: false })
  if (origErr) {
    return NextResponse.json(
      { error: `Original upload failed: ${origErr.message}` },
      { status: 500 }
    )
  }

  // WebP 업로드
  const { error: webpErr } = await admin.storage
    .from(BUCKET)
    .upload(webpPath, webpBuffer, { contentType: 'image/webp', upsert: false })
  if (webpErr) {
    // 원본 정리
    await admin.storage.from(BUCKET).remove([originalPath])
    return NextResponse.json(
      { error: `WebP upload failed: ${webpErr.message}` },
      { status: 500 }
    )
  }

  // public URL
  const { data: origUrl } = admin.storage.from(BUCKET).getPublicUrl(originalPath)
  const { data: webpUrl } = admin.storage.from(BUCKET).getPublicUrl(webpPath)

  // DB 기록
  const { data: mediaRecord, error: dbErr } = await admin
    .from('media')
    .insert({
      file_name: file.name,
      storage_path: origUrl.publicUrl,
      webp_path: webpUrl.publicUrl,
      mime_type: file.type,
      file_size: file.size,
      width: metadata.width || null,
      height: metadata.height || null,
      alt_text: altText,
      uploaded_by: guard.profile.user_id,
    })
    .select()
    .single()

  if (dbErr) {
    // 업로드 정리
    await admin.storage.from(BUCKET).remove([originalPath, webpPath])
    return NextResponse.json({ error: dbErr.message }, { status: 500 })
  }

  return NextResponse.json(mediaRecord, { status: 201 })
}
