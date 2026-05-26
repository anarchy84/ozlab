'use client'

import { useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminGuard } from '@/hooks/useAdminGuard'
import MediaSlot from '@/components/ui/MediaSlot'
import { cn } from '@/lib/utils/cn'
import type { ImageValue } from '@/lib/content-blocks'

type VisualMode = 'default' | 'image' | 'hidden'

interface EditableVisualSlotProps {
  modeKey: string
  modeValue?: string
  imageKey: string
  imageValue?: ImageValue
  pagePath: string
  label: string
  imageLabel: string
  imageHint?: string
  aspect: string
  children: ReactNode
  className?: string
  defaultClassName?: string
  imageClassName?: string
  imageFit?: 'cover' | 'contain'
  imageTheme?: 'light' | 'dark'
}

function normalizeMode(value?: string): VisualMode {
  if (value === 'image' || value === 'hidden') return value
  return 'default'
}

export function EditableVisualSlot({
  modeKey,
  modeValue,
  imageKey,
  imageValue,
  pagePath,
  label,
  imageLabel,
  imageHint,
  aspect,
  children,
  className,
  defaultClassName,
  imageClassName,
  imageFit = 'contain',
  imageTheme = 'light',
}: EditableVisualSlotProps) {
  const router = useRouter()
  const { isAdmin } = useAdminGuard()
  const [saving, setSaving] = useState(false)
  const mode = normalizeMode(modeValue)

  async function setMode(nextMode: VisualMode) {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/content-blocks', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          block_key: modeKey,
          block_type: 'text',
          value: { text: nextMode },
          semantic_tag: 'data',
          page_path: pagePath,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error ?? '요소 상태 저장에 실패했습니다.')
      }
      router.refresh()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : '요소 상태 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (mode === 'hidden') {
    if (!isAdmin) return null
    return (
      <div className={cn('rounded-lg border border-dashed border-red-200 bg-red-50 p-4', className)}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-extrabold text-red-700">{label} 삭제/숨김 처리됨</p>
            <p className="mt-1 text-xs text-red-600/80">
              일반 방문자에게는 보이지 않습니다. 기본 요소나 이미지 요소로 다시 복구할 수 있습니다.
            </p>
          </div>
          <VisualControls mode={mode} saving={saving} onChange={setMode} />
        </div>
      </div>
    )
  }

  return (
    <div className={cn('group/visual-slot relative', className)}>
      {isAdmin && (
        <div className="absolute right-2 top-2 z-30 opacity-0 transition-opacity group-hover/visual-slot:opacity-100 group-focus-within/visual-slot:opacity-100">
          <VisualControls mode={mode} saving={saving} onChange={setMode} />
        </div>
      )}

      {mode === 'image' ? (
        <MediaSlot
          blockKey={imageKey}
          value={imageValue}
          aspect={aspect}
          label={imageLabel}
          hint={imageHint}
          pagePath={pagePath}
          fit={imageFit}
          theme={imageTheme}
          className={cn('rounded-xl bg-brand-tint/40', imageClassName)}
        />
      ) : (
        <div className={defaultClassName}>{children}</div>
      )}
    </div>
  )
}

function VisualControls({
  mode,
  saving,
  onChange,
}: {
  mode: VisualMode
  saving: boolean
  onChange: (mode: VisualMode) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-lg border border-ink-150 bg-white/95 p-1 shadow-brand backdrop-blur">
      <ModeButton active={mode === 'default'} disabled={saving} onClick={() => onChange('default')}>
        기본
      </ModeButton>
      <ModeButton active={mode === 'image'} disabled={saving} onClick={() => onChange('image')}>
        이미지
      </ModeButton>
      <ModeButton danger active={mode === 'hidden'} disabled={saving} onClick={() => onChange('hidden')}>
        삭제
      </ModeButton>
    </div>
  )
}

function ModeButton({
  active,
  danger = false,
  disabled,
  onClick,
  children,
}: {
  active: boolean
  danger?: boolean
  disabled: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'rounded-md px-2.5 py-1.5 text-xs font-extrabold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        danger
          ? active
            ? 'bg-red-600 text-white'
            : 'text-red-600 hover:bg-red-50'
          : active
            ? 'bg-brand-blue text-white'
            : 'text-ink-700 hover:bg-brand-soft hover:text-brand-deep',
      )}
    >
      {children}
    </button>
  )
}
