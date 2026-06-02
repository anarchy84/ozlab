# 10. 파일 맵 — 디렉토리 구조 + 파일별 역할

## 0. 루트 구조

```
ozlab/
├── app/                          ─ Next.js App Router
│   ├── admin/                    ─ 어드민 (요청 흐름의 핵심)
│   ├── api/                      ─ API 라우트
│   ├── (그 외 랜딩 페이지들)
│   ├── layout.tsx
│   ├── icon.tsx                  ─ 파비콘 (동적 SVG → PNG)
│   ├── opengraph-image.tsx       ─ OG 이미지 (동적)
│   ├── manifest.ts
│   └── globals.css
├── lib/                          ─ 공통 모듈
│   ├── admin/                    ─ 어드민 전용 헬퍼
│   ├── supabase/                 ─ Supabase 클라이언트
│   ├── slack.ts
│   ├── seo.ts
│   └── ...
├── components/                   ─ 공통 컴포넌트
├── supabase/migrations/          ─ DB 마이그레이션 (시간 순)
├── docs/                         ─ 문서
│   ├── handoff/                  ─ ★ 이 인수인계 문서
│   ├── templates/                ─ 시트 양식 + 가이드
│   ├── PRODUCT_SYNC_GUIDE.md
│   ├── PHASE_E_PRD.md
│   ├── ADR_014_TRANSACTIONS_DATA_MODEL.md
│   ├── MARKETING_AUDIT.md
│   ├── UTM_NAMING_GUIDE.md
│   ├── wooripen_sheet_analysis.md
│   └── ...
├── public/                       ─ 정적 자산
│   ├── brand/                    ─ 로고 PNG 6종
│   └── templates/                ─ 옛 양식 (사용 안 함)
├── scripts/                      ─ 1회성 스크립트
│   └── migrate_wooripen_sheet.ts  ─ 우리편 시트 일괄 import
├── _design_reference/            ─ 디자인 참고 스크린샷
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── next.config.mjs
└── .env.example
```

## 1. `app/admin/` — 어드민

### 1.1 진입점

```
app/admin/
├── (shell)/                      ─ 셸 그룹 (헤더 + 사이드 메뉴)
│   ├── layout.tsx                ─ 셸 layout
│   ├── page.tsx                  ─ 대시보드 홈
│   │
│   ├── consultations/
│   │   ├── page.tsx              ─ 상담 목록 (메인)
│   │   ├── ConsultationsListClient.tsx
│   │   ├── ConsultationDetailModal.tsx
│   │   ├── RevenueModal.tsx
│   │   └── BulkActionBar.tsx
│   │
│   ├── dashboard/
│   │   ├── paid-media/           ─ 광고 퍼포먼스 ★
│   │   │   ├── page.tsx
│   │   │   └── PeriodControl.tsx
│   │   └── sales/                ─ 매출 코호트
│   │       ├── page.tsx
│   │       ├── PeriodControl.tsx
│   │       ├── CohortMatrix.tsx
│   │       └── CohortBreakdown.tsx
│   │
│   ├── content/
│   │   ├── page.tsx
│   │   ├── ContentManager.tsx
│   │   └── ContentEditor.tsx
│   │
│   ├── media/
│   │   ├── page.tsx
│   │   └── MediaLibrary.tsx
│   │
│   ├── users/
│   │   ├── page.tsx
│   │   └── UsersManager.tsx
│   │
│   └── settings/
│       ├── statuses/
│       │   ├── page.tsx
│       │   └── StatusesManager.tsx
│       ├── consultation-options/
│       │   ├── page.tsx
│       │   └── OptionsManager.tsx
│       ├── consultation-policy/
│       │   ├── page.tsx
│       │   └── ConsultationPolicyManager.tsx
│       ├── cta/
│       │   ├── page.tsx
│       │   ├── CtaManager.tsx
│       │   └── CtaWizardModal.tsx
│       ├── products/
│       │   ├── page.tsx
│       │   ├── ProductsManager.tsx
│       │   └── BulkUploadModal.tsx
│       ├── product-sync/         ─ 상품 시트 sync ★
│       │   ├── page.tsx
│       │   └── ProductSyncManager.tsx
│       ├── distribution/
│       │   ├── page.tsx
│       │   └── DistributionManager.tsx
│       ├── blacklist/
│       │   ├── page.tsx
│       │   └── BlacklistManager.tsx
│       ├── ad-sync/              ─ 광고 시트 sync ★
│       │   ├── page.tsx
│       │   └── AdSyncManager.tsx
│       ├── head/
│       │   ├── page.tsx
│       │   └── HeadSettingsForm.tsx
│       ├── seo/
│       │   ├── page.tsx
│       │   └── SeoSettingsClient.tsx
│       ├── slack/
│       │   ├── page.tsx
│       │   └── SlackSettingsClient.tsx
│       ├── alert-rules/
│       │   ├── page.tsx
│       │   └── AlertRulesClient.tsx
│       └── permissions/
│           ├── page.tsx
│           └── PermissionsMatrix.tsx
│
├── login/
│   └── page.tsx                  ─ Supabase Auth 로그인
│
└── help/
    ├── page.tsx
    ├── utm/page.tsx              ─ UTM 표준 가이드
    └── tracking/page.tsx         ─ 광고 추적 인프라
```

### 1.2 패턴

- `page.tsx` = Server Component, 데이터 fetch + role 체크 + 컴포넌트 렌더
- `*Manager.tsx` / `*Client.tsx` = Client Component, 인터랙션
- `*Modal.tsx` = 모달 (편집/매출 등)
- 폴더당 1 페이지 (Next.js App Router)

## 2. `app/api/` — API 라우트

### 2.1 어드민 API (admin/)

```
app/api/admin/
├── ad-sync/route.ts              ─ 광고 시트 sync ★
├── alert-rules/
│   ├── route.ts
│   └── [id]/
│       ├── route.ts
│       └── evaluate/route.ts
├── blacklist/route.ts
├── consultation-options/
│   ├── route.ts
│   └── [id]/route.ts
├── consultation-policy/route.ts
├── consultations/
│   ├── bulk/route.ts
│   ├── export/route.ts
│   └── [id]/
│       ├── route.ts
│       ├── block/route.ts
│       └── history/route.ts
├── content-blocks/
│   ├── route.ts
│   └── upload/route.ts
├── cta/
│   ├── route.ts
│   └── [id]/route.ts
├── distribution/
│   ├── route.ts
│   ├── redistribute/route.ts
│   └── users/[userId]/route.ts
├── landing-sections/route.ts
├── media/
│   ├── route.ts
│   └── [id]/route.ts
├── page-seo/route.ts
├── permissions/route.ts
├── posts/
│   ├── route.ts
│   └── [id]/route.ts
├── product-categories/
│   ├── route.ts
│   └── [id]/route.ts
├── products/                     ─ 상품 ★
│   ├── route.ts
│   ├── bulk/route.ts             ─ 한글 헤더 자동 인식
│   ├── sync/route.ts             ─ 시트 sync (Phase E 추가)
│   └── [id]/route.ts
├── revenue/
│   ├── route.ts
│   ├── export/route.ts
│   └── [id]/route.ts
├── settings/
│   └── head/route.ts
├── slack/
│   ├── channels/
│   │   ├── route.ts
│   │   └── [id]/route.ts
│   └── test/route.ts
├── statuses/
│   ├── route.ts
│   └── [id]/route.ts
└── users/
    ├── route.ts
    ├── invite/route.ts
    └── [id]/
        ├── route.ts
        ├── reset-password/route.ts
        └── transfer/route.ts
```

### 2.2 Public API

```
app/api/
├── consultation-options/route.ts  ─ 옵션 fetch (사이트용)
├── consultations/route.ts         ─ 폼 제출 (anon)
└── cron/
    ├── alerts/route.ts            ─ Vercel Cron — 룰 평가
    └── daily-digest/route.ts      ─ Vercel Cron — 일일 요약
```

## 3. `lib/admin/` — 어드민 헬퍼

```
lib/admin/
├── auth-helpers.ts               ─ guardApi / requireAdminProfile
├── format-helpers.ts             ─ fmtInt / fmtMoney / fmtPercent
├── page-seo.ts                   ─ buildPageMetadata (페이지 메타 머지)
├── paid-media.ts                 ─ loadPaidMediaSummary ★ (광고 분석 핵심)
├── permissions.ts                ─ role × permission 매트릭스
├── permissions-check.ts          ─ 권한 체크 헬퍼
├── site-settings.ts              ─ site_settings 단일 row
└── types.ts                      ─ 공통 타입 정의
```

### 핵심: `lib/admin/paid-media.ts`

- `loadPaidMediaSummary(preset)` — paid-media 페이지의 데이터 어그리게이션
- 타입: `PaidMediaSummary`, `ChannelPerformanceRow`, `DailySeriesRow`, `CampaignRow`, `DbPurchaseRow`
- 헬퍼: `resolvePeriod`, `makeKey`, `fmtInt`, `fmtMoney`, `fmtPercent`, `fmtCpl`

## 4. `lib/supabase/`

```
lib/supabase/
├── admin.ts                      ─ createAdminClient (SERVICE_ROLE)
├── server.ts                     ─ createServerClient (쿠키)
└── browser.ts                    ─ createBrowserClient (anon)
```

## 5. `lib/` (기타)

```
lib/
├── slack.ts                      ─ sendToSlackChannel / broadcast
├── seo.ts                        ─ 공통 SEO 메타 + GTM ID
├── consultation-options.ts       ─ 5종 옵션 fetch + normalize + fallback
└── ...
```

## 6. `supabase/migrations/` — DB 마이그레이션 (28개)

시간 순 (파일명 = `YYYYMMDDhhmmss_name.sql`):

```
20260421000001_content_blocks.sql
20260428000001_consultations.sql
20260429000001_admin_phase_a.sql
20260429000002_admin_users_and_roles.sql
20260429000003_phase_a_security_hardening.sql
20260429000004_loosen_status_check.sql
20260429000005_cta_buttons.sql
20260430000001_media_and_posts_editor.sql
20260430000002_attribution_classification.sql       ★ utm 컬럼 + 분류 뷰
20260430000003_products_revenue_cohort.sql          ★ products + revenue + 코호트
20260430000004_phase2_through_6_skeleton.sql
20260430000005_security_hardening.sql
20260504000001_cta_form_builder.sql
20260511055531_distribution_member_availability.sql
20260511061959_distribution_weighted_tm_controls.sql
20260526024731_landing_section_builder.sql
20260526060000_transactions_v2.sql                  ★ ADR_014 거래 객체
20260526063000_products_extra_columns.sql           ★ vendor/commission/customer_price/device_cost
20260526070000_products_device_type_cost_tiers.sql  ★ 정찰제 7단가
20260526080000_consultation_field_options.sql
20260527000000_channel_mapping.sql                  ★ utm 정규화
20260527010000_ad_metrics_lead_qty.sql              ★ lead_qty + source
20260527020000_ad_metrics_service_not_null.sql
20260527030000_ad_sync_config_paid.sql              ★ 페이드 시트 컬럼
20260527040000_sheet_channel_alias.sql              ★ 시트 매체값 정규화
20260527050000_ad_metrics_site.sql                  ★ site 컬럼 (멀티사이트)
20260527060000_product_sync_config.sql              ★ 상품 시트 sync 설정
20260601014746_fix_consultation_auto_distribution.sql
```

> 상세 변경사항: `03_DB_SCHEMA.md` § 마이그레이션 이력.

## 7. `docs/` — 문서

```
docs/
├── handoff/                          ─ ★ 이 인수인계 문서 (12개)
│   ├── 00_INDEX.md
│   ├── 01_PROJECT_OVERVIEW.md
│   ├── 02_INFRA.md
│   ├── 03_DB_SCHEMA.md
│   ├── 04_ADMIN_UI.md
│   ├── 05_API_ROUTES.md
│   ├── 06_DATA_FLOWS.md
│   ├── 07_DESIGN_SYSTEM.md
│   ├── 08_OPEN_ISSUES.md
│   ├── 09_NEXT_STEPS.md
│   ├── 10_FILES_MAP.md
│   └── 11_DECISIONS.md
├── templates/                        ─ 시트 양식
│   ├── 오즈랩_상품_마스터_시트_v1.xlsx
│   ├── 오즈랩_상품_마스터_시트_v1.csv
│   └── 상품_마스터_시트_사용법_체크리스트.md   ─ 60대 친화
├── PRODUCT_SYNC_GUIDE.md             ─ 담당자용 시트 sync 가이드
├── PHASE_E_PRD.md                    ─ 멀티사이트 PRD
├── ADR_014_TRANSACTIONS_DATA_MODEL.md
├── ADMIN_DASHBOARD_REVENUE_SUMMARY_HANDOFF.md
├── ADMIN_USER_MANUAL.md
├── PHASE_A_PRD.md
├── PHASE_A2_PRD.md
├── MARKETING_AUDIT.md
├── UTM_NAMING_GUIDE.md
├── DEV_HANDOFF_2026_06_02.md
├── wooripen_sheet_analysis.md
└── operation-guide-v1.html
```

## 8. `scripts/` — 1회성

```
scripts/
└── migrate_wooripen_sheet.ts         ─ 우리편 시트 4-5월 → ad_metrics 일괄 import
```

> 실행 안 해도 됨 — 이미 prod 적용 완료.

## 9. `public/`

```
public/
├── brand/                            ─ 로고 6종
│   ├── oz-labpay-horizontal.png
│   ├── oz-labpay-horizontal-white.png
│   ├── oz-labpay-vertical.png
│   ├── oz-labpay-vertical-white.png
│   ├── oz-symbol.png
│   └── oz-symbol-white.png
├── templates/                        ─ 옛 양식 (사용 안 함, 잔재)
│   ├── products_template_ko_v0.2.xlsx
│   └── products_template_ko_v0.3.xlsx
├── favicon.ico
├── robots.txt
└── ...
```

## 10. `components/`

랜딩 페이지 / 어드민 공용 컴포넌트.

```
components/
├── AdminThemeProvider.tsx           ─ 어드민 다크 테마 컨텍스트
├── (그 외 랜딩 컴포넌트들)
└── ...
```

## 11. 루트 설정 파일

| 파일 | 역할 |
|---|---|
| `package.json` | 의존성 + scripts |
| `tsconfig.json` | TypeScript 설정 |
| `tailwind.config.ts` | 디자인 토큰 (brand 컬러, fontFamily 등) |
| `next.config.mjs` | Next.js 설정 |
| `postcss.config.mjs` | Tailwind 처리 |
| `vercel.json` | (필요 시 Cron 정의) |
| `.env.example` | 환경변수 템플릿 |
| `.gitignore` | git 제외 (`.env.local`, `_design_reference/` 추가 권장) |

## 12. 파일 변경 영향도 (자주 건드리는 파일)

| 파일 | 변경 시 영향 |
|---|---|
| `app/admin/(shell)/layout.tsx` | 모든 어드민 페이지의 메뉴 변경 |
| `lib/admin/paid-media.ts` | paid-media 페이지의 KPI 계산 |
| `lib/admin/auth-helpers.ts` | 모든 어드민 API + 페이지 인증 |
| `app/api/admin/products/bulk/route.ts` | 상품 sync + bulk 업로드 둘 다 |
| `app/api/admin/ad-sync/route.ts` | 광고 sync 동작 |
| `tailwind.config.ts` | 전체 디자인 톤 |
| `supabase/migrations/*` | DB 스키마 — 변경 시 prod apply 별도 |

## 13. 다음 문서로

- 의사결정 기록 → `11_DECISIONS.md` (마지막)
