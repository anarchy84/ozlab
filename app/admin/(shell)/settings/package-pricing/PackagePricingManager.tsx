// ─────────────────────────────────────────────
// 마케팅 패키지 견적 매니저 (클라이언트)
//
// - 미리보기 카드: 정상가/패키지가/절약/할인율 실시간 자동 계산
// - 패키지 설정: 월/연 패키지가, 뱃지, CTA, 안내문구, 정상가(수동)
// - 항목: 초기(1회성) / 월정기 2그룹. 추가/순서/단가/활성/삭제 인라인 편집
// - 낙관적 UI, 실패 시 롤백 + 에러 표시
// ─────────────────────────────────────────────
'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  computeDiscountPct,
  computeRegularTotal,
  computeSavings,
  formatNum,
  formatPct,
  formatWon,
  type PackageItemGroup,
  type PackagePricingData,
  type PackagePricingItem,
  type PackagePricingSettings,
} from '@/lib/marketing-package-pricing'

const API = '/api/admin/package-pricing'

export function PackagePricingManager({ initial }: { initial: PackagePricingData }) {
  const router = useRouter()
  const [items, setItems] = useState<PackagePricingItem[]>([...initial.initial, ...initial.monthly])
  const [settings, setSettings] = useState<PackagePricingSettings>(initial.settings)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const data: PackagePricingData = useMemo(() => {
    const sort = (a: PackagePricingItem, b: PackagePricingItem) => a.sort_order - b.sort_order
    return {
      initial: items.filter((i) => i.item_group === 'initial').sort(sort),
      monthly: items.filter((i) => i.item_group === 'monthly').sort(sort),
      settings,
    }
  }, [items, settings])

  const regular = computeRegularTotal(data)
  const savings = computeSavings(data)
  const discount = computeDiscountPct(data)

  // ── 항목 CRUD ──
  async function addItem(group: PackageItemGroup) {
    setError(null)
    const list = data[group]
    const nextOrder = list.length === 0 ? 10 : (list[list.length - 1].sort_order ?? 0) + 10
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          item_group: group,
          name: '새 항목',
          description: '',
          monthly_price: 0,
          yearly_price: group === 'monthly' ? 0 : null,
          sort_order: nextOrder,
          is_active: true,
        }),
      })
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? `HTTP ${res.status}`)
      const created = (await res.json()) as PackagePricingItem
      setItems((p) => [...p, created])
      startTransition(() => router.refresh())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  async function patchItem(id: string, patch: Partial<PackagePricingItem>) {
    setError(null)
    const prev = items
    setItems((curr) => curr.map((i) => (i.id === id ? { ...i, ...patch } : i)))
    try {
      const res = await fetch(`${API}/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? `HTTP ${res.status}`)
      const updated = (await res.json()) as PackagePricingItem
      setItems((curr) => curr.map((i) => (i.id === id ? updated : i)))
      startTransition(() => router.refresh())
    } catch (e) {
      setItems(prev)
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  async function deleteItem(id: string, name: string) {
    if (!confirm(`"${name}" 항목을 삭제할까요? 되돌릴 수 없습니다.`)) return
    setError(null)
    const prev = items
    setItems((curr) => curr.filter((i) => i.id !== id))
    try {
      const res = await fetch(`${API}/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? `HTTP ${res.status}`)
      startTransition(() => router.refresh())
    } catch (e) {
      setItems(prev)
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  // ── 설정 저장 ──
  const [savingSettings, setSavingSettings] = useState(false)
  async function saveSettings() {
    setError(null)
    setSavingSettings(true)
    try {
      const res = await fetch(API, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? `HTTP ${res.status}`)
      startTransition(() => router.refresh())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSavingSettings(false)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded border border-red-800/50 bg-red-900/20 p-3 text-sm text-red-300">{error}</div>
      )}

      {/* 미리보기 — 실시간 자동 계산 */}
      <section className="rounded-xl border border-brand-blue/30 bg-surface-darkSoft p-5">
        <h2 className="mb-3 text-sm font-semibold text-ink-100">랜딩 미리보기 (자동 계산)</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="정상가" value={formatWon(regular)} mono />
          <Stat label="패키지 (연)" value={formatWon(settings.package_yearly)} mono accent />
          <Stat label="패키지 (월)" value={formatWon(settings.package_monthly)} mono accent />
          <Stat label="할인율 · 절약" value={`${formatPct(discount)} · ${formatNum(savings)}`} mono />
        </div>
        <p className="mt-3 text-xs text-ink-500">
          정상가 = {settings.regular_total_override != null ? '수동 지정값' : '항목 합계(초기 1회성 + 월정기 연 환산)'} ·
          절약 = 정상가 − 패키지(연) · 할인율 = 절약 ÷ 정상가
        </p>
      </section>

      {/* 패키지 설정 */}
      <section className="rounded-xl border border-ink-700 bg-surface-darkSoft p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-100">패키지 설정</h2>
          <button
            type="button"
            onClick={saveSettings}
            disabled={savingSettings}
            className="rounded bg-brand-blue px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
          >
            {savingSettings ? '저장 중…' : '설정 저장'}
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumField
            label="월 패키지가 (원)"
            value={settings.package_monthly}
            onChange={(v) => setSettings((s) => ({ ...s, package_monthly: v ?? 0 }))}
          />
          <NumField
            label="연 패키지가 (원)"
            value={settings.package_yearly}
            onChange={(v) => setSettings((s) => ({ ...s, package_yearly: v ?? 0 }))}
          />
          <NumField
            label="정상가 (수동 · 비우면 자동계산)"
            value={settings.regular_total_override}
            nullable
            onChange={(v) => setSettings((s) => ({ ...s, regular_total_override: v }))}
          />
          <TextField
            label="뱃지 문구"
            value={settings.badge_label}
            onChange={(v) => setSettings((s) => ({ ...s, badge_label: v }))}
          />
          <TextField
            label="CTA 버튼 문구"
            value={settings.cta_label}
            onChange={(v) => setSettings((s) => ({ ...s, cta_label: v }))}
          />
          <TextField
            label="연 가격 안내문구"
            value={settings.yearly_note}
            onChange={(v) => setSettings((s) => ({ ...s, yearly_note: v }))}
          />
        </div>
      </section>

      {/* 항목 그룹 */}
      <GroupCard
        title="초기 인프라 세팅 · 1회성"
        group="initial"
        items={data.initial}
        onAdd={() => addItem('initial')}
        onPatch={patchItem}
        onDelete={deleteItem}
      />
      <GroupCard
        title="월 정기 관리"
        group="monthly"
        items={data.monthly}
        onAdd={() => addItem('monthly')}
        onPatch={patchItem}
        onDelete={deleteItem}
      />
    </div>
  )
}

function Stat({ label, value, mono, accent }: { label: string; value: string; mono?: boolean; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-ink-700 bg-ink-900/40 p-3">
      <p className="text-xs text-ink-500">{label}</p>
      <p className={`mt-1 text-sm font-extrabold ${accent ? 'text-brand-blue' : 'text-ink-100'} ${mono ? 'font-mono' : ''}`}>
        {value}
      </p>
    </div>
  )
}

function GroupCard({
  title,
  group,
  items,
  onAdd,
  onPatch,
  onDelete,
}: {
  title: string
  group: PackageItemGroup
  items: PackagePricingItem[]
  onAdd: () => void
  onPatch: (id: string, patch: Partial<PackagePricingItem>) => void
  onDelete: (id: string, name: string) => void
}) {
  return (
    <section className="rounded-xl border border-ink-700 bg-surface-darkSoft p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink-100">
          {title} <span className="ml-1 text-xs text-ink-500">({items.length}종)</span>
        </h2>
        <button
          type="button"
          onClick={onAdd}
          className="rounded bg-brand-blue px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
        >
          + 항목 추가
        </button>
      </div>

      {/* 헤더 */}
      <div className="hidden gap-2 px-2 pb-2 text-xs text-ink-500 sm:flex">
        <span className="w-12">순서</span>
        <span className="flex-1">이름 / 설명</span>
        <span className="w-28 text-right">월 단가</span>
        {group === 'monthly' && <span className="w-28 text-right">연 단가</span>}
        <span className="w-12 text-center">활성</span>
        <span className="w-10" />
      </div>

      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="py-3 text-xs italic text-ink-500">항목이 없습니다. + 항목 추가로 등록하세요.</p>
        ) : (
          items.map((it) => (
            <ItemRow key={it.id} item={it} onPatch={(p) => onPatch(it.id, p)} onDelete={() => onDelete(it.id, it.name)} />
          ))
        )}
      </div>
    </section>
  )
}

function ItemRow({
  item,
  onPatch,
  onDelete,
}: {
  item: PackagePricingItem
  onPatch: (patch: Partial<PackagePricingItem>) => void
  onDelete: () => void
}) {
  const inputCls =
    'bg-ink-900 border border-ink-700 text-ink-100 rounded px-2 py-1 text-sm focus:outline-none focus:border-brand-blue'
  return (
    <div
      className={`flex flex-col gap-2 rounded border border-ink-700/60 p-2 sm:flex-row sm:items-start sm:border-0 sm:p-0 ${
        item.is_active ? '' : 'opacity-55'
      }`}
    >
      <input
        type="number"
        defaultValue={item.sort_order}
        onBlur={(e) => {
          const v = parseInt(e.target.value, 10)
          if (!Number.isNaN(v) && v !== item.sort_order) onPatch({ sort_order: v })
        }}
        className={`${inputCls} w-full sm:w-12`}
        title="순서"
      />
      <div className="flex flex-1 flex-col gap-1">
        <input
          type="text"
          defaultValue={item.name}
          onBlur={(e) => {
            const v = e.target.value.trim()
            if (v && v !== item.name) onPatch({ name: v })
            else if (!v) e.target.value = item.name
          }}
          placeholder="항목 이름"
          className={`${inputCls} w-full font-medium`}
        />
        <input
          type="text"
          defaultValue={item.description ?? ''}
          onBlur={(e) => {
            const v = e.target.value.trim()
            if (v !== (item.description ?? '')) onPatch({ description: v })
          }}
          placeholder="설명 (선택)"
          className={`${inputCls} w-full text-xs text-ink-400`}
        />
      </div>
      <PriceInput
        defaultValue={item.monthly_price}
        onCommit={(v) => v !== item.monthly_price && onPatch({ monthly_price: v })}
        className={`${inputCls} w-full text-right sm:w-28`}
      />
      {item.item_group === 'monthly' && (
        <PriceInput
          defaultValue={item.yearly_price ?? 0}
          onCommit={(v) => v !== (item.yearly_price ?? 0) && onPatch({ yearly_price: v })}
          className={`${inputCls} w-full text-right sm:w-28`}
        />
      )}
      <label className="flex w-full items-center justify-center gap-1 text-xs text-ink-500 sm:w-12">
        <input
          type="checkbox"
          checked={item.is_active}
          onChange={(e) => onPatch({ is_active: e.target.checked })}
          className="h-4 w-4 cursor-pointer"
        />
        <span className="sm:hidden">활성</span>
      </label>
      <button
        type="button"
        onClick={onDelete}
        className="w-full px-1 text-xs text-red-400 hover:text-red-300 sm:w-10"
        title="삭제"
      >
        삭제
      </button>
    </div>
  )
}

// 숫자 입력 — 콤마 표시, 커밋 시 정수 반환
function PriceInput({
  defaultValue,
  onCommit,
  className,
}: {
  defaultValue: number
  onCommit: (v: number) => void
  className?: string
}) {
  const [text, setText] = useState(defaultValue.toLocaleString('ko-KR'))
  return (
    <input
      type="text"
      inputMode="numeric"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onFocus={(e) => {
        setText(String(parseInt(e.target.value.replace(/[^\d]/g, ''), 10) || 0))
        requestAnimationFrame(() => e.target.select())
      }}
      onBlur={(e) => {
        const v = parseInt(e.target.value.replace(/[^\d]/g, ''), 10) || 0
        setText(v.toLocaleString('ko-KR'))
        onCommit(v)
      }}
      className={className}
    />
  )
}

function NumField({
  label,
  value,
  onChange,
  nullable,
}: {
  label: string
  value: number | null
  onChange: (v: number | null) => void
  nullable?: boolean
}) {
  const [text, setText] = useState(value == null ? '' : value.toLocaleString('ko-KR'))
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-ink-500">{label}</span>
      <input
        type="text"
        inputMode="numeric"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => {
          const digits = e.target.value.replace(/[^\d]/g, '')
          if (nullable && digits === '') {
            setText('')
            onChange(null)
            return
          }
          const v = parseInt(digits, 10) || 0
          setText(v.toLocaleString('ko-KR'))
          onChange(v)
        }}
        placeholder={nullable ? '자동 계산' : '0'}
        className="w-full rounded border border-ink-700 bg-ink-900 px-2 py-1.5 text-sm text-ink-100 focus:border-brand-blue focus:outline-none"
      />
    </label>
  )
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-ink-500">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-ink-700 bg-ink-900 px-2 py-1.5 text-sm text-ink-100 focus:border-brand-blue focus:outline-none"
      />
    </label>
  )
}
