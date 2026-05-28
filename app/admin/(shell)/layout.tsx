// ─────────────────────────────────────────────
// /admin/(shell) — 어드민 shell 레이아웃 (인증 + role 게이트 + 상단 네비)
//
// route group "(shell)" 안의 페이지만 이 layout 적용 :
//   · /admin                    → 대시보드
//   · /admin/consultations      → 상담 신청 목록
//   · /admin/users              → 사용자 관리 (super_admin 전용)
//   · /admin/settings/statuses  → 상태 관리 (super_admin 전용)
//
// 인증 흐름 :
//   1) Supabase auth 쿠키 확인 → 비로그인 → /admin/login
//   2) admin_users 등록 + is_active 확인 → 미등록 → /admin/login?error=no_access
//   3) role 별로 메뉴 필터 (super_admin 만 사용자/설정 메뉴 표시)
// ─────────────────────────────────────────────
import Link from 'next/link'
import { requireAdminProfile } from '@/lib/admin/auth-helpers'
import {
  ROLE_LABELS,
  ROLE_EMOJI,
  canManageBlocklist,
  isSuperAdmin,
} from '@/lib/admin/permissions'
import { AdminSignOutButton } from '@/components/admin/AdminSignOutButton'
import { SettingsDropdown } from '@/components/admin/SettingsDropdown'
import { HelpFloatingButton } from '@/components/admin/HelpFloatingButton'
import { AdminThemeProvider } from '@/components/admin/ThemeProvider'
import { AdminThemeToggle } from '@/components/admin/ThemeToggle'
import { AdminTopNav } from '@/components/admin/AdminTopNav'

export const dynamic = 'force-dynamic'

export default async function AdminShellLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 인증 + role 체크 (admin_users 미등록이면 redirect)
  const profile = await requireAdminProfile()

  // 일상 메뉴 (모든 admin)
  const mainMenu = [
    { href: '/admin', label: '대시보드' },
    { href: '/admin/consultations', label: '상담' },
    { href: '/admin/dashboard/sales', label: '매출' },
    { href: '/admin/dashboard/paid-media', label: '광고' },
    { href: '/admin/content', label: '콘텐츠' },
    { href: '/admin/media', label: '미디어' },
  ]

  // 설정 드롭다운 (super_admin 전체 / 일부 role 은 필요한 정책 메뉴만)
  const canManageDbPolicy = ['super_admin', 'admin', 'marketing', 'tm_lead'].includes(profile.role)
  const canUseBlacklist = canManageBlocklist(profile.role)
  const settingsMenu = [
    ...(isSuperAdmin(profile.role)
      ? [
        { href: '/admin/users', label: '사용자 관리', desc: '계정 초대·권한 변경' },
        { href: '/admin/settings/permissions', label: '권한 매트릭스', desc: 'role × permission 토글' },
        { href: '/admin/settings/statuses', label: '상태 관리', desc: '상담 상태·자동화 플래그' },
        { href: '/admin/settings/consultation-options', label: '상담 옵션 관리', desc: '업종·지역·단말기·약정·통화시간 드롭다운' },
        { href: '/admin/settings/cta', label: 'CTA 관리', desc: '홈 버튼·utm 자동' },
        { href: '/admin/settings/products', label: '상품 관리', desc: '카탈로그·카테고리' },
        { href: '/admin/settings/product-sync', label: '상품 시트 sync', desc: '구글 시트 → products. 표준 한글 양식' },
        { href: '/admin/settings/distribution', label: 'DB 정책·분배', desc: '중복 기준·자동 배정' },
        { href: '/admin/settings/blacklist', label: '블랙리스트 관리', desc: '차단 연락처·IP 해제' },
        { href: '/admin/settings/ad-sync', label: '광고 sync', desc: '시트 → ad_metrics' },
        { href: '/admin/settings/head', label: '사이트 head 편집', desc: 'GTM·GA4·픽셀·verification·자유 HTML' },
        { href: '/admin/settings/seo', label: '페이지 SEO·OG', desc: '페이지별 메타·OG 이미지 업로드' },
        { href: '/admin/settings/slack', label: '슬랙 알림 설정', desc: '채널·Webhook·담당자 DM' },
        { href: '/admin/settings/alert-rules', label: '이상 시그널 룰', desc: 'CPA·ROAS·일신청 임계 알림' },
        { href: '/admin/help/utm', label: 'UTM 표준 가이드', desc: '광고대행사 핸드오프용' },
        { href: '/admin/help/tracking', label: '광고 추적 인프라', desc: 'GTM·GA4·픽셀·전환가치 세팅' },
      ]
      : []),
    ...(!isSuperAdmin(profile.role) && canManageDbPolicy
      ? [{ href: '/admin/settings/distribution', label: 'DB 정책·분배', desc: '중복 기준·자동 배정' }]
      : []),
    ...(!isSuperAdmin(profile.role) && canUseBlacklist
      ? [{ href: '/admin/settings/blacklist', label: '블랙리스트 관리', desc: '차단 연락처·IP 해제' }]
      : []),
  ]

  return (
    <AdminThemeProvider>
    <div
      data-admin-shell
      className="h-screen overflow-hidden bg-surface-dark text-ink-100 flex flex-col"
    >
      <header className="flex-none bg-ink-900 border-b border-ink-700 sticky top-0 z-50">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 min-h-14 py-2 flex items-center justify-between gap-3">
          {/*
            좌측 그룹 — 로고 + 메인 nav.
            overflow-hidden 은 nav 의 가로 스크롤 클리핑용으로 유지.
            SettingsDropdown 은 이 안에 두면 absolute 메뉴가 잘리므로
            우측 그룹으로 옮긴다.
          */}
          <div className="flex items-center gap-3 sm:gap-6 min-w-0 flex-1 overflow-hidden">
            <Link
              href="/admin"
              className="font-bold text-ink-100 flex items-center gap-2 whitespace-nowrap"
            >
              {/* 리브랜드 — 신규 OZ 심볼 (다크 헤더 위 흰 글자형) */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/ozlabpay-logo-symbol.png"
                alt="오즈랩페이"
                className="h-7 w-auto"
              />
              <span className="hidden md:inline text-sm">오즈랩페이</span>
            </Link>
            <AdminTopNav items={mainMenu} />
          </div>
          {/* 우측 그룹 — 설정 드롭다운(overflow 영향권 밖) + 테마 + 사용자 + 로그아웃 */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3 text-sm whitespace-nowrap">
            {settingsMenu.length > 0 && <SettingsDropdown items={settingsMenu} />}
            <AdminThemeToggle />
            <span className="hidden lg:flex items-center gap-1.5 text-ink-200">
              <span title={ROLE_LABELS[profile.role]}>{ROLE_EMOJI[profile.role]}</span>
              <span className="font-medium truncate max-w-[120px]">
                {profile.display_name ?? profile.email}
              </span>
              <span className="text-ink-600">·</span>
              <span className="text-ink-400">{ROLE_LABELS[profile.role]}</span>
            </span>
            <AdminSignOutButton />
          </div>
        </div>
      </header>
      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</div>
      </main>

      {/* 우하단 floating 도움말 버튼 */}
      <HelpFloatingButton />
    </div>
    </AdminThemeProvider>
  )
}
