// ─────────────────────────────────────────────
// /rss.xml — /rss 로 308 permanent redirect
// (일부 RSS 리더가 .xml 확장자 자동 시도하기 때문)
// ─────────────────────────────────────────────
import { NextResponse } from 'next/server'
import { SITE_URL } from '@/lib/seo'

export const dynamic = 'force-static'

export function GET() {
  return NextResponse.redirect(`${SITE_URL}/rss`, 308)
}
