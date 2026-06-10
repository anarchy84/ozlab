'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const VISITOR_KEY = 'ozlab_visitor_id'
const SESSION_KEY = 'ozlab_visit_session_id'
const SESSION_ATTR_KEY = 'ozlab_visit_session_attribution'
const TRACKED_URLS_KEY = 'ozlab_tracked_pageviews'

interface VisitAttribution {
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_term: string | null
  utm_content: string | null
  gclid: string | null
  fbclid: string | null
  referrer: string | null
}

export function SiteVisitTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!pathname || pathname.startsWith('/admin')) return

    const visitorId = getOrCreateStorageId(window.localStorage, VISITOR_KEY)
    const sessionId = getOrCreateStorageId(window.sessionStorage, SESSION_KEY)
    if (!visitorId || !sessionId) return

    const pageUrl = `${window.location.origin}${pathname}${window.location.search}`
    if (wasTrackedThisSession(pageUrl)) return

    const attribution = getOrCreateSessionAttribution()
    const payload = {
      visitor_id: visitorId,
      session_id: sessionId,
      page_path: pathname,
      page_url: pageUrl,
      page_title: document.title,
      referrer: attribution.referrer,
      utm_source: attribution.utm_source,
      utm_medium: attribution.utm_medium,
      utm_campaign: attribution.utm_campaign,
      utm_term: attribution.utm_term,
      utm_content: attribution.utm_content,
      gclid: attribution.gclid,
      fbclid: attribution.fbclid,
      language: navigator.language || null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
      screen_width: window.screen?.width ?? null,
      screen_height: window.screen?.height ?? null,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      color_scheme: window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    }

    window
      .fetch('/api/track/visit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      })
      .then((res) => {
        if (res.ok || res.status === 204) markTrackedThisSession(pageUrl)
      })
      .catch(() => {
        // 방문 추적 실패가 사용자 경험을 막으면 안 된다.
      })
  }, [pathname])

  return null
}

function getOrCreateStorageId(storage: Storage, key: string): string | null {
  try {
    const existing = storage.getItem(key)
    if (existing) return existing
    const next =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `oz_${Date.now()}_${Math.random().toString(36).slice(2)}`
    storage.setItem(key, next)
    return next
  } catch {
    return null
  }
}

function getOrCreateSessionAttribution(): VisitAttribution {
  const current = readAttributionFromUrl()
  const hasCurrentCampaign = Boolean(
    current.utm_source ||
      current.utm_medium ||
      current.utm_campaign ||
      current.gclid ||
      current.fbclid,
  )

  try {
    const raw = window.sessionStorage.getItem(SESSION_ATTR_KEY)
    if (raw && !hasCurrentCampaign) return JSON.parse(raw) as VisitAttribution

    const next = {
      ...current,
      referrer: document.referrer || current.referrer || null,
    }
    window.sessionStorage.setItem(SESSION_ATTR_KEY, JSON.stringify(next))
    return next
  } catch {
    return current
  }
}

function readAttributionFromUrl(): VisitAttribution {
  const sp = new URLSearchParams(window.location.search)
  return {
    utm_source: sp.get('utm_source'),
    utm_medium: sp.get('utm_medium'),
    utm_campaign: sp.get('utm_campaign'),
    utm_term: sp.get('utm_term'),
    utm_content: sp.get('utm_content'),
    gclid: sp.get('gclid'),
    fbclid: sp.get('fbclid'),
    referrer: document.referrer || null,
  }
}

function wasTrackedThisSession(pageUrl: string): boolean {
  try {
    const raw = window.sessionStorage.getItem(TRACKED_URLS_KEY)
    const urls = raw ? (JSON.parse(raw) as string[]) : []
    return urls.includes(pageUrl)
  } catch {
    return false
  }
}

function markTrackedThisSession(pageUrl: string): void {
  try {
    const raw = window.sessionStorage.getItem(TRACKED_URLS_KEY)
    const urls = raw ? (JSON.parse(raw) as string[]) : []
    if (urls.includes(pageUrl)) return
    window.sessionStorage.setItem(TRACKED_URLS_KEY, JSON.stringify([...urls.slice(-30), pageUrl]))
  } catch {
    // ignore
  }
}
