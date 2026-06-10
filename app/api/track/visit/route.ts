import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface VisitPayload {
  visitor_id?: string
  session_id?: string
  page_path?: string
  page_url?: string
  page_title?: string
  referrer?: string | null
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  utm_term?: string | null
  utm_content?: string | null
  gclid?: string | null
  fbclid?: string | null
  language?: string | null
  timezone?: string | null
  screen_width?: number | null
  screen_height?: number | null
  viewport_width?: number | null
  viewport_height?: number | null
  color_scheme?: string | null
}

export async function POST(req: NextRequest) {
  let body: VisitPayload
  try {
    body = (await req.json()) as VisitPayload
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const pagePath = clean(body.page_path, 500)
  const visitorId = clean(body.visitor_id, 120)
  const sessionId = clean(body.session_id, 120)

  if (!pagePath || !visitorId || !sessionId) {
    return NextResponse.json({ error: 'missing_required_fields' }, { status: 400 })
  }

  // 어드민 화면은 마케팅 방문 데이터에서 제외한다.
  if (pagePath.startsWith('/admin')) {
    return new NextResponse(null, { status: 204 })
  }

  const userAgent = clean(req.headers.get('user-agent'), 800)
  const device = classifyUserAgent(userAgent)
  if (device.isBot) {
    return new NextResponse(null, { status: 204 })
  }

  const clientIp = getClientIp(req)
  const geo = readGeoHeaders(req)
  const admin = createAdminClient()

  const { error } = await admin.from('site_visits').insert({
    visitor_id: visitorId,
    session_id: sessionId,
    event_type: 'page_view',
    page_path: pagePath,
    page_url: clean(body.page_url, 1000),
    page_title: clean(body.page_title, 300),
    referrer: clean(body.referrer, 1000) ?? clean(req.headers.get('referer'), 1000),
    utm_source: clean(body.utm_source, 100),
    utm_medium: clean(body.utm_medium, 100),
    utm_campaign: clean(body.utm_campaign, 150),
    utm_term: clean(body.utm_term, 150),
    utm_content: clean(body.utm_content, 150),
    gclid: clean(body.gclid, 300),
    fbclid: clean(body.fbclid, 300),
    ip_address: clientIp,
    ip_hash: clientIp ? hashIp(clientIp) : null,
    country_code: geo.countryCode,
    country_name: geo.countryName,
    region: geo.region,
    city: geo.city,
    latitude: geo.latitude,
    longitude: geo.longitude,
    user_agent: userAgent,
    device_type: device.deviceType,
    browser_family: device.browserFamily,
    os_family: device.osFamily,
    language: clean(body.language, 80),
    timezone: clean(body.timezone, 80),
    screen_width: safeInt(body.screen_width),
    screen_height: safeInt(body.screen_height),
    viewport_width: safeInt(body.viewport_width),
    viewport_height: safeInt(body.viewport_height),
    color_scheme: clean(body.color_scheme, 30),
    is_bot: false,
    metadata: {
      source: 'first_party_tracker',
      host: req.headers.get('host') ?? null,
    },
  })

  if (error) {
    console.error('[site_visit_tracking] insert failed', error)
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

function clean(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, max)
}

function safeInt(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  const rounded = Math.round(value)
  if (rounded < 0 || rounded > 100000) return null
  return rounded
}

function getClientIp(req: NextRequest): string | null {
  const candidates = [
    req.headers.get('cf-connecting-ip'),
    req.headers.get('true-client-ip'),
    req.headers.get('x-real-ip'),
    req.headers.get('x-forwarded-for')?.split(',')[0],
  ]
  return clean(candidates.find(Boolean) ?? null, 120)
}

function hashIp(ip: string): string {
  const salt =
    process.env.SITE_VISIT_IP_HASH_SALT ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    'ozlabpay-site-visit'
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex')
}

function readGeoHeaders(req: NextRequest) {
  const countryCode = clean(
    req.headers.get('x-vercel-ip-country') ?? req.headers.get('cf-ipcountry'),
    10,
  )
  const region = clean(
    req.headers.get('x-vercel-ip-country-region') ?? req.headers.get('x-vercel-ip-region'),
    120,
  )
  const city = decodeHeader(req.headers.get('x-vercel-ip-city'))
  const latitude = numericHeader(req.headers.get('x-vercel-ip-latitude'))
  const longitude = numericHeader(req.headers.get('x-vercel-ip-longitude'))

  return {
    countryCode,
    countryName: countryCode ? countryName(countryCode) : null,
    region,
    city,
    latitude,
    longitude,
  }
}

function decodeHeader(value: string | null): string | null {
  const cleaned = clean(value, 160)
  if (!cleaned) return null
  try {
    return decodeURIComponent(cleaned)
  } catch {
    return cleaned
  }
}

function numericHeader(value: string | null): number | null {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function countryName(code: string): string {
  const upper = code.toUpperCase()
  const names: Record<string, string> = {
    KR: '대한민국',
    US: '미국',
    JP: '일본',
    CN: '중국',
    SG: '싱가포르',
    VN: '베트남',
  }
  return names[upper] ?? upper
}

function classifyUserAgent(userAgent: string | null): {
  isBot: boolean
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown'
  browserFamily: string
  osFamily: string
} {
  const ua = userAgent ?? ''
  const lower = ua.toLowerCase()
  const isBot =
    /bot|crawl|spider|slurp|facebookexternalhit|kakaotalk-scrap|naverbot|yeti|daumoa|bingpreview|lighthouse/.test(lower)

  if (isBot) {
    return { isBot: true, deviceType: 'bot', browserFamily: 'bot', osFamily: 'unknown' }
  }

  const deviceType =
    /ipad|tablet/.test(lower)
      ? 'tablet'
      : /mobile|iphone|android/.test(lower)
        ? 'mobile'
        : ua
          ? 'desktop'
          : 'unknown'

  const browserFamily =
    /edg\//i.test(ua) ? 'Edge' :
    /opr\//i.test(ua) || /opera/i.test(ua) ? 'Opera' :
    /chrome|crios/i.test(ua) ? 'Chrome' :
    /safari/i.test(ua) ? 'Safari' :
    /firefox|fxios/i.test(ua) ? 'Firefox' :
    'Unknown'

  const osFamily =
    /iphone|ipad|ios/i.test(ua) ? 'iOS' :
    /android/i.test(ua) ? 'Android' :
    /mac os|macintosh/i.test(ua) ? 'macOS' :
    /windows/i.test(ua) ? 'Windows' :
    /linux/i.test(ua) ? 'Linux' :
    'Unknown'

  return { isBot: false, deviceType, browserFamily, osFamily }
}
