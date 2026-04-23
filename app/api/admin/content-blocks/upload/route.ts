// ─────────────────────────────────────────────
// 인라인 편집 — 이미지 업로드 + 최적화 API
//
// 처리 흐름 :
//   1) multipart 수신 (file + block_key)
//   2) 인증 체크
//   3) Sharp 로 메타 읽기 → 알파 채널 감지
//   4) 리사이즈(최대 2400px) + EXIF 제거 + WebP 변환
//   5) 알파 있으면 PNG fallback 도 같이 저장 (로고 등 투명 이미지 보호)
//   6) Supabase Storage 'public-content' 에 업로드
//   7) { url, fallback_url?, width, height, has_alpha } 반환
//
// 투명 PNG 처리 정책 :
//   - Sharp metadata().hasAlpha 로 자동 감지
//   - 알파 있음 → WebP(알파 보존) + PNG(최적화) 둘 다 저장 → 구형 크롤러 대응
//   - 알파 없음 → WebP 만 저장
// ─────────────────────────────────────────────

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

// Next.js App Router : 이 route 는 반드시 Node 런타임
export const runtime = 'nodejs'
// 캐시 방지 — 업로드는 항상 실시간 처리
export const dynamic = 'force-dynamic'

const MAX_DIMENSION = 2400            // 최대 변 길이 (가로·세로 중 큰 쪽)
const WEBP_QUALITY  = 85
const WEBP_ALPHA_Q  = 90              // 알파가 있을 때 quality 를 살짝 올려 깨짐 방지

export async function POST(request: NextRequest) {
  const supabase = createClient()

  // -------------------------------------------------------------
  // 1) 인증 체크
  // -------------------------------------------------------------
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // -------------------------------------------------------------
  // 2) multipart 파싱
  // -------------------------------------------------------------
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'multipart/form-data 가 아닙니다.' }, { status: 400 })
  }

  const file       = formData.get('file')
  const blockKey   = (formData.get('block_key')   as string | null)?.trim()
  const pathPrefix = (formData.get('path_prefix') as string | null)?.trim()

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'file 필드가 필요합니다.' }, { status: 400 })
  }

  // block_key (홈 인라인 편집 경로) 또는 path_prefix (테이블 직접 편집 경로) 중 하나는 필요
  //   - block_key   : content_blocks 용 — 저장 경로 = {block_key}/{ts}.webp
  //   - path_prefix : packages/products 등 — 저장 경로 = {path_prefix}/{ts}.webp
  const storageKey = blockKey || pathPrefix
  if (!storageKey) {
    return NextResponse.json(
      { error: 'block_key 또는 path_prefix 중 하나는 필수입니다.' },
      { status: 400 }
    )
  }

  // MIME 검증 — bucket 정책과 중복이지만 명확한 에러 메시지 위해
  const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json(
      { error: `허용되지 않는 이미지 타입: ${file.type}` },
      { status: 400 }
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  // -------------------------------------------------------------
  // 3) 메타 읽기 → 알파 감지
  // -------------------------------------------------------------
  let originalMeta: sharp.Metadata
  try {
    originalMeta = await sharp(buffer).metadata()
  } catch (err) {
    return NextResponse.json(
      { error: '이미지 파일을 읽을 수 없습니다. (손상 가능성)' },
      { status: 400 }
    )
  }
  const hasAlpha = !!originalMeta.hasAlpha

  // -------------------------------------------------------------
  // 4) WebP 변환 (+ EXIF 제거 + 리사이즈)
  // -------------------------------------------------------------
  const basePipeline = () =>
    sharp(buffer)
      .rotate() // EXIF orientation 반영 후 메타 제거 (iOS 사진 대응)
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
      })

  let webpBuffer: Buffer
  let webpMeta: sharp.Metadata
  try {
    webpBuffer = await basePipeline()
      .webp({
        quality:      WEBP_QUALITY,
        alphaQuality: hasAlpha ? WEBP_ALPHA_Q : undefined,
        effort:       4,
      })
      .toBuffer()
    webpMeta = await sharp(webpBuffer).metadata()
  } catch (err) {
    console.error('[upload] WebP 변환 실패:', err)
    return NextResponse.json({ error: 'WebP 변환 실패' }, { status: 500 })
  }

  // -------------------------------------------------------------
  // 5) PNG fallback — 알파 있을 때만
  // -------------------------------------------------------------
  let pngBuffer: Buffer | null = null
  if (hasAlpha) {
    try {
      pngBuffer = await basePipeline()
        .png({ compressionLevel: 9, palette: false, effort: 7 })
        .toBuffer()
    } catch (err) {
      console.error('[upload] PNG fallback 생성 실패:', err)
      // PNG 실패해도 WebP 단독으로 진행
    }
  }

  // -------------------------------------------------------------
  // 6) Storage 업로드
  //    경로 : {storageKey}/{timestamp}.{ext}
  //    storageKey 는 block_key (도트 표기법) 또는 path_prefix (슬래시 허용)
  //    점(.)·슬래시(/)는 storage path 에서 그대로 사용 가능
  // -------------------------------------------------------------
  const timestamp = Date.now()
  // 안전한 경로 문자만 허용 (영숫자·점·언더스코어·하이픈·슬래시)
  const keyPrefix = storageKey.replace(/[^a-zA-Z0-9._\-/]/g, '_')
  const webpPath  = `${keyPrefix}/${timestamp}.webp`
  const pngPath   = `${keyPrefix}/${timestamp}.png`

  const { error: webpErr } = await supabase.storage
    .from('public-content')
    .upload(webpPath, webpBuffer, {
      contentType: 'image/webp',
      upsert:      false,
      cacheControl: '31536000', // 1년 — URL 자체가 timestamp 로 버저닝되므로 안전
    })

  if (webpErr) {
    return NextResponse.json({ error: `업로드 실패: ${webpErr.message}` }, { status: 500 })
  }

  const { data: webpPublic } = supabase.storage
    .from('public-content')
    .getPublicUrl(webpPath)

  let fallbackUrl: string | undefined
  if (pngBuffer) {
    const { error: pngErr } = await supabase.storage
      .from('public-content')
      .upload(pngPath, pngBuffer, {
        contentType:  'image/png',
        upsert:       false,
        cacheControl: '31536000',
      })
    if (!pngErr) {
      const { data: pngPublic } = supabase.storage
        .from('public-content')
        .getPublicUrl(pngPath)
      fallbackUrl = pngPublic.publicUrl
    } else {
      console.error('[upload] PNG fallback 업로드 실패:', pngErr)
    }
  }

  // -------------------------------------------------------------
  // 7) 응답 — ImageValue 형태로 클라이언트가 바로 PATCH 에 쓸 수 있게
  // -------------------------------------------------------------
  return NextResponse.json({
    success:      true,
    url:          webpPublic.publicUrl,
    fallback_url: fallbackUrl,
    width:        webpMeta.width ?? null,
    height:       webpMeta.height ?? null,
    format:       'webp',
    has_alpha:    hasAlpha,
    original: {
      format: originalMeta.format,
      width:  originalMeta.width,
      height: originalMeta.height,
      size:   buffer.length,
    },
    optimized_size: webpBuffer.length,
  })
}
