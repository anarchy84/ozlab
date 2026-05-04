// ─────────────────────────────────────────────
// 상담 신청 목록 — CRM PRO 패턴
//
// 핵심 :
//   ☐ 체크박스 + 벌크 액션 (상태 일괄 변경 / 상담원 일괄 배정 / CSV / 삭제)
//   No 컬럼 (id 마지막 8자)
//   시간 이중표기 (4일 전 + 04-26 08:58)
//   상담원 + 부재 카운터 ① ② ③
//   최종상담 시간 경과 보라 배지
//   연락처 마스킹 + IP
//   유입 출처 펼침 토글 (super_admin/marketing/tm_lead 만)
// ─────────────────────────────────────────────
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AdminRole, DbStatus } from '@/lib/admin/types'
import {
  ConsultationDetailModal,
  type ConsultationFull,
} from './ConsultationDetailModal'
import { BulkActionBar } from './BulkActionBar'
import {
  formatDual,
  ageBadgeClass,
  maskPhone,
  extractAbsenceCount,
} from '@/lib/admin/format-helpers'

export interface ConsultationRow extends ConsultationFull {
  last_contacted_at?: string | null
}

interface CounselorOption {
  user_id: string
  display_name: string | null
}

interface Props {
  items: ConsultationRow[]
  statuses: DbStatus[]
  counselors: CounselorOption[]
  counselorMap: Record<string, string>
  myRole: AdminRole
}

const EXPAND_KEY = 'ozlab_consultations_attribution_expanded'

const CHANNEL_COLORS: Record<string, string> = {
  'naver-ads':       'bg-violet-500/20 text-violet-300',
  'google-ads':      'bg-violet-500/20 text-violet-300',
  'meta-ads':        'bg-violet-500/20 text-violet-300',
  'kakao-ads':       'bg-violet-500/20 text-violet-300',
  'daangn-ads':      'bg-violet-500/20 text-violet-300',
  'youtube-ads':     'bg-violet-500/20 text-violet-300',
  'naver-search':    'bg-blue-500/20 text-blue-300',
  'google-search':   'bg-blue-500/20 text-blue-300',
  'daum-search':     'bg-blue-500/20 text-blue-300',
  'bing-search':     'bg-blue-500/20 text-blue-300',
  'referral-blog':   'bg-orange-500/20 text-orange-300',
  'internal-blog':   'bg-emerald-500/20 text-emerald-300',
  'internal':        'bg-emerald-500/10 text-emerald-200',
  'social-organic':  'bg-pink-500/20 text-pink-300',
  'kakao':           'bg-yellow-500/20 text-yellow-300',
  'referral-other':  'bg-amber-500/15 text-amber-200',
  'direct':          'bg-ink-700 text-ink-300',
}

const CHANNEL_LABELS: Record<string, string> = {
  'naver-ads': '네이버 광고',
  'google-ads': '구글 광고',
  'meta-ads': '메타 광고',
  'kakao-ads': '카카오 광고',
  'daangn-ads': '당근 광고',
  'youtube-ads': '유튜브 광고',
  'naver-search': '네이버 검색',
  'google-search': '구글 검색',
  'daum-search': '다음 검색',
  'bing-search': '빙 검색',
  'referral-blog': '외부 블로그',
  'internal-blog': '자체 블로그',
  'internal': '자체 사이트',
  'social-organic': 'SNS',
  'kakao': '카카오톡',
  'referral-other': '외부 사이트',
  'direct': '직접 진입',
}

function channelClass(ch: string | null): string {
  if (!ch) return CHANNEL_COLORS.direct
  return CHANNEL_COLORS[ch] ?? 'bg-ink-700 text-ink-300'
}
function channelLabel(ch: string | null): string {
  if (!ch) return '미분류'
  return CHANNEL_LABELS[ch] ?? ch
}

export function ConsultationsListClient({
  items,
  statuses,
  counselors,
  counselorMap,
  myRole,
}: Props) {
  const router = useRouter()
  const [openId, setOpenId] = useState<string | null>(null)

  // 펼침 권한 — 마케팅·TM실장·super_admin·레거시 admin
  const canSeeAttribution =
    myRole === 'super_admin' || myRole === 'admin' || myRole === 'marketing' ||
    myRole === 'tm_lead' || myRole === 'marketer'
  const canBulkAction =
    myRole === 'super_admin' || myRole === 'admin' || myRole === 'marketing' || myRole === 'tm_lead'
  const canDelete = myRole === 'super_admin'

  // 펼침 상태 — localStorage
  const [expanded, setExpanded] = useState(false)
  useEffect(() => {
    if (!canSeeAttribution) return
    try {
      const raw = window.localStorage.getItem(EXPAND_KEY)
      if (raw === '1') setExpanded(true)
    } catch {}
  }, [canSeeAttribution])

  const toggleExpanded = () => {
    setExpanded((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(EXPAND_KEY, next ? '1' : '0')
      } catch {}
      return next
    })
  }

  // 체크박스 선택
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const allChecked = items.length > 0 && selectedIds.size === items.length
  const toggleAll = () => {
    if (allChecked) setSelectedIds(new Set())
    else setSelectedIds(new Set(items.map((c) => c.id)))
  }
  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

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
      {/* 벌크 액션 바 (선택 1건 이상) */}
      {canBulkAction && selectedIds.size > 0 && (
        <BulkActionBar
          selectedIds={Array.from(selectedIds)}
          statuses={statuses}
          counselors={counselors}
          canDelete={canDelete}
          onClear={() => setSelectedIds(new Set())}
          onDone={() => {
            setSelectedIds(new Set())
            router.refresh()
          }}
        />
      )}

      {/* 권한자 — 유입 출처 펼치기 토글 */}
      {canSeeAttribution && (
        <div className="flex justify-end -mb-3">
          <button
            type="button"
            onClick={toggleExpanded}
            className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
              expanded
                ? 'bg-naver-green/20 text-naver-neon border-naver-green/40'
                : 'bg-ink-800 text-ink-300 border-ink-700 hover:bg-ink-700'
            }`}
          >
            🎯 유입 출처 {expanded ? '접기 ◀' : '펼치기 ▶'}
          </button>
        </div>
      )}

      <div className="bg-surface-darkSoft border border-ink-700 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-ink-900 text-ink-400 text-xs">
            <tr>
              {canBulkAction && (
                <th className="text-center px-2 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={toggleAll}
                    className="w-4 h-4 accent-naver-green cursor-pointer"
                  />
                </th>
              )}
              <th className="text-left px-2 py-3 font-semibold w-14">No</th>
              <th className="text-left px-3 py-3 font-semibold whitespace-nowrap">신청일시</th>
              <th className="text-left px-3 py-3 font-semibold">매체/그룹</th>
              {canSeeAttribution && expanded && (
                <>
                  <th className="text-left px-3 py-3 font-semibold bg-naver-green/5">캠페인</th>
                  <th className="text-left px-3 py-3 font-semibold bg-naver-green/5">키워드</th>
                  <th className="text-left px-3 py-3 font-semibold bg-naver-green/5">소재</th>
                  <th className="text-left px-3 py-3 font-semibold bg-naver-green/5">랜딩</th>
                </>
              )}
              <th className="text-left px-3 py-3 font-semibold">상담원/배정</th>
              <th className="text-left px-3 py-3 font-semibold">상태</th>
              <th className="text-left px-3 py-3 font-semibold whitespace-nowrap">최종상담</th>
              <th className="text-left px-3 py-3 font-semibold">고객명</th>
              <th className="text-left px-3 py-3 font-semibold whitespace-nowrap">연락처</th>
              <th className="text-left px-3 py-3 font-semibold">메모</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-700">
            {items.map((c) => {
              const st = c.status_id ? statusMap.get(c.status_id) : null
              const created = formatDual(c.created_at)
              const assigned = formatDual(c.assigned_at)
              const lastContact = formatDual(c.last_contacted_at ?? null)
              const isSelected = selectedIds.has(c.id)
              const absenceCount = extractAbsenceCount(st?.code ?? null)

              return (
                <tr
                  key={c.id}
                  className={`transition-colors ${
                    isSelected
                      ? 'bg-naver-green/10'
                      : 'hover:bg-ink-800/40'
                  }`}
                >
                  {canBulkAction && (
                    <td className="text-center px-2 py-3 align-top">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOne(c.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 accent-naver-green cursor-pointer mt-1"
                      />
                    </td>
                  )}
                  <td
                    onClick={() => setOpenId(c.id)}
                    className="px-2 py-3 align-top text-[10px] text-ink-500 font-mono cursor-pointer"
                  >
                    {c.id.slice(-6)}
                  </td>
                  <td
                    onClick={() => setOpenId(c.id)}
                    className="px-3 py-3 align-top whitespace-nowrap cursor-pointer"
                  >
                    {created && (
                      <>
                        <div className="text-ink-200 text-[11px] font-bold">
                          {created.relative}
                        </div>
                        <div className="text-ink-500 text-[10px] mt-0.5">
                          {created.absolute}
                        </div>
                      </>
                    )}
                  </td>
                  <td
                    onClick={() => setOpenId(c.id)}
                    className="px-3 py-3 align-top text-xs cursor-pointer"
                  >
                    <span
                      className={`inline-block px-2 py-0.5 rounded font-medium whitespace-nowrap ${channelClass(c.inferred_channel)}`}
                    >
                      {channelLabel(c.inferred_channel)}
                    </span>
                    {c.db_group_label && (
                      <div className="text-[10px] text-ink-400 mt-1">
                        {c.db_group_label}
                      </div>
                    )}
                    {c.utm_source && (
                      <div className="text-[10px] text-ink-500 mt-0.5">
                        {c.utm_source}
                      </div>
                    )}
                  </td>

                  {canSeeAttribution && expanded && (
                    <>
                      <td
                        onClick={() => setOpenId(c.id)}
                        className="px-3 py-3 align-top text-xs bg-naver-green/5 cursor-pointer"
                      >
                        {c.utm_campaign ? (
                          <span className="text-ink-200">{c.utm_campaign}</span>
                        ) : (
                          <span className="text-ink-600">—</span>
                        )}
                      </td>
                      <td
                        onClick={() => setOpenId(c.id)}
                        className="px-3 py-3 align-top text-xs bg-naver-green/5 cursor-pointer"
                      >
                        {c.inferred_keyword ? (
                          <span
                            className="text-ink-200 break-keep"
                            title={c.inferred_keyword}
                          >
                            {c.inferred_keyword === '(not provided)' ? (
                              <span className="text-ink-500 italic">(구글)</span>
                            ) : (
                              `"${c.inferred_keyword}"`
                            )}
                          </span>
                        ) : (
                          <span className="text-ink-600">—</span>
                        )}
                      </td>
                      <td
                        onClick={() => setOpenId(c.id)}
                        className="px-3 py-3 align-top text-xs bg-naver-green/5 cursor-pointer"
                      >
                        {c.inferred_creative ? (
                          <span className="text-ink-200">{c.inferred_creative}</span>
                        ) : (
                          <span className="text-ink-600">—</span>
                        )}
                      </td>
                      <td
                        onClick={() => setOpenId(c.id)}
                        className="px-3 py-3 align-top text-xs bg-naver-green/5 max-w-[180px] cursor-pointer"
                      >
                        {c.inferred_landing_title ? (
                          <span className="text-emerald-300 line-clamp-2 break-keep">
                            📄 {c.inferred_landing_title}
                          </span>
                        ) : c.landing_page_path ? (
                          <span className="text-ink-300 truncate block">
                            {c.landing_page_path}
                          </span>
                        ) : c.referer_domain ? (
                          <span className="text-ink-400">← {c.referer_domain}</span>
                        ) : (
                          <span className="text-ink-600">—</span>
                        )}
                      </td>
                    </>
                  )}

                  {/* 상담원 + 배정 */}
                  <td
                    onClick={() => setOpenId(c.id)}
                    className="px-3 py-3 align-top text-xs whitespace-nowrap cursor-pointer"
                  >
                    {c.counselor_id ? (
                      <>
                        <div className="text-ink-200 font-medium">
                          {counselorMap[c.counselor_id] ?? '?'}
                        </div>
                        {assigned && (
                          <div className="text-[10px] text-ink-500 mt-0.5">
                            배정 {assigned.relative}
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-ink-600 italic">미배정</span>
                    )}
                  </td>

                  {/* 상태 + 부재 카운터 */}
                  <td
                    onClick={() => setOpenId(c.id)}
                    className="px-3 py-3 align-top cursor-pointer"
                  >
                    {st ? (
                      <span
                        className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded whitespace-nowrap"
                        style={{ backgroundColor: st.bg_color, color: st.text_color }}
                      >
                        {st.label}
                        {absenceCount && (
                          <span
                            className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-black/30 text-white text-[10px] font-bold"
                            title={`재통화 ${absenceCount}회`}
                          >
                            {absenceCount}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-[11px] text-ink-500">미지정</span>
                    )}
                  </td>

                  {/* 최종상담 (시간 경과 강조) */}
                  <td
                    onClick={() => setOpenId(c.id)}
                    className="px-3 py-3 align-top whitespace-nowrap cursor-pointer"
                  >
                    {lastContact ? (
                      <>
                        <span
                          className={`inline-block text-[11px] font-bold px-1.5 py-0.5 rounded ${ageBadgeClass(lastContact.ageMinutes)}`}
                        >
                          {lastContact.relative}
                        </span>
                        <div className="text-[10px] text-ink-500 mt-0.5">
                          {lastContact.absolute}
                        </div>
                      </>
                    ) : (
                      <span className="text-ink-600 text-xs">—</span>
                    )}
                  </td>

                  {/* 고객명 */}
                  <td
                    onClick={() => setOpenId(c.id)}
                    className="px-3 py-3 align-top whitespace-nowrap cursor-pointer"
                  >
                    <div className="font-semibold text-ink-100 flex items-center gap-1">
                      {c.is_favorite && <span title="즐겨찾기">❤️</span>}
                      {c.is_blacklisted && <span title="블랙리스트">🚫</span>}
                      {c.name}
                    </div>
                    {c.store_name && (
                      <div className="text-ink-400 text-[10px] mt-0.5">
                        {c.store_name}
                      </div>
                    )}
                  </td>

                  {/* 연락처 + IP */}
                  <td
                    onClick={() => setOpenId(c.id)}
                    className="px-3 py-3 align-top whitespace-nowrap cursor-pointer"
                  >
                    <div className="text-ink-200 font-mono text-xs">
                      {maskPhone(c.phone, myRole)}
                    </div>
                    {c.ip_address && (
                      <div className="text-[10px] text-ink-500 font-mono mt-0.5">
                        {c.ip_address}
                      </div>
                    )}
                  </td>

                  {/* 메모 */}
                  <td
                    onClick={() => setOpenId(c.id)}
                    className="px-3 py-3 align-top max-w-xs cursor-pointer"
                  >
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
