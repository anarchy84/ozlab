'use client'

// ─────────────────────────────────────────────
// 상품·카테고리 통합 관리
//   - 좌측: 카테고리 (탭/리스트, 추가·수정·삭제)
//   - 우측: 선택 카테고리의 상품 목록 + 추가·수정·비활성화
// ─────────────────────────────────────────────

import { useEffect, useState, useCallback } from 'react'
import type { AdminRole } from '@/lib/admin/types'

interface Category {
  id: string
  code: string
  label: string
  sort_order: number
  is_active: boolean
  note: string | null
}

interface Product {
  id: string
  code: string
  label: string
  category: string
  default_amount: number | null
  default_period: string | null
  is_subscription: boolean
  default_monthly: number | null
  sort_order: number
  is_active: boolean
  note: string | null
}

const PERIOD_OPTIONS = ['없음', '12개월', '24개월', '36개월', '48개월']

export default function ProductsManager({ myRole: _myRole }: { myRole: AdminRole }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCatCode, setActiveCatCode] = useState<string>('')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [cRes, pRes] = await Promise.all([
      fetch('/api/admin/product-categories', { cache: 'no-store' }),
      fetch('/api/admin/products', { cache: 'no-store' }),
    ])
    if (cRes.ok) {
      const cs = (await cRes.json()) as Category[]
      setCategories(cs)
      if (!activeCatCode && cs.length > 0) setActiveCatCode(cs[0].code)
    }
    if (pRes.ok) setProducts(await pRes.json())
    setLoading(false)
  }, [activeCatCode])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const filteredProducts = activeCatCode
    ? products.filter((p) => p.category === activeCatCode)
    : products

  if (loading) {
    return <div className="text-center py-12 text-ink-500">로딩 중...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink-100">상품·카테고리 관리</h1>
          <p className="text-sm text-ink-400 mt-1">
            카테고리(좌)와 상품(우)을 함께 관리합니다. 상품은 매출 등록 모달의 드롭다운으로 노출됩니다.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-[260px_1fr] gap-6">
        {/* 카테고리 사이드 */}
        <CategorySide
          categories={categories}
          activeCode={activeCatCode}
          onSelect={setActiveCatCode}
          onChanged={fetchAll}
        />

        {/* 상품 본문 */}
        <ProductPanel
          categories={categories}
          activeCatCode={activeCatCode}
          products={filteredProducts}
          onChanged={fetchAll}
        />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 카테고리 사이드바
// ─────────────────────────────────────────────
function CategorySide({
  categories,
  activeCode,
  onSelect,
  onChanged,
}: {
  categories: Category[]
  activeCode: string
  onSelect: (code: string) => void
  onChanged: () => void
}) {
  const [editing, setEditing] = useState<Category | 'new' | null>(null)

  const handleDelete = async (cat: Category) => {
    if (!confirm(`"${cat.label}" 카테고리를 삭제할까요?`)) return
    const res = await fetch(`/api/admin/product-categories/${cat.id}`, {
      method: 'DELETE',
    })
    if (res.ok) onChanged()
    else {
      const err = await res.json()
      alert(err.error ?? '삭제 실패')
    }
  }

  return (
    <aside className="bg-surface-darkSoft border border-ink-700 rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-ink-200">카테고리</h3>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="text-xs text-naver-neon hover:underline"
        >
          + 추가
        </button>
      </div>

      {categories.length === 0 ? (
        <p className="text-xs text-ink-500 italic">카테고리 없음. 추가해 주세요.</p>
      ) : (
        <ul className="space-y-1">
          {categories.map((c) => (
            <li
              key={c.id}
              className={`group flex items-center justify-between px-2 py-1.5 rounded text-sm cursor-pointer transition-colors ${
                activeCode === c.code
                  ? 'bg-naver-green/20 text-naver-neon'
                  : 'text-ink-300 hover:bg-ink-800'
              }`}
              onClick={() => onSelect(c.code)}
            >
              <span className="flex items-center gap-2">
                {!c.is_active && <span title="비활성">⏸</span>}
                {c.label}
              </span>
              <span className="hidden group-hover:flex gap-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditing(c)
                  }}
                  className="text-ink-400 hover:text-ink-100 text-[11px]"
                >
                  편집
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(c)
                  }}
                  className="text-red-400 hover:text-red-300 text-[11px]"
                >
                  삭제
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <CategoryEditor
          category={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            onChanged()
          }}
        />
      )}
    </aside>
  )
}

function CategoryEditor({
  category,
  onClose,
  onSaved,
}: {
  category: Category | null
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!category
  const [code, setCode] = useState(category?.code ?? '')
  const [label, setLabel] = useState(category?.label ?? '')
  const [sortOrder, setSortOrder] = useState(category?.sort_order ?? 0)
  const [isActive, setIsActive] = useState(category?.is_active ?? true)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!label.trim()) {
      alert('라벨을 입력하세요')
      return
    }
    setSaving(true)
    const url = isEdit
      ? `/api/admin/product-categories/${category!.id}`
      : '/api/admin/product-categories'
    const method = isEdit ? 'PATCH' : 'POST'
    const body = isEdit
      ? { label, sort_order: sortOrder, is_active: isActive }
      : { code: code.trim(), label, sort_order: sortOrder, is_active: isActive }

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) onSaved()
    else {
      const err = await res.json()
      alert(err.error ?? '저장 실패')
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-surface-dark border border-ink-700 rounded-lg p-5 w-full max-w-md space-y-3">
        <h3 className="text-base font-bold text-ink-100">
          {isEdit ? '카테고리 수정' : '카테고리 추가'}
        </h3>
        {!isEdit && (
          <div>
            <label className="block text-xs text-ink-400 mb-1">코드 (영문, 변경 불가)</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="pos / internet / cctv …"
              className="w-full px-3 py-2 bg-ink-900 border border-ink-700 text-ink-100 rounded text-sm focus:outline-none focus:ring-2 focus:ring-naver-green"
            />
          </div>
        )}
        <div>
          <label className="block text-xs text-ink-400 mb-1">표시 라벨</label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Pos (카드단말기)"
            className="w-full px-3 py-2 bg-ink-900 border border-ink-700 text-ink-100 rounded text-sm focus:outline-none focus:ring-2 focus:ring-naver-green"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-ink-400 mb-1">정렬</label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              className="w-full px-3 py-2 bg-ink-900 border border-ink-700 text-ink-100 rounded text-sm"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-ink-200">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 accent-naver-green"
              />
              활성
            </label>
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-ink-700 text-ink-200 rounded text-sm hover:bg-ink-600"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 bg-naver-green text-white rounded text-sm font-bold hover:bg-naver-dark disabled:opacity-50"
          >
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 상품 본문 패널
// ─────────────────────────────────────────────
function ProductPanel({
  categories,
  activeCatCode,
  products,
  onChanged,
}: {
  categories: Category[]
  activeCatCode: string
  products: Product[]
  onChanged: () => void
}) {
  const [editing, setEditing] = useState<Product | 'new' | null>(null)

  const handleDelete = async (p: Product) => {
    if (!confirm(`"${p.label}" 상품을 삭제할까요?`)) return
    const res = await fetch(`/api/admin/products/${p.id}`, { method: 'DELETE' })
    if (res.ok) onChanged()
    else {
      const err = await res.json()
      alert(err.error ?? '삭제 실패')
    }
  }

  const activeCat = categories.find((c) => c.code === activeCatCode)

  return (
    <section className="bg-surface-darkSoft border border-ink-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-ink-100">
          {activeCat?.label ?? '카테고리 선택'} ·{' '}
          <span className="text-ink-400 text-xs">상품 {products.length}건</span>
        </h3>
        <button
          type="button"
          onClick={() => setEditing('new')}
          disabled={!activeCatCode}
          className="px-3 py-1.5 bg-naver-green text-white rounded text-xs font-bold hover:bg-naver-dark disabled:opacity-50"
        >
          + 새 상품
        </button>
      </div>

      {products.length === 0 ? (
        <p className="text-center text-ink-500 text-sm py-12">
          이 카테고리에 등록된 상품이 없습니다.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-ink-400 text-xs">
            <tr className="border-b border-ink-700">
              <th className="text-left px-2 py-2">상품명</th>
              <th className="text-right px-2 py-2">기본 매출액</th>
              <th className="text-center px-2 py-2">약정</th>
              <th className="text-right px-2 py-2">월 구독액</th>
              <th className="text-center px-2 py-2">활성</th>
              <th className="text-right px-2 py-2">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-800">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-ink-800/40">
                <td className="px-2 py-2">
                  <div className="text-ink-100 font-medium">{p.label}</div>
                  <div className="text-[11px] text-ink-500">{p.code}</div>
                </td>
                <td className="px-2 py-2 text-right text-ink-200 font-mono">
                  {p.default_amount != null ? p.default_amount.toLocaleString() : '—'}
                </td>
                <td className="px-2 py-2 text-center text-ink-300 text-xs">
                  {p.default_period ?? '—'}
                </td>
                <td className="px-2 py-2 text-right text-ink-300 font-mono text-xs">
                  {p.default_monthly != null ? p.default_monthly.toLocaleString() : '—'}
                </td>
                <td className="px-2 py-2 text-center">
                  {p.is_active ? (
                    <span className="text-emerald-400 text-xs">●</span>
                  ) : (
                    <span className="text-ink-600 text-xs">●</span>
                  )}
                </td>
                <td className="px-2 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => setEditing(p)}
                    className="text-ink-300 hover:text-ink-100 text-xs mr-2"
                  >
                    편집
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(p)}
                    className="text-red-400 hover:text-red-300 text-xs"
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editing && (
        <ProductEditor
          product={editing === 'new' ? null : editing}
          categories={categories}
          defaultCategoryCode={activeCatCode}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            onChanged()
          }}
        />
      )}
    </section>
  )
}

function ProductEditor({
  product,
  categories,
  defaultCategoryCode,
  onClose,
  onSaved,
}: {
  product: Product | null
  categories: Category[]
  defaultCategoryCode: string
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!product
  const [form, setForm] = useState({
    code: product?.code ?? '',
    label: product?.label ?? '',
    category: product?.category ?? defaultCategoryCode,
    default_amount: product?.default_amount?.toString() ?? '',
    default_period: product?.default_period ?? '없음',
    is_subscription: product?.is_subscription ?? false,
    default_monthly: product?.default_monthly?.toString() ?? '',
    sort_order: product?.sort_order ?? 0,
    is_active: product?.is_active ?? true,
    note: product?.note ?? '',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.label.trim() || !form.category) {
      alert('상품명과 카테고리는 필수입니다.')
      return
    }
    if (!isEdit && !form.code.trim()) {
      alert('코드를 입력하세요. (영문 식별자, 추후 변경 불가)')
      return
    }
    setSaving(true)
    const payload = {
      ...(isEdit ? {} : { code: form.code.trim() }),
      label: form.label.trim(),
      category: form.category,
      default_amount: form.default_amount ? Number(form.default_amount) : null,
      default_period: form.default_period === '없음' ? null : form.default_period,
      is_subscription: form.is_subscription,
      default_monthly: form.default_monthly ? Number(form.default_monthly) : null,
      sort_order: Number(form.sort_order),
      is_active: form.is_active,
      note: form.note || null,
    }
    const url = isEdit ? `/api/admin/products/${product!.id}` : '/api/admin/products'
    const method = isEdit ? 'PATCH' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) onSaved()
    else {
      const err = await res.json()
      alert(err.error ?? '저장 실패')
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-surface-dark border border-ink-700 rounded-lg p-5 w-full max-w-lg space-y-3">
        <h3 className="text-base font-bold text-ink-100">
          {isEdit ? '상품 수정' : '새 상품 등록'}
        </h3>

        {!isEdit && (
          <Field label="코드 (영문 식별자, 변경 불가)">
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="npay-connect-terminal"
              className="w-full px-3 py-2 bg-ink-900 border border-ink-700 text-ink-100 rounded text-sm"
            />
          </Field>
        )}

        <Field label="상품명">
          <input
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder="Npay커넥트단말기"
            className="w-full px-3 py-2 bg-ink-900 border border-ink-700 text-ink-100 rounded text-sm"
          />
        </Field>

        <Field label="카테고리">
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full px-3 py-2 bg-ink-900 border border-ink-700 text-ink-100 rounded text-sm"
          >
            <option value="">선택</option>
            {categories.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="기본 매출액 (원)">
            <input
              type="number"
              value={form.default_amount}
              onChange={(e) => setForm({ ...form, default_amount: e.target.value })}
              placeholder="0 또는 1200000"
              className="w-full px-3 py-2 bg-ink-900 border border-ink-700 text-ink-100 rounded text-sm"
            />
          </Field>
          <Field label="약정">
            <select
              value={form.default_period ?? '없음'}
              onChange={(e) => setForm({ ...form, default_period: e.target.value })}
              className="w-full px-3 py-2 bg-ink-900 border border-ink-700 text-ink-100 rounded text-sm"
            >
              {PERIOD_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="구독형 여부">
            <label className="flex items-center gap-2 text-sm text-ink-200 mt-2">
              <input
                type="checkbox"
                checked={form.is_subscription}
                onChange={(e) => setForm({ ...form, is_subscription: e.target.checked })}
                className="w-4 h-4 accent-naver-green"
              />
              월 구독형 (월 매출 위주)
            </label>
          </Field>
          <Field label="월 구독액 (원)">
            <input
              type="number"
              value={form.default_monthly}
              onChange={(e) => setForm({ ...form, default_monthly: e.target.value })}
              disabled={!form.is_subscription}
              className="w-full px-3 py-2 bg-ink-900 border border-ink-700 text-ink-100 rounded text-sm disabled:opacity-40"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="정렬">
            <input
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-ink-900 border border-ink-700 text-ink-100 rounded text-sm"
            />
          </Field>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-ink-200">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="w-4 h-4 accent-naver-green"
              />
              활성
            </label>
          </div>
        </div>

        <Field label="메모">
          <input
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            className="w-full px-3 py-2 bg-ink-900 border border-ink-700 text-ink-100 rounded text-sm"
          />
        </Field>

        <div className="flex gap-2 justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-ink-700 text-ink-200 rounded text-sm hover:bg-ink-600"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 bg-naver-green text-white rounded text-sm font-bold hover:bg-naver-dark disabled:opacity-50"
          >
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs text-ink-400 mb-1">{label}</label>
      {children}
    </div>
  )
}
