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
//   409 { error: '...', duplicate: true } — 동일 연락처 중복 접수 제한
//   500 { error: '...' }           — DB / 서버 에러
// ─────────────────────────────────────────────

import { createAdminClient } from '@/lib/supabase/admin'
import { normalizePhone } from '@/lib/consultation-policy'
import { getConsultationPolicySettings } from '@/lib/consultation-policy-server'
import { sendMetaLead } from '@/lib/tracking/meta-capi'
import { broadcastNewLead } from '@/lib/slack'
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
  // GA4 식별자 — 폼 제출 ↔ 매출 입력 시 동일 사용자 매칭용 (GA4 MP 보정)
  ga_client_id?: string
  ga_session_id?: string
  // Meta CAPI 매칭용 쿠키 (Purchase 서버 이벤트 시 user_data 로 전송)
  meta_fbp?: string
  meta_fbc?: string
  // 유입 경로 (클라가 보낸 First-touch 우선)
  referer?: string
  landing_page_path?: string
  // Phase 2B: CTA 폼 빌더에서 추가된 비표준 필드 답변
  custom_fields?: Record<string, unknown>
  // Phase 2B: 어느 CTA 에서 제출됐는지 (선택)
  cta_id?: number
}

// 표준 컬럼명 — custom_fields 에서 동일 이름이 들어오면 표준 컬럼으로 승격
const STANDARD_FIELD_IDS = new Set([
  'name', 'phone', 'store_name', 'industry', 'region', 'message',
])

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

// Slack 알림은 lib/slack.ts 의 broadcastNewLead 로 통합 (DB-first + env fallback)
// 자동배정 트리거가 counselor_id 박는 시점에 맞춰 INSERT 후 별도 조회로 담당자 매핑

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
  const normalizedPhone = normalizePhone(phone)
  if (normalizedPhone.length < 7) {
    return NextResponse.json({ error: '연락처를 정확히 입력해주세요.' }, { status: 400 })
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
  const supabase = createAdminClient()

  // 3-1) 블랙리스트 사전 차단 — DB 에 저장하지 않고 조용히 성공 처리
  //      연락처는 하이픈/공백 차이를 없애기 위해 숫자만 비교한다.
  const [{ data: phoneBlocks }, { data: ipBlocks }] = await Promise.all([
    supabase
      .from('abuse_blocklist')
      .select('id, block_value, hit_count, expires_at')
      .eq('block_type', 'phone'),
    ip
      ? supabase
          .from('abuse_blocklist')
          .select('id, block_value, hit_count, expires_at')
          .eq('block_type', 'ip')
          .eq('block_value', ip)
      : Promise.resolve({ data: [] }),
  ])
  const nowMs = Date.now()
  const activePhoneBlock = (phoneBlocks ?? []).find((row) => {
    const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : null
    return (!expiresAt || expiresAt > nowMs) && normalizePhone(row.block_value) === normalizedPhone
  })
  const activeIpBlock = (ipBlocks ?? []).find((row) => {
    const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : null
    return !expiresAt || expiresAt > nowMs
  })
  const activeBlock = activePhoneBlock ?? activeIpBlock
  if (activeBlock) {
    await supabase
      .from('abuse_blocklist')
      .update({ hit_count: Number(activeBlock.hit_count ?? 0) + 1 })
      .eq('id', activeBlock.id)
    return NextResponse.json({ success: true, skipped: true })
  }

  // 3-2) 동일 연락처 중복 접수 제한 — 어드민 설정값 우선, 없으면 기본 30일
  const { duplicatePhoneWindowDays } = await getConsultationPolicySettings()
  const duplicateSince = new Date(
    Date.now() - duplicatePhoneWindowDays * 24 * 60 * 60 * 1000,
  ).toISOString()
  const { data: recentRows } = await supabase
    .from('consultations')
    .select('id, phone, created_at')
    .gte('created_at', duplicateSince)
    .order('created_at', { ascending: false })
    .limit(1000)
  const duplicate = (recentRows ?? []).find((row) => normalizePhone(row.phone) === normalizedPhone)
  if (duplicate) {
    return NextResponse.json(
      {
        error: `이미 최근 ${duplicatePhoneWindowDays}일 내 상담 신청이 접수된 연락처입니다. 급한 문의는 대표번호로 연락해주세요.`,
        duplicate: true,
      },
      { status: 409 },
    )
  }

  // 3-3) Phase 2B: custom_fields 처리
  //   - 표준 컬럼명(name/phone/...)이 들어오면 표준 컬럼으로 승격 (덮어쓰기는 X — body 우선)
  //   - 그 외 키는 그대로 jsonb 에 저장
  const customRaw = body.custom_fields && typeof body.custom_fields === 'object'
    ? body.custom_fields
    : {}
  const customFields: Record<string, unknown> = {}
  // 표준 필드는 본문에 없을 때만 custom 에서 끌어다 씀
  const promotedStore = body.store_name ?? (typeof customRaw.store_name === 'string' ? customRaw.store_name : undefined)
  const promotedIndustry = body.industry ?? (typeof customRaw.industry === 'string' ? customRaw.industry : undefined)
  const promotedRegion = body.region ?? (typeof customRaw.region === 'string' ? customRaw.region : undefined)
  const promotedMessage = body.message ?? (typeof customRaw.message === 'string' ? customRaw.message : undefined)
  for (const [k, v] of Object.entries(customRaw)) {
    if (STANDARD_FIELD_IDS.has(k)) continue   // 표준 필드는 위에서 흡수
    if (typeof k !== 'string' || k.length === 0 || k.length > 60) continue
    if (v === null || v === undefined) continue
    // 값 길이 제한 — 안전
    if (typeof v === 'string' && v.length > 2000) continue
    customFields[k] = v
  }

  // 4) Supabase insert
  //    inferred_channel/keyword/creative/landing_title/referer_domain 은
  //    DB trigger 가 INSERT 시 자동으로 채움 (fill_attribution_inferred)
  //    trigger 안에서 content_posts SELECT 가 필요해서 service_role 사용
  //    (RLS 우회 — 폼 제출은 honeypot+consent 로 검증)
  const { data, error } = await supabase
    .from('consultations')
    .insert({
      name,
      phone,
      consent_privacy: true,
      store_name: clean(promotedStore, 80),
      industry: clean(promotedIndustry, 40),
      region: clean(promotedRegion, 40),
      message: clean(promotedMessage, 2000),
      custom_fields: customFields,
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
      // GA4 식별자 — 매출 입력 시 GA4 Measurement Protocol 로 동일 사용자 보정용
      ga_client_id:  clean(body.ga_client_id, 100),
      ga_session_id: clean(body.ga_session_id, 100),
      // Meta CAPI 매칭용 쿠키
      meta_fbp: clean(body.meta_fbp, 200),
      meta_fbc: clean(body.meta_fbc, 200),
    })
    .select('id, name, phone, store_name, industry, region, message, inferred_channel, counselor_id, utm_campaign')
    .single()

  if (error || !data) {
    console.error('[consultations insert]', error)
    return NextResponse.json(
      { error: '신청 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 }
    )
  }

  // 5) 슬랙 알림 — 채널 broadcast + 담당자 DM (자동배정 트리거가 채운 counselor_id 활용)
  //    DB slack_channels.code = 'leads_main' 으로 broadcast
  //    counselor_id 가 있으면 admin_users.slack_user_id 조회해서 DM
  //    fire-and-forget (await 안 함) — 폼 응답 지연 방지
  ;(async () => {
    try {
      let counselorSlackUserId: string | null = null
      let counselorName: string | null = null
      if (data.counselor_id) {
        const { data: counselor } = await supabase
          .from('admin_users')
          .select('display_name, slack_user_id, slack_dm_enabled')
          .eq('user_id', data.counselor_id)
          .maybeSingle()
        if (counselor) {
          counselorName = counselor.display_name ?? null
          if (counselor.slack_dm_enabled && counselor.slack_user_id) {
            counselorSlackUserId = counselor.slack_user_id
          }
        }
      }
      void broadcastNewLead({
        id: data.id,
        name: data.name,
        phone: data.phone,
        store_name: data.store_name,
        industry: data.industry,
        region: data.region,
        message: data.message,
        inferred_channel: data.inferred_channel,
        utm_campaign: data.utm_campaign,
        counselorSlackUserId,
        counselorName,
      })
    } catch (err) {
      console.error('[slack broadcast prep failed]', err)
    }
  })()

  // 6) Meta CAPI Lead — 서버 측 이벤트 (브라우저 픽셀 Lead 와 event_id 로 dedupe)
  //    · event_id = consultations.id (GTM 픽셀 Lead 태그 도 같은 값 박아야 dedupe 됨 — 가이드 참고)
  //    · user_data: phone(해시) + fbp/fbc + IP + UA → Meta 매칭률 ↑
  //    · LEAD_DEFAULT_VALUE 환경변수 (없으면 30000) 를 추정값으로 같이 전송
  //    · META_PIXEL_ID / META_CAPI_TOKEN env 없으면 sendMetaLead 가 no-op
  void sendMetaLead({
    eventId: data.id,
    eventSourceUrl: body.landing_page_path
      ? `https://www.ozlabpay.kr${body.landing_page_path}`
      : null,
    clientIp: ip,
    clientUserAgent: ua,
    fbp: body.meta_fbp ?? null,
    fbc: body.meta_fbc ?? null,
    phone: data.phone,
    value: Number(process.env.NEXT_PUBLIC_LEAD_DEFAULT_VALUE ?? 30000),
  })

  return NextResponse.json({ success: true, id: data.id })
}
