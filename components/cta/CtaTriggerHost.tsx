'use client'

// ─────────────────────────────────────────────
// CtaTriggerHost — cta_type 별 자동 노출 컨트롤러
//
// 처리 :
//   - floating_button : 트리거 만족 시 우하단 둥근 버튼 노출 → 클릭 시 모달
//   - sticky_bar      : 트리거 만족 시 상/하단 띠 노출 (CTA 클릭 시 모달)
//   - toast           : 트리거 만족 시 우하단 슬라이드인 카드
//   - modal_form      : 트리거 만족 시 모달 즉시 노출 (단, 즉시면 가장자리 disturbing — 보통 클릭 트리거)
//   - inline_*        : 무시 (DynamicCTA 가 처리)
//
// 트리거 :
//   - immediate    : 마운트 즉시
//   - scroll_pct   : 스크롤 N% 도달 시
//   - time_sec     : 페이지 진입 후 N 초 후
//   - exit_intent  : 마우스가 화면 위쪽 벗어날 때 (데스크톱)
//
// dismissal :
//   - 사용자가 × 누르면 sessionStorage 에 저장 → 같은 세션 재노출 X
// ─────────────────────────────────────────────

import { useEffect, useState } from 'react'
import type { CtaButton } from '@/lib/admin/types'
import { CtaModalForm } from './CtaModalForm'

const DISMISS_KEY = 'oz_cta_dismissed_v1'

function getDismissed(): Set<number> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.sessionStorage.getItem(DISMISS_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as number[]
    return new Set(arr)
  } catch {
    return new Set()
  }
}
function markDismissed(id: number) {
  if (typeof window === 'undefined') return
  const cur = getDismissed()
  cur.add(id)
  window.sessionStorage.setItem(DISMISS_KEY, JSON.stringify([...cur]))
}

interface Props {
  /** 페이지 로드 시 서버에서 받은 모든 활성 CTA */
  ctas: CtaButton[]
  /** 현재 페이지 경로 — page_paths 매칭에 사용 */
  pathname: string
}

/**
 * 페이지 어디서든 한 번 마운트되어 자동 트리거 CTA 들 관리.
 * placement 무시, cta_type 기준으로 띄움.
 */
export function CtaTriggerHost({ ctas, pathname }: Props) {
  // 자동 노출 대상 (inline_anchor / inline_form 제외)
  const candidates = ctas.filter((c) => {
    if (!c.is_active) return false
    if (c.cta_type === 'inline_anchor' || c.cta_type === 'inline_form') return false
    if (!matchPath(c.page_paths, pathname)) return false
    return true
  })

  if (candidates.length === 0) return null

  return (
    <>
      {candidates.map((c) => (
        <SingleTriggeredCta key={c.id} cta={c} />
      ))}
    </>
  )
}

// ─── 경로 매칭 (와일드카드 *) ──
function matchPath(patterns: string[] | null, pathname: string): boolean {
  if (!patterns || patterns.length === 0) return true
  return patterns.some((p) => {
    if (p === pathname) return true
    if (p.endsWith('/*')) {
      const prefix = p.slice(0, -2)
      return pathname === prefix || pathname.startsWith(prefix + '/')
    }
    return false
  })
}

// ─────────────────────────────────────────────
// SingleTriggeredCta — 하나의 CTA 트리거 + 노출
// ─────────────────────────────────────────────
function SingleTriggeredCta({ cta }: { cta: CtaButton }) {
  const [visible, setVisible] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  // 마운트 시 dismissed 체크
  useEffect(() => {
    setDismissed(getDismissed().has(cta.id))
  }, [cta.id])

  // 트리거 등록
  useEffect(() => {
    if (dismissed) return
    const tc = cta.trigger_config ?? { type: 'immediate' }

    if (tc.type === 'immediate') {
      setVisible(true)
      return
    }
    if (tc.type === 'time_sec') {
      const t = setTimeout(() => setVisible(true), (tc.value ?? 30) * 1000)
      return () => clearTimeout(t)
    }
    if (tc.type === 'scroll_pct') {
      const targetPct = tc.value ?? 50
      const onScroll = () => {
        const h = document.documentElement
        const scrolled = h.scrollTop
        const max = h.scrollHeight - h.clientHeight
        if (max > 0 && (scrolled / max) * 100 >= targetPct) {
          setVisible(true)
          window.removeEventListener('scroll', onScroll)
        }
      }
      window.addEventListener('scroll', onScroll, { passive: true })
      onScroll()
      return () => window.removeEventListener('scroll', onScroll)
    }
    if (tc.type === 'exit_intent') {
      const onMove = (e: MouseEvent) => {
        if (e.clientY < 10) {
          setVisible(true)
          document.removeEventListener('mousemove', onMove)
        }
      }
      document.addEventListener('mousemove', onMove)
      return () => document.removeEventListener('mousemove', onMove)
    }
  }, [cta.id, cta.trigger_config, dismissed])

  function dismiss() {
    setVisible(false)
    setDismissed(true)
    markDismissed(cta.id)
  }

  if (dismissed || !visible) return null

  // ─── 타입별 렌더 ──

  // 모달 폼 (즉시 모달 표시)
  if (cta.cta_type === 'modal_form') {
    return <CtaModalForm cta={cta} onClose={dismiss} />
  }

  // 플로팅 둥근 버튼 → 클릭 시 모달
  if (cta.cta_type === 'floating_button') {
    const dc = cta.display_config ?? {}
    const pos = positionStyle(dc.position ?? 'bottom-right')
    return (
      <>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="fixed z-50 px-5 py-3 rounded-full shadow-2xl text-sm font-bold text-black hover:scale-105 transition-transform"
          style={{ background: dc.button_color ?? '#17e06d', ...pos }}
        >
          {cta.label || '무료 상담'}
        </button>
        {(dc.show_close ?? true) && (
          <button
            type="button"
            onClick={dismiss}
            className="fixed z-50 w-6 h-6 rounded-full bg-black/60 text-white text-xs leading-none hover:bg-black/80"
            style={{
              ...pos,
              right: pos.right !== undefined ? `calc(${pos.right} - 8px)` : undefined,
              left: pos.left !== undefined ? `calc(${pos.left} - 8px)` : undefined,
              top: pos.top !== undefined ? `calc(${pos.top} - 8px)` : undefined,
              bottom: pos.bottom !== undefined ? `calc(${pos.bottom} + 44px)` : undefined,
            }}
            aria-label="닫기"
          >
            ×
          </button>
        )}
        {modalOpen && <CtaModalForm cta={cta} onClose={() => setModalOpen(false)} />}
      </>
    )
  }

  // Sticky bar (상/하단 띠)
  if (cta.cta_type === 'sticky_bar') {
    const dc = cta.display_config ?? {}
    const onTop = dc.position === 'top'
    return (
      <>
        <div
          className={`fixed left-0 right-0 z-50 px-4 py-3 flex items-center justify-center gap-3 text-sm shadow-lg ${
            onTop ? 'top-0' : 'bottom-0'
          }`}
          style={{ background: dc.bg_color ?? '#0f1115', color: '#fff' }}
        >
          {dc.title && <strong className="text-white">{dc.title}</strong>}
          {dc.description && <span className="text-white/80 hidden sm:inline">{dc.description}</span>}
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="px-4 py-1.5 rounded font-bold text-black text-xs"
            style={{ background: dc.button_color ?? '#17e06d' }}
          >
            {cta.label || '무료 상담'}
          </button>
          {(dc.show_close ?? true) && (
            <button
              type="button"
              onClick={dismiss}
              className="ml-2 text-white/60 hover:text-white text-lg leading-none"
              aria-label="닫기"
            >
              ×
            </button>
          )}
        </div>
        {modalOpen && <CtaModalForm cta={cta} onClose={() => setModalOpen(false)} />}
      </>
    )
  }

  // Toast (우하단 슬라이드인 카드)
  if (cta.cta_type === 'toast') {
    const dc = cta.display_config ?? {}
    const pos = positionStyle(dc.position ?? 'bottom-right')
    return (
      <>
        <div
          className="fixed z-50 max-w-xs p-4 rounded-lg shadow-2xl border border-white/10 text-sm"
          style={{ background: dc.bg_color ?? '#0f1115', color: '#fff', ...pos }}
        >
          {(dc.show_close ?? true) && (
            <button
              type="button"
              onClick={dismiss}
              className="absolute top-2 right-2 text-white/60 hover:text-white text-lg leading-none"
              aria-label="닫기"
            >
              ×
            </button>
          )}
          {dc.title && <h4 className="font-bold pr-4">{dc.title}</h4>}
          {dc.description && <p className="text-xs text-white/80 mt-1">{dc.description}</p>}
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="mt-3 w-full py-2 rounded text-xs font-bold text-black"
            style={{ background: dc.button_color ?? '#17e06d' }}
          >
            {cta.label || '무료 상담'}
          </button>
        </div>
        {modalOpen && <CtaModalForm cta={cta} onClose={() => setModalOpen(false)} />}
      </>
    )
  }

  return null
}

// ─── 위치 헬퍼 ──
function positionStyle(position: string): React.CSSProperties {
  switch (position) {
    case 'bottom-right': return { right: '20px', bottom: '20px' }
    case 'bottom-left': return { left: '20px', bottom: '20px' }
    case 'top-right': return { right: '20px', top: '20px' }
    case 'top-left': return { left: '20px', top: '20px' }
    case 'center': return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
    case 'top': return { top: '0', left: '0', right: '0' }
    case 'bottom': return { bottom: '0', left: '0', right: '0' }
    default: return { right: '20px', bottom: '20px' }
  }
}
