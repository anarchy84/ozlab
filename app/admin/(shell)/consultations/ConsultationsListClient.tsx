// ─────────────────────────────────────────────
// 상담 신청 목록 + 모달 트리거 (클라이언트)
//
// 서버 page.tsx 가 SSR 로 데이터(items/statuses/counselors/counselorMap) fetch 후
// 이 컴포넌트로 props 전달. 행 클릭 시 ConsultationDetailModal 오픈.
// ─────────────────────────────────────────────
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { DbStatus } from '@/lib/admin/types'
import {
  ConsultationDetailModal,
  type ConsultationFull,
} from './ConsultationDetailModal'

export interface ConsultationRow extends ConsultationFull {}

interface CounselorOption {
  user_id: string
  display_name: string | null
}

interface Props {
  items: ConsultationRow[]
  statuses: DbStatus[]
  counselors: CounselorOption[]
  counselorMap: Record<string, string> // user_id → display name
}

const FORMAT_KST = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: '2-digit',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const FORMAT_KST_SHORT = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  month: '2-digit',
  day: '2-digit',
})

export function ConsultationsListClient({
  items,
  statuses,
  counselors,
  counselorMap,
}: Props) {
  const router = useRouter()
  const [openId, setOpenId] = useState<string | null>(null)

  const statusMap = new Map<number, DbStatus>()
  for (const s of statuses) statusMap.set(s.id, s)

  const allIds = items.map((c) => c.id)
  const openItem = items.find((c) => c.id === openId) ?? null

  if (items.length === 0) {
    return (
      <div className="bg-surface-darkSoft border border-ink-700 rounded-lg p-12 text-center text-ink-500 text-sm">
        조건에 맞는 상담이 없습니다.
      </div>
    )
  }

  return (
    <>
      <div className="bg-surface-darkSoft border border-ink-700 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-ink-900 text-ink-400 text-xs">
            <tr>
              <th className="text-left px-3 py-3 font-semibold">접수</th>
              <th className="text-left px-3 py-3 font-semibold">매체</th>
              <th className="text-left px-3 py-3 font-semibold">신청자</th>
              <th className="text-left px-3 py-3 font-semibold">매장</th>
              <th className="text-left px-3 py-3 font-semibold">상태</th>
              <th className="text-left px-3 py-3 font-semibold">담당</th>
              <th className="text-left px-3 py-3 font-semibold">메모</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-700">
            {items.map((c) => {
              const st = c.status_id ? statusMap.get(c.status_id) : null
              return (
                <tr
                  key={c.id}
                  onClick={() => setOpenId(c.id)}
                  className="hover:bg-ink-800/40 cursor-pointer transition-colors"
                >
                  <td className="px-3 py-3 align-top text-ink-400 text-xs whitespace-nowrap">
                    {FORMAT_KST.format(new Date(c.created_at))}
                  </td>
                  <td className="px-3 py-3 align-top text-xs">
                    {c.utm_source ? (
                      <span className="font-medium text-ink-200">{c.utm_source}</span>
                    ) : (
                      <span className="text-ink-600">-</span>
                    )}
                    {c.utm_campaign && (
                      <div className="text-ink-500 text-[10px] mt-0.5">
                        {c.utm_campaign}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 align-top whitespace-nowrap">
                    <div className="font-semibold text-ink-100 flex items-center gap-1">
                      {c.is_favorite && <span title="즐겨찾기">❤️</span>}
                      {c.is_blacklisted && <span title="블랙리스트">🚫</span>}
                      {c.name}
                    </div>
                    <div className="text-ink-400 text-xs mt-0.5">{c.phone}</div>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <div className="text-ink-200">{c.store_name ?? '—'}</div>
                    <div className="text-ink-500 text-xs mt-0.5">
                      {[c.industry, c.region].filter(Boolean).join(' · ') || '—'}
                    </div>
                  </td>
                  <td className="px-3 py-3 align-top">
                    {st ? (
                      <span
                        className="inline-block text-[11px] font-bold px-2 py-0.5 rounded"
                        style={{ backgroundColor: st.bg_color, color: st.text_color }}
                      >
                        {st.label}
                      </span>
                    ) : (
                      <span className="inline-block text-[11px] text-ink-500">
                        {c.status ?? '-'}
                      </span>
                    )}
                    {c.contacted_at && (
                      <div className="text-[10px] text-ink-500 mt-1">
                        연락 {FORMAT_KST_SHORT.format(new Date(c.contacted_at))}
                      </div>
                    )}
                    {c.done_at && (
                      <div className="text-[10px] text-ink-500 mt-1">
                        완료 {FORMAT_KST_SHORT.format(new Date(c.done_at))}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 align-top text-xs">
                    {c.counselor_id ? (
                      <span className="text-ink-200">
                        {counselorMap[c.counselor_id] ?? '?'}
                      </span>
                    ) : (
                      <span className="text-ink-600">미배정</span>
                    )}
                  </td>
                  <td className="px-3 py-3 align-top max-w-xs">
                    <div className="text-ink-200 break-keep line-clamp-2 text-xs">
                      {c.message ?? '—'}
                    </div>
                    {c.internal_memo && (
                      <div className="text-ink-400 italic line-clamp-1 text-[11px] mt-1">
                        📝 {c.internal_memo}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {openItem && (
        <ConsultationDetailModal
          consultation={openItem}
          statuses={statuses}
          counselors={counselors}
          allIds={allIds}
          onClose={() => setOpenId(null)}
          onNavigate={(id) => setOpenId(id)}
          onUpdated={() => router.refresh()}
        />
      )}
    </>
  )
}
