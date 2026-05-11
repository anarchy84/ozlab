'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'

interface AdminTopNavItem {
  href: string
  label: string
}

export function AdminTopNav({ items }: { items: AdminTopNavItem[] }) {
  const pathname = usePathname()

  return (
    <nav className="flex min-w-0 items-center gap-2 overflow-x-auto text-sm whitespace-nowrap">
      {items.map((item) => {
        const active = isActive(pathname, item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'shrink-0 rounded-full px-3 py-1.5 transition-colors',
              active
                ? 'bg-naver-green/15 text-naver-neon font-bold'
                : 'text-ink-300 hover:bg-ink-800 hover:text-ink-100',
            )}
          >
            {item.label}
          </Link>
        )
      })}
      <Link
        href="/"
        target="_blank"
        className="shrink-0 rounded-full px-3 py-1.5 text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-100"
      >
        사이트 ↗
      </Link>
    </nav>
  )
}

function isActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin'
  return pathname === href || pathname.startsWith(`${href}/`)
}
