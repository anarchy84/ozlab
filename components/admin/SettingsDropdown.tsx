'use client'

// ─────────────────────────────────────────────
// 어드민 GNB 설정 드롭다운
//   - 자주 쓰지 않는 설정 메뉴들을 한 묶음으로
//   - 클릭 외부 영역 / Esc 로 닫힘
// ─────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'

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
  const pathname = usePathname()
  const active = items.some((item) => isActive(pathname, item.href))

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
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-colors',
          active || open
            ? 'bg-brand-blue/15 text-brand-neon font-bold'
            : 'text-ink-300 hover:bg-ink-800 hover:text-ink-100',
        )}
      >
        설정 <span className="text-[9px]">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute top-full mt-2 right-0 min-w-[260px] bg-ink-900 border border-ink-700 rounded-lg shadow-xl z-50 py-1.5"
        >
          {items.map((m) => {
            const itemActive = isActive(pathname, m.href)
            return (
              <Link
                key={m.href}
                href={m.href}
                role="menuitem"
                aria-current={itemActive ? 'page' : undefined}
                onClick={() => setOpen(false)}
                className={cn(
                  'block px-3 py-2 text-sm transition-colors',
                  itemActive
                    ? 'bg-brand-blue/10 text-brand-neon'
                    : 'text-ink-200 hover:bg-ink-800 hover:text-brand-neon',
                )}
              >
                <div className="font-medium">{m.label}</div>
                {m.desc && (
                  <div className="text-[11px] text-ink-500 mt-0.5">{m.desc}</div>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}
