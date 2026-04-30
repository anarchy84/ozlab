'use client'

// ─────────────────────────────────────────────
// 어드민 우하단 floating 도움말 버튼
//   - 모든 어드민 페이지에 노출 (layout 끝에 1개)
//   - 클릭 → 작은 메뉴 (운영 가이드 / UTM 표준 / 닫기)
//   - 직원이 헷갈릴 때 즉시 접근
// ─────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

export function HelpFloatingButton() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="fixed bottom-6 right-6 z-40">
      {open && (
        <div className="absolute bottom-16 right-0 mb-2 min-w-[260px] bg-ink-900 border border-ink-700 rounded-lg shadow-2xl py-1.5">
          <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-ink-500 font-bold">
            도움말
          </div>
          <Link
            href="/admin/help"
            target="_blank"
            onClick={() => setOpen(false)}
            className="block px-3 py-2.5 text-sm text-ink-100 hover:bg-ink-800 hover:text-naver-neon transition-colors"
          >
            <div className="font-medium">📘 운영 가이드</div>
            <div className="text-[11px] text-ink-500 mt-0.5">
              어드민 전체 사용법 — 5분 안에 훑기
            </div>
          </Link>
          <Link
            href="/admin/help/utm"
            target="_blank"
            onClick={() => setOpen(false)}
            className="block px-3 py-2.5 text-sm text-ink-100 hover:bg-ink-800 hover:text-naver-neon transition-colors"
          >
            <div className="font-medium">🎯 UTM 표준 가이드</div>
            <div className="text-[11px] text-ink-500 mt-0.5">
              매체별 utm 파라미터 표준 (광고대행사 핸드오프용)
            </div>
          </Link>
          <div className="border-t border-ink-700 mt-1.5 pt-1.5 px-3 pb-2">
            <p className="text-[11px] text-ink-500">
              막힌 부분 있으면 슈퍼어드민에게 문의하세요.
            </p>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-2xl font-bold transition-all ${
          open
            ? 'bg-naver-dark text-white scale-95'
            : 'bg-naver-green text-white hover:bg-naver-dark hover:scale-105'
        }`}
        title="도움말"
        aria-label="도움말"
      >
        {open ? '×' : '?'}
      </button>
    </div>
  )
}
