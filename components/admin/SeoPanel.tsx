'use client'

// ─────────────────────────────────────────────
// SEO 어시스턴트 패널 — 3-Tier 자체 랭킹 시스템
//   Tier 1 : 기본 SEO (RankMath류)
//   Tier 2 : 네이버 다이아 휴리스틱
//   Tier 3 : 구글 EEAT 휴리스틱
//
// 우리편 SeoPanel.tsx 의 검색 미리보기 / OG 미리보기 / 본문 통계 그대로 +
// 3개 Tier 점수와 종합 등급(S/A/B/C) 표시.
// ─────────────────────────────────────────────

import { useMemo, useState } from 'react'
import { calcSeoScore, type SeoCheck } from '@/lib/seo-score'

interface SeoPanelProps {
  title: string
  metaTitle: string
  metaDescription: string
  slug: string
  bodyHtml: string
  focusKeyword: string
  authorName: string
  updatedAt?: string | null
  onFocusKeywordChange: (kw: string) => void
}

export default function SeoPanel({
  title,
  metaTitle,
  metaDescription,
  slug,
  bodyHtml,
  focusKeyword,
  authorName,
  updatedAt,
  onFocusKeywordChange,
}: SeoPanelProps) {
  const displayTitle = metaTitle || title || '제목 없음'
  const displayDesc = metaDescription || '설명을 입력하세요...'
  const displayUrl = `ozlabpay.kr/blog/${slug || '...'}`

  const plain = useMemo(
    () => bodyHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
    [bodyHtml]
  )

  const result = useMemo(
    () =>
      calcSeoScore({
        title,
        metaTitle,
        metaDescription,
        slug,
        bodyHtml,
        focusKeyword,
        authorName,
        updatedAt: updatedAt ?? null,
      }),
    [title, metaTitle, metaDescription, slug, bodyHtml, focusKeyword, authorName, updatedAt]
  )

  // 글자 수 게이지
  const titleLen = displayTitle.length
  const descLen = displayDesc.length
  const titleOk = titleLen >= 30 && titleLen <= 60
  const descOk = descLen >= 120 && descLen <= 160

  return (
    <div className="space-y-5 text-sm">
      {/* ─── 검색 미리보기 ─── */}
      <section>
        <h3 className="text-xs font-medium text-ink-400 mb-2">구글 검색 미리보기</h3>
        <div className="bg-white rounded-lg p-3">
          <p className="text-blue-700 text-base font-medium leading-snug truncate">
            {displayTitle}
          </p>
          <p className="text-green-700 text-xs mt-0.5 truncate">{displayUrl}</p>
          <p className="text-gray-700 text-xs mt-1 line-clamp-2">{displayDesc}</p>
        </div>
        <div className="flex gap-3 mt-1.5 text-[11px]">
          <span className={titleOk ? 'text-emerald-400' : 'text-amber-400'}>
            제목 {titleLen}자 {titleOk ? '✓' : '(30~60 권장)'}
          </span>
          <span className={descOk ? 'text-emerald-400' : 'text-amber-400'}>
            설명 {descLen}자 {descOk ? '✓' : '(120~160 권장)'}
          </span>
        </div>
      </section>

      {/* ─── 포커스 키워드 ─── */}
      <section>
        <label className="block text-xs font-medium text-ink-300 mb-1">
          포커스 키워드
        </label>
        <input
          type="text"
          value={focusKeyword}
          onChange={(e) => onFocusKeywordChange(e.target.value)}
          placeholder="예: 카드 단말기 0원"
          className="w-full px-3 py-2 bg-ink-800 border border-ink-700 rounded text-ink-100 text-sm focus:outline-none focus:ring-2 focus:ring-naver-green"
        />
      </section>

      {/* ─── 종합 점수 + 등급 ─── */}
      {focusKeyword.trim() && (
        <section className="bg-ink-800 border border-ink-700 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-400">종합 점수</span>
            <GradeBadge grade={result.grade} />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-3xl font-bold ${scoreColor(result.total)}`}>
              {result.total}
            </span>
            <span className="text-xs text-ink-500">/ 100</span>
          </div>

          {/* Tier 별 게이지 */}
          <div className="space-y-2 mt-3">
            <TierBar label="기본 SEO" score={result.tier1.score} weight={40} />
            <TierBar label="네이버 다이아" score={result.tier2.score} weight={30} />
            <TierBar label="구글 EEAT" score={result.tier3.score} weight={30} />
          </div>
        </section>
      )}

      {/* ─── Tier 별 상세 ─── */}
      {focusKeyword.trim() && (
        <>
          <TierSection
            title="🔍 Tier 1 · 기본 SEO"
            checks={result.tier1.checks}
            score={result.tier1.score}
          />
          <TierSection
            title="🇰🇷 Tier 2 · 네이버 다이아"
            checks={result.tier2.checks}
            score={result.tier2.score}
          />
          <TierSection
            title="🌐 Tier 3 · 구글 EEAT"
            checks={result.tier3.checks}
            score={result.tier3.score}
          />
        </>
      )}

      {/* ─── 카카오톡 미리보기 ─── */}
      <section>
        <h3 className="text-xs font-medium text-ink-400 mb-2">카카오톡 미리보기</h3>
        <div className="bg-ink-800 border border-ink-700 rounded-lg overflow-hidden">
          <div className="h-24 bg-ink-700 flex items-center justify-center text-ink-500 text-xs">
            OG 이미지 (대표 이미지)
          </div>
          <div className="p-2.5">
            <p className="text-[11px] text-ink-500">ozlabpay.kr</p>
            <p className="text-sm text-ink-100 font-medium truncate">{displayTitle}</p>
            <p className="text-xs text-ink-400 line-clamp-1">{displayDesc}</p>
          </div>
        </div>
      </section>

      {/* ─── 본문 통계 ─── */}
      <section>
        <h3 className="text-xs font-medium text-ink-400 mb-2">본문 통계</h3>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="글자 수" value={plain.length.toLocaleString()} />
          <Stat
            label="단어 수"
            value={plain.split(/\s+/).filter(Boolean).length.toLocaleString()}
          />
        </div>
      </section>
    </div>
  )
}

// ─────────────────────────────────────────────
// 서브 컴포넌트
// ─────────────────────────────────────────────
function GradeBadge({ grade }: { grade: 'S' | 'A' | 'B' | 'C' }) {
  const cls = {
    S: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
    A: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    B: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    C: 'bg-red-500/20 text-red-300 border-red-500/40',
  }[grade]
  return (
    <span className={`px-2 py-0.5 text-xs font-bold rounded border ${cls}`}>
      등급 {grade}
    </span>
  )
}

function scoreColor(s: number) {
  if (s >= 70) return 'text-emerald-400'
  if (s >= 40) return 'text-amber-400'
  return 'text-red-400'
}

function TierBar({
  label,
  score,
  weight,
}: {
  label: string
  score: number
  weight: number
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-0.5">
        <span className="text-ink-300">
          {label} <span className="text-ink-500">({weight}%)</span>
        </span>
        <span className={`font-bold ${scoreColor(score)}`}>{score}</span>
      </div>
      <div className="h-1.5 bg-ink-700 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${
            score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500'
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  )
}

function TierSection({
  title,
  checks,
  score,
}: {
  title: string
  checks: SeoCheck[]
  score: number
}) {
  const [open, setOpen] = useState(false)
  return (
    <details
      className="bg-ink-800/50 border border-ink-700 rounded-lg"
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary className="px-3 py-2 cursor-pointer flex items-center justify-between text-xs">
        <span className="text-ink-200 font-medium">{title}</span>
        <span className="flex items-center gap-2">
          <span className={`font-bold ${scoreColor(score)}`}>{score}</span>
          <span className="text-ink-500">{open ? '▾' : '▸'}</span>
        </span>
      </summary>
      <div className="px-3 pb-3 space-y-1.5">
        {checks.map((c) => (
          <div key={c.label} className="flex items-start gap-2">
            <span className="text-sm mt-0.5">{c.pass ? '✅' : '⚠️'}</span>
            <div className="flex-1">
              <p className="text-xs text-ink-200">{c.label}</p>
              <p className="text-[11px] text-ink-500">{c.info}</p>
            </div>
          </div>
        ))}
      </div>
    </details>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-ink-800 border border-ink-700 rounded-lg p-2">
      <p className="text-[11px] text-ink-500">{label}</p>
      <p className="text-ink-100 font-medium">{value}</p>
    </div>
  )
}
