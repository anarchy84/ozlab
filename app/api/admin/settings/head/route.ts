// ─────────────────────────────────────────────
// /api/admin/settings/head — 사이트 head 영역 동적 편집
//
// 권한: super_admin only (head 영역은 보안 민감 — script 박을 수 있어 RCE 위험)
//
// GET  : 현재 site_settings 값 6종 반환
// PUT  : 입력값 일괄 UPSERT
//        body: { gtm_id, ga4_measurement_id, meta_pixel_id, google_site_verification,
//                naver_site_verification, custom_head_html }
//        각 필드 string|null. 빈 문자열은 null 로 정규화.
//
// 적용 흐름:
//   - PUT 직후 SSR layout.tsx 가 다음 요청부터 신규 값 사용 (force-dynamic)
//   - 어드민 경로는 GoogleTagManager / CustomHead 가 차단 (트래킹 코드 안 박힘)
// ─────────────────────────────────────────────

import { guardApi } from '@/lib/admin/auth-helpers'
import {
  SITE_SETTING_KEYS,
  getSiteSettings,
  upsertSiteSetting,
  type SiteSettingKey,
} from '@/lib/admin/site-settings'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await guardApi(['super_admin'])
  if (!guard.ok) return guard.response

  const settings = await getSiteSettings()
  return NextResponse.json(settings)
}

export async function PUT(req: NextRequest) {
  const guard = await guardApi(['super_admin'])
  if (!guard.ok) return guard.response

  let body: Partial<Record<SiteSettingKey, string | null>>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 })
  }

  // 화이트리스트 키만 통과 — body 의 추가 필드는 무시
  const errors: Array<{ key: string; error: string }> = []
  for (const key of SITE_SETTING_KEYS) {
    if (!(key in body)) continue // 안 보낸 키는 변경 안 함
    const raw = body[key]
    const v = typeof raw === 'string' ? raw : raw === null ? null : null

    // custom_head_html 은 길이 제한 (브라우저 다운 방지)
    if (key === 'custom_head_html' && v && v.length > 50000) {
      errors.push({ key, error: 'custom_head_html 은 50,000자 이하' })
      continue
    }

    // GTM/GA4/메타픽셀 ID 는 형식 살짝 검증 (완전한 검증은 아니고 명백한 오타 잡기)
    if (v) {
      if (key === 'gtm_id' && !/^GTM-[A-Z0-9]{6,}$/i.test(v)) {
        errors.push({ key, error: 'GTM ID 형식: GTM-XXXXXXX' })
        continue
      }
      if (key === 'ga4_measurement_id' && !/^G-[A-Z0-9]{6,}$/i.test(v)) {
        errors.push({ key, error: 'GA4 측정 ID 형식: G-XXXXXXXXXX' })
        continue
      }
      if (key === 'meta_pixel_id' && !/^\d{10,17}$/.test(v)) {
        errors.push({ key, error: '메타 픽셀 ID 형식: 숫자 10~17자리' })
        continue
      }
    }

    const r = await upsertSiteSetting(key, v, guard.profile.user_id)
    if (!r.ok) errors.push({ key, error: r.error })
  }

  if (errors.length > 0) {
    return NextResponse.json(
      { error: '일부 항목 저장 실패', details: errors },
      { status: 400 },
    )
  }

  const updated = await getSiteSettings()
  return NextResponse.json({ success: true, settings: updated })
}
