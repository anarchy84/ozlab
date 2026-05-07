// ─────────────────────────────────────────────
// /api/admin/media — 이미지 업로드 + WebP 자동변환 + 미디어 목록
//
// 권한 : super_admin / admin / marketer
//
// POST :
//   formData :
//     file       : File (필수, 최대 30MB)
//     alt_text   : string
//     preset     : 'content' | 'featured' | 'thumb' | 'raw'  (기본 'content')
//
//   1) Sharp 로 preset 별 리사이즈 + WebP quality 82 변환
//   2) 원본 + WebP 둘 다 Storage('media' 버킷) 업로드
//   3) media 테이블에 메타 INSERT (uploaded_by 포함)
//   4) 어느 단계든 실패 시 이전 단계 정리(rollback)
//
// GET : 최근순 100건
//
// 우리편 핸드오프 fix 반영 :
//   - normalizeSlug 로 한글 파일명 → ASCII storage path (CDN 안전)
//   - 30MB 한도 (Vercel Pro 100MB body limit 안에서 여유)
//   - preset 별 sharp 리사이즈 옵션
//   - maxDuration 60s (sharp 처리 시간 여유)
// ─────────────────────────────────────────────

import { createAdminClient } from '@/lib/supabase/admin'
import { guardApi } from '@/lib/admin/auth-helpers'
import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { normalizeSlug } from '@/lib/slug'

// sharp 는 native 모듈 — Edge runtime 에서 안 됨. 명시적으로 nodejs 강제
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Vercel function body 기본 4.5MB. Pro 플랜은 100MB 까지 풀 수 있음.
// 큰 파일도 받을 수 있게 maxDuration 도 늘려 놓음 (sharp 처리 시간 여유)
export const maxDuration = 60

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_SIZE = 30 * 1024 * 1024 // 30MB
const BUCKET = 'media'

function adminClientOrResponse() {
  try {
    return { admin: createAdminClient(), response: null }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Supabase admin client init failed'
    return { admin: null, response: NextResponse.json({ error: message }, { status: 500 }) }
  }
}

// preset → sharp resize 옵션 매핑
//   - content : 너비 1600 캡 (큰 이미지만 줄임)
//   - featured : 1200x630 cover (OG 표준)
//   - thumb : 800x450 cover (16:9 카드 그리드 일관)
//   - raw : resize 안 함 (관리자 직접 지정)
function resizeOptionsFor(p: string): sharp.ResizeOptions | null {
  switch (p) {
    case 'featured':
      return { width: 1200, height: 630, fit: 'cover', position: 'attention' }
    case 'thumb':
      return { width: 800, height: 450, fit: 'cover', position: 'attention' }
    case 'raw':
      return null
    case 'content':
    default:
      return { width: 1600, withoutEnlargement: true }
  }
}

// ─── GET : 미디어 목록 ───────────────────────
export async function GET() {
  const guard = await guardApi(['super_admin', 'admin', 'marketer'])
  if (!guard.ok) return guard.response

  const { admin, response } = adminClientOrResponse()
  if (!admin) {
    if (process.env.NODE_ENV === 'development') return NextResponse.json([])
    return response
  }

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
  // preset : 용도별 표준 사이즈 (content/featured/thumb/raw)
  const preset = ((formData.get('preset') as string) || 'content').toLowerCase()

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 30MB)' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Invalid file type: ${file.type}` },
      { status: 400 }
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  // 파일명 정리 — Storage path 는 ASCII 안전이 핵심.
  // 한글/특수문자가 들어가면 일부 CDN·브라우저에서 URL 인코딩이 깨질 수 있으므로
  // normalizeSlug 로 한글 제거 + 소문자·하이픈만 남긴다. 결과가 비면 'image' 폴백.
  const rawBase = file.name.replace(/\.[^/.]+$/, '')
  const baseName = normalizeSlug(rawBase) || 'image'
  const timestamp = Date.now()

  // Sharp 로 메타 추출 + WebP 변환 (preset 별 resize)
  let webpBuffer: Buffer
  let metadata: sharp.Metadata
  try {
    const sharpInstance = sharp(buffer)
    metadata = await sharpInstance.metadata()

    const resizeOpts = resizeOptionsFor(preset)
    let pipeline = sharpInstance
    if (resizeOpts) pipeline = pipeline.resize(resizeOpts)

    webpBuffer = await pipeline
      .webp({ quality: 82 })
      .toBuffer()
  } catch (e) {
    console.error('[media POST] sharp', e)
    const msg = e instanceof Error ? e.message : 'Image processing failed'
    return NextResponse.json({ error: `Image processing failed: ${msg}` }, { status: 500 })
  }

  const { admin, response } = adminClientOrResponse()
  if (!admin) return response

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
    // 원본 정리 (rollback)
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
    // 업로드 정리 (rollback)
    await admin.storage.from(BUCKET).remove([originalPath, webpPath])
    return NextResponse.json({ error: dbErr.message }, { status: 500 })
  }

  return NextResponse.json(mediaRecord, { status: 201 })
}
