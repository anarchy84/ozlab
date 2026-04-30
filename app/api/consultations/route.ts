// ─────────────────────────────────────────────
// /api/consultations — 상담 신청 접수 API
//
// POST /api/consultations
//   body : {
//     name, phone, store_name?, industry?, region?, message?,
//     consent_privacy: true,
//     _hp?: '',                 // honeypot — 봇 차단용
//     utm_source?, utm_medium?, utm_campaign?, utm_term?, utm_content?
//   }
//
// 흐름 :
//   1) Honeypot 체크 — _hp 가 비어있지 않으면 봇으로 판단, 200 OK 로 무시
//   2) 필수 필드 + 동의 체크
//   3) 헤더에서 IP / User-Agent / Referer 추출
//   4) Supabase insert (RLS : anon insert 허용 with consent_privacy=true)
//   5) (선택) Slack webhook 알림 — fire and forget, 실패해도 폼 제출은 성공
//
// 응답 :
//   200 { success: true, id }     — 정상 접수
//   200 { success: true, skipped: true } — 봇 차단(honeypot)
//   400 { error: '...' }           — 검증 실패
//   500 { error: '...' }           — DB / 서버 에러
// ─────────────────────────────────────────────

import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// 봇 차단 — 이 라우트는 캐시 금지
export const dynamic = 'force-dynamic'

// -------------------------------------------------------------
// 입력 타입 (느슨한 검증 — 자세한 검증은 아래 함수에서)
// -------------------------------------------------------------
interface ConsultationInput {
  name?: string
  phone?: string
  store_name?: string
  industry?: string
  region?: string
  message?: string
  consent_privacy?: boolean
  _hp?: string
  // 광고 캠페인
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
  // 광고 클릭 ID
  gclid?: string
  fbclid?: string
  // 유입 경로 (클라가 보낸 First-touch 우선)
  referer?: string
  landing_page_path?: string
}

// -------------------------------------------------------------
// 헬퍼 : 길이 트림 + 빈문자열 → null 변환
// -------------------------------------------------------------
function clean(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim().slice(0, max)
  return t.length === 0 ? null : t
}

// -------------------------------------------------------------
// 헬퍼 : 클라이언트 IP 추출 (Vercel 프록시 헤더)
// -------------------------------------------------------------
function getClientIp(req: NextRequest): string | null {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  const xri = req.headers.get('x-real-ip')
  if (xri) return xri.trim()
  return null
}

// -------------------------------------------------------------
// 헬퍼 : Slack 알림 (fire and forget)
//   환경변수 SLACK_WEBHOOK_URL_CONSULTATIONS 가 설정된 경우만 동작
// -------------------------------------------------------------
async function notifySlack(payload: {
  id: string
  name: string
  phone: string
  store_name: string | null
  industry: string | null
  region: string | null
  message: string | null
}) {
  const url = process.env.SLACK_WEBHOOK_URL_CONSULTATIONS
  if (!url) return // 미설정 시 조용히 패스

  // 슬랙 메시지 — 굵게 / 줄바꿈 / 이모지로 가독성
  const text =
    `:tada: *오즈랩페이 신규 상담 신청*\n` +
    `• 이름 : *${payload.name}*\n` +
    `• 연락처 : *${payload.phone}*\n` +
    (payload.store_name ? `• 매장 : ${payload.store_name}\n` : '') +
    (payload.industry ? `• 업종 : ${payload.industry}\n` : '') +
    (payload.region ? `• 지역 : ${payload.region}\n` : '') +
    (payload.message ? `• 메시지 : ${payload.message}\n` : '') +
    `\n어드민 : <https://ozlabpay.kr/admin/consultations|보기>`

  try {
    // timeout 5초 — 슬랙 끝에서 늦어져도 폼은 빨리 응답
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 5000)
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: ctrl.signal,
    })
    clearTimeout(t)
  } catch (err) {
    // 슬랙 실패는 사용자 응답에 영향 X — 콘솔에만 남김
    console.error('[slack notify failed]', err)
  }
}

// -------------------------------------------------------------
// POST 핸들러
// -------------------------------------------------------------
export async function POST(req: NextRequest) {
  let body: ConsultationInput
  try {
    body = (await req.json()) as ConsultationInput
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 })
  }

  // 1) Honeypot — 봇이 _hp 필드 채우면 200 으로 흘려보냄 (의심하게 만들지 않음)
  if (body._hp && body._hp.trim().length > 0) {
    return NextResponse.json({ success: true, skipped: true })
  }

  // 2) 필수 필드 + 동의 체크
  const name = clean(body.name, 60)
  const phone = clean(body.phone, 30)
  if (!name) {
    return NextResponse.json({ error: '성함을 입력해주세요.' }, { status: 400 })
  }
  if (!phone) {
    return NextResponse.json({ error: '연락처를 입력해주세요.' }, { status: 400 })
  }
  if (body.consent_privacy !== true) {
    return NextResponse.json(
      { error: '개인정보 수집·이용 동의가 필요합니다.' },
      { status: 400 }
    )
  }

  // 3) 메타 정보 추출
  //    referer / landing_page : 클라가 First-touch 로 보낸 게 우선 (정확)
  //    없으면 서버 헤더 referer 사용 (제출 직전 페이지)
  const ip = getClientIp(req)
  const ua = req.headers.get('user-agent')
  const headerReferer = req.headers.get('referer')
  const referer = clean(body.referer, 500) ?? (headerReferer ? headerReferer.slice(0, 500) : null)
  const landingPagePath = clean(body.landing_page_path, 500)

  // 4) Supabase insert
  //    inferred_channel/keyword/creative/landing_title/referer_domain 은
  //    DB trigger 가 INSERT 시 자동으로 채움 (fill_attribution_inferred)
  //    trigger 안에서 content_posts SELECT 가 필요해서 service_role 사용
  //    (RLS 우회 — 폼 제출은 honeypot+consent 로 검증)
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('consultations')
    .insert({
      name,
      phone,
      consent_privacy: true,
      store_name: clean(body.store_name, 80),
      industry: clean(body.industry, 40),
      region: clean(body.region, 40),
      message: clean(body.message, 2000),
      ip_address: ip,
      user_agent: ua ? ua.slice(0, 1000) : null,
      referer,
      landing_page_path: landingPagePath,
      utm_source:  clean(body.utm_source, 100),
      utm_medium:  clean(body.utm_medium, 100),
      utm_campaign:clean(body.utm_campaign, 100),
      utm_term:    clean(body.utm_term, 100),
      utm_content: clean(body.utm_content, 100),
      gclid:       clean(body.gclid, 200),
      fbclid:      clean(body.fbclid, 200),
    })
    .select('id, name, phone, store_name, industry, region, message, inferred_channel')
    .single()

  if (error || !data) {
    console.error('[consultations insert]', error)
    return NextResponse.json(
      { error: '신청 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 }
    )
  }

  // 5) 슬랙 알림 — await 안 해서 응답 지연 방지
  notifySlack({
    id: data.id,
    name: data.name,
    phone: data.phone,
    store_name: data.store_name,
    industry: data.industry,
    region: data.region,
    message: data.message,
  })

  return NextResponse.json({ success: true, id: data.id })
}
