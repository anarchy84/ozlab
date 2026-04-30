'use client'

// ─────────────────────────────────────────────
// RevenueModal — 매출 등록·수정 모달
//   - 자동 트리거 : 상담 상태가 is_conversion=true 인 상태로 변경 시 (ConsultationDetailModal 에서 띄움)
//   - 자유 등록   : 상세 모달 우측 매출 카드 "+ 매출 등록" 버튼
// ─────────────────────────────────────────────

import { useEffect, useState } from 'react'

export interface ProductOption {
  id: string
  code: string
  label: string
  category: string
  default_amount: number | null
  default_period: string | null
  is_subscription: boolean
  default_monthly: number | null
}

export interface RevenueDraft {
  id?: string
  product_id?: string | null
  product_label?: string | null
  amount: number
  gift_amount: number
  monthly_amount?: number | null
  contract_period?: string | null
  revenue_date: string
  note?: string | null
}

interface Props {
  consultationId: string
  consultationName: string
  initial?: RevenueDraft           // 수정 모드면 기존 데이터
  onClose: () => void
  onSaved: () => void
  onSkip?: () => void              // 자동 트리거 시 "건너뛰기" 옵션
}

const PERIOD_OPTIONS = ['없음', '12개월', '24개월', '36개월', '48개월']

function todayKst(): string {
  const d = new Date()
  // KST 보정 (서버 타임존 무관하게)
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

export default function RevenueModal({
  consultationId,
  consultationName,
  initial,
  onClose,
  onSaved,
  onSkip,
}: Props) {
  const isEdit = !!initial?.id
  const [products, setProducts] = useState<ProductOption[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [saving, setSaving] = useState(false)

  const [productId, setProductId] = useState<string>(initial?.product_id ?? '')
  const [amount, setAmount] = useState<string>(initial?.amount?.toString() ?? '')
  const [giftAmount, setGiftAmount] = useState<string>(initial?.gift_amount?.toString() ?? '0')
  const [period, setPeriod] = useState<string>(initial?.contract_period ?? '없음')
  const [monthly, setMonthly] = useState<string>(initial?.monthly_amount?.toString() ?? '')
  const [revenueDate, setRevenueDate] = useState<string>(initial?.revenue_date ?? todayKst())
  const [note, setNote] = useState<string>(initial?.note ?? '')

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/admin/products?active=1', { cache: 'no-store' })
      if (res.ok) setProducts(await res.json())
      setLoadingProducts(false)
    }
    load()
  }, [])

  // 상품 선택 시 default 값 자동 채움 (수정 모드 X)
  useEffect(() => {
    if (isEdit) return
    const p = products.find((x) => x.id === productId)
    if (!p) return
    if (!amount) setAmount(p.default_amount?.toString() ?? '')
    if (period === '없음' && p.default_period) setPeriod(p.default_period)
    if (!monthly && p.default_monthly) setMonthly(p.default_monthly.toString())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, products])

  const net =
    (Number(amount) || 0) - (Number(giftAmount) || 0)

  const handleSave = async () => {
    if (!amount) {
      alert('매출액을 입력하세요.')
      return
    }
    if (!revenueDate) {
      alert('개통일을 입력하세요.')
      return
    }
    setSaving(true)

    const product = products.find((p) => p.id === productId)
    const payload = {
      consultation_id: consultationId,
      product_id: productId || null,
      product_label: product?.label ?? null,
      amount: Number(amount),
      gift_amount: Number(giftAmount) || 0,
      monthly_amount: monthly ? Number(monthly) : null,
      contract_period: period === '없음' ? null : period,
      revenue_date: revenueDate,
      note: note || null,
    }

    const url = isEdit ? `/api/admin/revenue/${initial!.id}` : '/api/admin/revenue'
    const method = isEdit ? 'PATCH' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (res.ok) onSaved()
    else {
      const err = await res.json().catch(() => ({}))
      alert(err.error ?? '저장 실패')
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-surface-dark border border-ink-700 rounded-lg p-6 w-full max-w-lg space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-ink-100">
            💰 {isEdit ? '매출 수정' : '매출 등록'}
          </h3>
          <span className="text-xs text-ink-500">{consultationName}</span>
        </div>

        {/* 상품 */}
        <Field label="상품">
          {loadingProducts ? (
            <div className="text-xs text-ink-500">로딩 중...</div>
          ) : (
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full px-3 py-2 bg-ink-900 border border-ink-700 text-ink-100 rounded text-sm focus:outline-none focus:ring-2 focus:ring-naver-green"
            >
              <option value="">선택 안 함 (직접 입력)</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.category}] {p.label}
                </option>
              ))}
            </select>
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="매출액 (원)">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1200000"
              className="w-full px-3 py-2 bg-ink-900 border border-ink-700 text-ink-100 rounded text-sm font-mono"
            />
          </Field>
          <Field label="사은품액 (원) — 통신사 지원금 등">
            <input
              type="number"
              value={giftAmount}
              onChange={(e) => setGiftAmount(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 bg-ink-900 border border-ink-700 text-ink-100 rounded text-sm font-mono"
            />
          </Field>
        </div>

        <div className="text-xs text-ink-400 -mt-2">
          순매출 ={' '}
          <span className={net >= 0 ? 'text-naver-neon font-bold' : 'text-red-400'}>
            {net.toLocaleString()}원
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="약정 기간">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full px-3 py-2 bg-ink-900 border border-ink-700 text-ink-100 rounded text-sm"
            >
              {PERIOD_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>
          <Field label="월 매출 (구독형, 선택)">
            <input
              type="number"
              value={monthly}
              onChange={(e) => setMonthly(e.target.value)}
              placeholder="60000"
              className="w-full px-3 py-2 bg-ink-900 border border-ink-700 text-ink-100 rounded text-sm font-mono"
            />
          </Field>
        </div>

        <Field label="개통일">
          <input
            type="date"
            value={revenueDate}
            onChange={(e) => setRevenueDate(e.target.value)}
            className="w-full px-3 py-2 bg-ink-900 border border-ink-700 text-ink-100 rounded text-sm"
          />
        </Field>

        <Field label="메모 (선택)">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="설치 일정·고객 특이사항 등"
            className="w-full px-3 py-2 bg-ink-900 border border-ink-700 text-ink-100 rounded text-sm"
          />
        </Field>

        <div className="flex gap-2 justify-end pt-2">
          {onSkip && !isEdit && (
            <button
              type="button"
              onClick={onSkip}
              className="px-3 py-2 bg-ink-700 text-ink-300 rounded text-sm hover:bg-ink-600"
            >
              건너뛰기 (나중에 입력)
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 bg-ink-700 text-ink-200 rounded text-sm hover:bg-ink-600"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-naver-green text-white rounded text-sm font-bold hover:bg-naver-dark disabled:opacity-50"
          >
            {saving ? '저장 중…' : isEdit ? '수정' : '매출 등록'}
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
