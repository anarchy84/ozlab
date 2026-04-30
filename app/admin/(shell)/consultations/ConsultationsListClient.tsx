// ─────────────────────────────────────────────
// 상담 신청 목록 + 모달 트리거 + 유입 출처 펼침 패널
//
// 핵심 :
//   - 매체 컬럼 옆에 토글 (super_admin/admin/marketer 만 보임)
//   - 펼치면 캠페인 / 키워드 / 소재 / 랜딩 4컬럼 등장
//   - 펼침 상태는 localStorage 에 저장 (권한자 본인 환경 유지)
// ─────────────────────────────────────────────
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AdminRole, DbStatus } from '@/lib/admin/types'
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
  myRole: AdminRole
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

const EXPAND_KEY = 'ozlab_consultations_attribution_expanded'

// 분류별 색상 (배경 / 텍스트)
const CHANNEL_COLORS: Record<string, string> = {
  // 광고
  'naver-ads':       'bg-violet-500/20 text-violet-300',
  'google-ads':      'bg-violet-500/20 text-violet-300',
  'meta-ads':        'bg-violet-500/20 text-violet-300',
  'kakao-ads':       'bg-violet-500/20 text-violet-300',
  'daangn-ads':      'bg-violet-500/20 text-violet-300',
  'youtube-ads':     'bg-violet-500/20 text-violet-300',
  // 검색 organic
  'naver-search':    'bg-blue-500/20 text-blue-300',
  'google-search':   'bg-blue-500/20 text-blue-300',
  'daum-search':     'bg-blue-500/20 text-blue-300',
  'bing-search':     'bg-blue-500/20 text-blue-300',
  // 외부 블로그
  'referral-blog':   'bg-orange-500/20 text-orange-300',
  // 자체 블로그 — 핵심 ROI
  'internal-blog':   'bg-emerald-500/20 text-emerald-300',
  'internal':        'bg-emerald-500/10 text-emerald-200',
  // 소셜
  'social-organic':  'bg-pink-500/20 text-pink-300',
  // 카카오
  'kakao':           'bg-yellow-500/20 text-yellow-300',
  // 기타
  'referral-other':  'bg-amber-500/15 text-amber-200',
  'direct':          'bg-ink-700 text-ink-300',
}

const CHANNEL_LABELS: Record<string, string> = {
  'naver-ads':      '네이버 광고',
  'google-ads':     '구글 광고',
  'meta-ads':       '메타 광고',
  'kakao-ads':      '카카오 광고',
  'daangn-ads':     '당근 광고',
  'youtube-ads':    '유튜브 광고',
  'naver-search':   '네이버 검색',
  'google-search':  '구글 검색',
  'daum-search':    '다음 검색',
  'bing-search':    '빙 검색',
  'referral-blog':  '외부 블로그',
  'internal-blog':  '자체 블로그',
  'internal':       '자체 사이트',
  'social-organic': 'SNS',
  'kakao':          '카카오톡',
  'referral-other': '외부 사이트',
  'direct':         '직접 진입',
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

  // 권한 — 유입 출처 펼침 토글 노출 대상
  const canSeeAttribution =
    myRole === 'super_admin' || myRole === 'admin' || myRole === 'marketer'

  // 펼침 상태 — localStorage 보존 (권한자 본인 환경)
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
            title="유입 출처 (캠페인/키워드/소재/랜딩) 펼치기"
          >
            🎯 유입 출처 {expanded ? '접기 ◀' : '펼치기 ▶'}
          </button>
        </div>
      )}

      <div className="bg-surface-darkSoft border border-ink-700 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-ink-900 text-ink-400 text-xs">
            <tr>
              <th className="text-left px-3 py-3 font-semibold">접수</th>
              <th className="text-left px-3 py-3 font-semibold">매체</th>
              {/* 펼침 컬럼 (권한자 + 펼침) */}
              {canSeeAttribution && expanded && (
                <>
                  <th className="text-left px-3 py-3 font-semibold bg-naver-green/5">
                    캠페인
                  </th>
                  <th className="text-left px-3 py-3 font-semibold bg-naver-green/5">
                    키워드
                  </th>
                  <th className="text-left px-3 py-3 font-semibold bg-naver-green/5">
                    소재
                  </th>
                  <th className="text-left px-3 py-3 font-semibold bg-naver-green/5">
                    랜딩
                  </th>
                </>
              )}
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

                  {/* 매체 — inferred_channel 기반 색상 배지 */}
                  <td className="px-3 py-3 align-top text-xs">
                    <span
                      className={`inline-block px-2 py-0.5 rounded font-medium ${channelClass(c.inferred_channel)}`}
                    >
                      {channelLabel(c.inferred_channel)}
                    </span>
                    {c.utm_source && (
                      <div className="text-ink-500 text-[10px] mt-1">
                        {c.utm_source}
                      </div>
                    )}
                  </td>

                  {/* 펼침 — 캠페인 / 키워드 / 소재 / 랜딩 */}
                  {canSeeAttribution && expanded && (
                    <>
                      <td className="px-3 py-3 align-top text-xs bg-naver-green/5">
                        {c.utm_campaign ? (
                          <span className="text-ink-200">{c.utm_campaign}</span>
                        ) : (
                          <span className="text-ink-600">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 align-top text-xs bg-naver-green/5">
                        {c.inferred_keyword ? (
                          <span
                            className="text-ink-200 break-keep"
                            title={c.inferred_keyword}
                          >
                            {c.inferred_keyword === '(not provided)' ? (
                              <span className="text-ink-500 italic">
                                (구글 키워드 비공개)
                              </span>
                            ) : (
                              `"${c.inferred_keyword}"`
                            )}
                          </span>
                        ) : (
                          <span className="text-ink-600">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 align-top text-xs bg-naver-green/5">
                        {c.inferred_creative ? (
                          <span className="text-ink-200">{c.inferred_creative}</span>
                        ) : (
                          <span className="text-ink-600">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 align-top text-xs bg-naver-green/5 max-w-[200px]">
                        {c.inferred_landing_title ? (
                          <span
                            className="text-emerald-300 line-clamp-2"
                            title={c.inferred_landing_title}
                          >
                            📄 {c.inferred_landing_title}
                          </span>
                        ) : c.landing_page_path ? (
                          <span
                            className="text-ink-300 truncate block"
                            title={c.landing_page_path}
                          >
                            {c.landing_page_path}
                          </span>
                        ) : c.referer_domain ? (
                          <span
                            className="text-ink-400"
                            title={c.referer ?? undefined}
                          >
                            ← {c.referer_domain}
                          </span>
                        ) : (
                          <span className="text-ink-600">—</span>
                        )}
                      </td>
                    </>
                  )}

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
