// ─────────────────────────────────────────────
// 오즈랩페이 브랜드 마크 + 아이콘 셋
// - 원본 : _design_reference/src/icons.jsx (전역 window 패턴)
// - 포팅 : ES 모듈 + TypeScript props
// - 모든 아이콘은 currentColor 사용 → 부모 text-* 로 색 조정
// ─────────────────────────────────────────────
'use client'

import * as React from 'react'

interface OzLogoProps {
  /** 원형 마크 사이즈 (px). 워드 크기는 size * 0.62 로 자동 계산 */
  size?: number
  /** 원형 마크 색 (기본 네이버 그린) */
  color?: string
  /** 워드 노출 여부 */
  showWord?: boolean
  /** 다크 배경용 — 워드 색을 흰색으로 전환 */
  dark?: boolean
}

/**
 * 오즈랩페이 브랜드 마크
 *  - 원형(Oz) + 워드(labpay) 조합
 *  - showWord=false 면 마크만
 */
export function OzLogo({
  size = 28,
  color = '#3A7BFF',
  showWord = true,
  dark = false,
}: OzLogoProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        fontWeight: 800,
        letterSpacing: 0,
      }}
    >
      <span
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: color,
          color: 'white',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.48,
          fontWeight: 900,
          fontFamily: "-apple-system, 'SF Pro Display', sans-serif",
          letterSpacing: 0,
        }}
      >
        Oz
      </span>
      {showWord && (
        <span style={{ fontSize: size * 0.62, color: dark ? 'white' : '#0a0a0a' }}>
          lab<span style={{ color }}>pay</span>
        </span>
      )}
    </span>
  )
}

// ── 공용 아이콘 (currentColor 기반) ─────────────
interface IconProps {
  /** 아이콘 사이즈 (px). 기본값은 각 아이콘별로 다름 */
  s?: number
}

const ic = {
  Card: ({ s = 24 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="6" width="18" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 10h18" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7 15h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  Star: ({ s = 24 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3l2.7 5.9 6.4.7-4.8 4.4 1.4 6.3L12 17.8l-5.7 2.5 1.4-6.3L3 9.6l6.4-.7L12 3z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Megaphone: ({ s = 24 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path
        d="M3 10v4h3l8 4V6L6 10H3z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M18 8a5 5 0 0 1 0 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  Search: ({ s = 24 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M20 20l-4.5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  Chart: ({ s = 24 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M4 19V5M4 19h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M7 15l4-4 3 3 5-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  ),
  Arrow: ({ s = 24 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Plus: ({ s = 20 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 20 20" fill="none">
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  Check: ({ s = 20 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 20 20" fill="none">
      <path
        d="M4 10.5 L8 14.5 L16 6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Phone: ({ s = 20 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 20 20" fill="none">
      <path
        d="M4 3.5c0 7.5 5 12.5 12.5 12.5l-.5-4-3.5-1-1.5 2c-1.5-.7-3-2.2-3.7-3.7l2-1.5-1-3.5-4-.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Shield: ({ s = 24 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3l8 3v6c0 4.5-3.5 8-8 9-4.5-1-8-4.5-8-9V6l8-3z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M8 12l3 3 5-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  QR: ({ s = 24 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="4" y="4" width="6" height="6" stroke="currentColor" strokeWidth="1.6" />
      <rect x="14" y="4" width="6" height="6" stroke="currentColor" strokeWidth="1.6" />
      <rect x="4" y="14" width="6" height="6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M14 14h3v3M20 14v6M14 20h3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  // ── 마케팅 패키지 랜딩용 추가 아이콘 ──
  Video: ({ s = 24 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="6" width="13" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16 10l5-3v10l-5-3v-4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  ),
  Sparkle: ({ s = 24 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M19 14l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  ),
  Share: ({ s = 24 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="6" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="18" cy="6" r="2.6" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="18" cy="18" r="2.6" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8.3 10.8l7.4-3.6M8.3 13.2l7.4 3.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  Users: ({ s = 24 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16 6.2A3 3 0 0 1 16 13M17.5 19c0-2.4-1.2-4.2-3-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
  Clock: ({ s = 24 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Doc: ({ s = 24 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M6 3h8l4 4v14H6V3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M14 3v4h4M9 12h6M9 16h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  Won: ({ s = 24 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path
        d="M4 7l3 10 3-7 2 5 2-5 3 7 3-10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M3 10.5h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  Target: ({ s = 24 }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
  ),
}

export const Icon = ic
