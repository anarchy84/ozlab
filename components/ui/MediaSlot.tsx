'use client'

// ─────────────────────────────────────────────
// MediaSlot — 이미지 슬롯 컴포넌트 (2026-04-21 DB 기반으로 전면 개편)
//
// 변경 배경 :
//   - 매니페스트(lib/media-manifest.json) + Google Drive 임포트 파이프라인 폐기
//   - 모든 이미지는 어드민의 인라인 편집 ✏️ 로 업로드·교체
//   - 업로드된 이미지는 Supabase Storage 'public-content' 에 저장되고
//     같은 block_key 로 다시 업로드하면 새 타임스탬프로 URL 이 갱신됨
//
// 동작 원리 :
//   1) blockKey 와 value(SSR 에서 DB 조회한 ImageValue) 를 부모가 내려줌
//   2) value 있으면 → 실제 이미지 렌더 (+ admin 이면 hover 시 ✏️)
//   3) value 없으면 → 블루 그라디언트 플레이스홀더
//                     (+ admin 이면 hover 시 ✏️ → 첫 업로드)
//
// 사용 예 :
//   <MediaSlot
//     blockKey="home.hero.slide1.image"
//     value={pickImageOrUndef(blocks, 'home.hero.slide1.image')}
//     aspect="16/9"
//     label="히어로 슬라이드 1 — 카페 창업"
//     hint="매장 실사 / 1920x1080+"
//     pagePath="/"
//     priority
//   />
//
// 레거시 prop (vendor/usage/subject/number) :
//   - 기존 호출처 유지용 — 플레이스홀더 파일명 힌트로만 사용
//   - 리팩터가 끝나면 순차적으로 제거 예정
// ─────────────────────────────────────────────

import { Icon } from '@iconify/react'
import { cn } from '@/lib/utils/cn'
import type { ImageValue } from '@/lib/content-blocks'
import { EditOverlay } from '@/components/editable/EditOverlay'
import type { SaveTarget } from '@/components/editable/EditorProvider'

type MediaUsage = 'logo' | 'product' | 'scene' | 'case' | 'docs'

interface MediaSlotProps {
  // ── 편집 연결 (신규) ───────────────────────
  /** DB block_key (도트 표기법) — 인라인 편집 ✏️ 에 필수 */
  blockKey?: string
  /** SSR 에서 조회한 DB 값 (없으면 플레이스홀더) */
  value?: ImageValue
  /** revalidate 대상 경로 — blockKey 와 세트 */
  pagePath?: string
  /**
   * content_blocks 대신 다른 테이블 (packages/products) 에 저장할 때 지정.
   * EditorModal 이 이 타겟으로 PATCH 호출.
   */
  saveTarget?: SaveTarget
  /**
   * 이미지 업로드 시 storage 경로 prefix.
   * saveTarget 쓸 때는 blockKey 가 가짜 식별자이므로 이걸로 경로 분리.
   * 예: `packages/cafe-business/hero`
   */
  uploadPathPrefix?: string

  // ── 레거시 메타 (개발용 힌트) ──────────────
  /** 벤더 코드 — 플레이스홀더 filename 표기용 */
  vendor?: string
  /** 용도 — 기본 아이콘 결정에 사용 */
  usage?: MediaUsage
  /** 주제 — 플레이스홀더 filename 표기용 */
  subject?: string
  /** 번호 — 플레이스홀더 filename 표기용 */
  number?: string | number

  // ── 레이아웃 ────────────────────────────────
  /** 비율 — CSS aspect-ratio 문자열 */
  aspect?: string
  /** 대체 텍스트 / 플레이스홀더 상단 라벨 */
  label: string
  /** 플레이스홀더 하단 힌트 (권장 사이즈 등) */
  hint?: string
  /** LCP 후보 (히어로용) — native img 에 loading="eager" 적용 */
  priority?: boolean
  /** 반응형 sizes 힌트 */
  sizes?: string
  /** 부모에 채울지 (default: true) */
  fill?: boolean
  /** 이미지 object-fit */
  fit?: 'cover' | 'contain'
  /** 아이콘 오버라이드 */
  icon?: string
  /** 추가 className (컨테이너) */
  className?: string
  /** 이미지 자체에 적용할 className */
  imgClassName?: string
  /** 플레이스홀더 테마 */
  theme?: 'light' | 'dark'
}

/**
 * 이미지 슬롯.
 * DB 에 값이 있으면 실제 이미지, 없으면 "채울 자리" 플레이스홀더.
 * admin 이면 어떤 경우든 hover 시 ✏️ 버튼으로 업로드·교체 가능.
 */
export default function MediaSlot({
  blockKey,
  value,
  pagePath,
  saveTarget,
  uploadPathPrefix,
  vendor,
  usage = 'scene',
  subject,
  number,
  aspect = '16/9',
  label,
  hint,
  priority = false,
  sizes,
  fill = true,
  fit = 'cover',
  icon,
  className,
  imgClassName,
  theme = 'light',
}: MediaSlotProps) {
  const defaultIcon = icon ?? getDefaultIcon(usage)

  // 번호 2자리 정규화 (개발용 힌트)
  const normalizedNumber =
    typeof number === 'number' ? String(number).padStart(2, '0') : (number ?? '')
  const legacyFilename =
    vendor && subject && normalizedNumber
      ? `${vendor}-${usage}-${subject}-${normalizedNumber}`
      : null

  // 실제 렌더할 이미지 URL 결정
  // value.fallback_url 이 있으면 <picture> 로 WebP+PNG 병행
  const hasImage = !!(value && value.url)

  const imageNode = hasImage && value ? (
    value.fallback_url ? (
      <picture>
        <source srcSet={value.url} type="image/webp" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={value.fallback_url}
          alt={value.alt ?? label}
          width={value.width}
          height={value.height}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          sizes={sizes}
          className={cn(
            'absolute inset-0 w-full h-full',
            fit === 'cover' ? 'object-cover' : 'object-contain',
            imgClassName,
          )}
        />
      </picture>
    ) : (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={value.url}
        alt={value.alt ?? label}
        width={value.width}
        height={value.height}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        sizes={sizes}
        className={cn(
          'absolute inset-0 w-full h-full',
          fit === 'cover' ? 'object-cover' : 'object-contain',
          imgClassName,
        )}
      />
    )
  ) : null

  const inner = hasImage ? (
    imageNode
  ) : (
    <Placeholder
      label={label}
      hint={hint}
      icon={defaultIcon}
      filename={legacyFilename ?? blockKey ?? 'unnamed'}
      theme={theme}
    />
  )

  const baseClassName = cn(
    'relative overflow-hidden',
    !fill && 'inline-block',
    className,
  )
  const baseStyle: React.CSSProperties = { aspectRatio: aspect }

  // blockKey 없으면 편집 불가 — 그냥 내용만 렌더
  if (!blockKey) {
    return (
      <div className={baseClassName} style={baseStyle}>
        {inner}
      </div>
    )
  }

  // 편집 가능 — EditOverlay 로 감싸서 ✏️ 노출
  return (
    <EditOverlay
      as="div"
      className={baseClassName}
      style={baseStyle}
      session={{
        blockKey,
        blockType:    'image',
        currentValue: value ?? { url: '', alt: label },
        semanticTag:  'img',
        pagePath:     pagePath ?? null,
        saveTarget,
        uploadPathPrefix,
      }}
    >
      {inner}
    </EditOverlay>
  )
}

// ─────────────────────────────────────────────
// 플레이스홀더 내부 구현
// ─────────────────────────────────────────────

interface PlaceholderProps {
  label: string
  hint?: string
  icon: string
  filename: string
  theme: 'light' | 'dark'
}

function Placeholder({ label, hint, icon, filename, theme }: PlaceholderProps) {
  const isDark = theme === 'dark'

  return (
    <div
      className={cn(
        'absolute inset-0 flex flex-col items-center justify-center',
        'text-center px-4 py-6 overflow-hidden',
        isDark
          ? 'bg-gradient-to-br from-[#1B4FD1] via-[#2663EA] to-[#3182F6]'
          : 'bg-gradient-to-br from-primary-50 via-primary-100 to-white',
      )}
      aria-label={`이미지 예정: ${label}`}
    >
      {/* 배경 장식 */}
      <div
        className={cn(
          'absolute inset-0 pointer-events-none',
          isDark ? 'opacity-[0.12]' : 'opacity-[0.25]',
        )}
        style={{
          backgroundImage: isDark
            ? 'radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 70% 80%, white 1px, transparent 1px)'
            : 'radial-gradient(circle at 20% 30%, #3182F6 1px, transparent 1px), radial-gradient(circle at 70% 80%, #3182F6 1px, transparent 1px)',
          backgroundSize: '40px 40px, 60px 60px',
        }}
      />

      {/* 아이콘 */}
      <div
        className={cn(
          'relative w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center mb-3',
          isDark ? 'bg-white/15 backdrop-blur-sm' : 'bg-primary/10',
        )}
      >
        <Icon
          icon={icon}
          className={cn(
            'w-6 h-6 md:w-8 md:h-8',
            isDark ? 'text-white' : 'text-primary',
          )}
        />
      </div>

      {/* 라벨 */}
      <div
        className={cn(
          'relative font-semibold text-sm md:text-base leading-tight line-clamp-2',
          isDark ? 'text-white' : 'text-primary-700',
        )}
      >
        {label}
      </div>

      {/* 힌트 */}
      {hint && (
        <div
          className={cn(
            'relative text-xs md:text-sm mt-1.5 leading-tight line-clamp-2',
            isDark ? 'text-white/70' : 'text-gray-500',
          )}
        >
          {hint}
        </div>
      )}

      {/* 파일명 힌트 — 개발 환경에서만 노출 */}
      {process.env.NODE_ENV !== 'production' && (
        <div
          className={cn(
            'relative mt-3 px-2 py-0.5 rounded text-[10px] md:text-xs font-mono',
            isDark
              ? 'bg-white/10 text-white/60'
              : 'bg-white/60 text-primary-600/70',
          )}
        >
          {filename}
        </div>
      )}
    </div>
  )
}

// 용도별 기본 아이콘 (Solar icon set)
function getDefaultIcon(usage: MediaUsage): string {
  switch (usage) {
    case 'logo':
      return 'solar:star-bold-duotone'
    case 'product':
      return 'solar:box-bold-duotone'
    case 'scene':
      return 'solar:gallery-wide-bold-duotone'
    case 'case':
      return 'solar:shop-bold-duotone'
    case 'docs':
      return 'solar:document-bold-duotone'
    default:
      return 'solar:gallery-wide-bold-duotone'
  }
}
