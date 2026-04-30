'use client'

// ─────────────────────────────────────────────
// 어드민 GNB 설정 드롭다운
//   - 자주 쓰지 않는 설정 메뉴들을 한 묶음으로
//   - 클릭 외부 영역 / Esc 로 닫힘
// ─────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

interface MenuItem {
  href: string
  label: string
  desc?: string
}

interface Props {
  items: MenuItem[]
}

export function SettingsDropdown({ items }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`text-sm transition-colors flex items-center gap-1 ${
          open ? 'text-naver-neon' : 'text-ink-300 hover:text-ink-100'
        }`}
      >
        설정 <span className="text-[9px]">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute top-full mt-2 right-0 min-w-[260px] bg-ink-900 border border-ink-700 rounded-lg shadow-xl z-50 py-1.5"
        >
          {items.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm text-ink-200 hover:bg-ink-800 hover:text-naver-neon transition-colors"
            >
              <div className="font-medium">{m.label}</div>
              {m.desc && (
                <div className="text-[11px] text-ink-500 mt-0.5">{m.desc}</div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
