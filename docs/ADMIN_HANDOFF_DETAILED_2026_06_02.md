# 오즈랩페이 어드민 상세 인수인계

- 작성일: 2026-06-02
- 대상: `/admin`, `/api/admin/*`, 어드민 관련 DB/RLS/운영 UX
- 기준 레포: `/Users/anarchy/Claud_Projects/ozlab`

이 문서는 오즈랩페이 어드민을 개발팀이 이어받기 위한 상세 설명이다. 현재 어드민은 단순 관리자 페이지가 아니라 상담 CRM, 마케팅 데이터, 매출 데이터, 콘텐츠 CMS, 사이트 설정, 분배 정책, 블랙리스트, 상품/시트 sync가 결합된 운영 백오피스다.

---

## 1. 어드민 전체 구조

### 기술 구조

- Next.js App Router의 서버 컴포넌트 + 클라이언트 컴포넌트 혼합 구조.
- `/admin/(shell)/layout.tsx`가 인증, role 확인, 상단 메뉴, theme provider를 담당.
- 서버 페이지에서 Supabase SSR client로 초기 데이터 조회.
- 클라이언트 컴포넌트는 `/api/admin/*` route를 fetch해서 mutation 처리.
- API route는 `guardApi()`로 인증/role 검증.
- 일부 민감 데이터/관리 기능은 `createAdminClient()` service role 사용.

### 핵심 파일

- `app/admin/login/page.tsx`
- `app/admin/layout.tsx`
- `app/admin/(shell)/layout.tsx`
- `lib/admin/auth-helpers.ts`
- `lib/admin/types.ts`
- `lib/admin/permissions.ts`
- `lib/admin/permissions-check.ts`
- `components/admin/AdminTopNav.tsx`
- `components/admin/SettingsDropdown.tsx`
- `components/admin/ThemeProvider.tsx`
- `components/admin/ThemeToggle.tsx`

---

## 2. 인증과 권한

### 로그인 흐름

1. 사용자가 `/admin/login` 접속.
2. Supabase Auth로 email/password 로그인.
3. `/admin` 진입 시 `requireAdminProfile()` 실행.
4. `get_my_admin_profile()` RPC로 현재 사용자가 `admin_users`에 등록되어 있는지 확인.
5. 프로필이 없거나 비활성이라면 `/admin/login?error=no_access`.
6. 프로필이 있으면 role 기준으로 메뉴와 화면 권한을 분기.

### 서버 헬퍼

- `getMyAdminProfile()`
  - Supabase auth user 확인.
  - RPC `get_my_admin_profile()` 호출.
  - 실패 시 `null`.

- `requireAdminProfile()`
  - 모든 어드민 페이지 기본 gate.

- `requireSuperAdmin()`
  - super_admin 전용 페이지.

- `requireAdminOrAbove()`
  - super_admin/admin 전용 페이지.

- `guardApi(allowedRoles?)`
  - API route용.
  - 비로그인: 401.
  - role 불일치: 403.

### Role

신규 role:

- `super_admin`: 전체 관리자.
- `marketing`: 마케팅팀.
- `tm_lead`: TM 실장.
- `counselor`: 상담사.
- `it_ops`: 전산관리자.

레거시 role:

- `admin`
- `marketer`
- `viewer`

### Permission code

권한 매트릭스에서 쓰는 주요 코드:

- `consultations.view`
- `consultations.edit`
- `consultations.delete`
- `consultations.distribute`
- `consultations.attribution`
- `consultations.blacklist`
- `revenue.view`
- `revenue.edit`
- `revenue.delete`
- `products.view`
- `products.edit`
- `ad_metrics.view`
- `ad_metrics.edit`
- `cta.edit`
- `content.view`
- `content.edit`
- `content.publish`
- `media.upload`
- `inline_edit`
- `users.invite`
- `users.assign_role`
- `statuses.edit`
- `settings.advanced`

### 권한 테이블

- `admin_users`
- `app_roles`
- `app_permissions`
- `role_permissions`

주의:

- 현재 일부 route는 permission matrix가 아니라 role 배열로 직접 guard한다.
- 장기적으로 `hasPermission()` 기반으로 통일하는 것이 좋다.
- UI에서 버튼을 숨기는 것과 API 권한은 별개다. API guard를 반드시 유지해야 한다.

---

## 3. 상단 메뉴와 설정 드롭다운

### 메인 메뉴

- `/admin`: 대시보드
- `/admin/consultations`: 상담
- `/admin/dashboard/sales`: 매출
- `/admin/dashboard/paid-media`: 광고
- `/admin/content`: 콘텐츠
- `/admin/media`: 미디어

### 설정 메뉴

super_admin 전체 노출:

- `/admin/users`: 사용자 관리
- `/admin/settings/permissions`: 권한 매트릭스
- `/admin/settings/statuses`: 상태 관리
- `/admin/settings/consultation-options`: 상담 옵션 관리
- `/admin/settings/cta`: CTA 관리
- `/admin/settings/products`: 상품 관리
- `/admin/settings/product-sync`: 상품 시트 sync
- `/admin/settings/distribution`: DB 정책·분배
- `/admin/settings/blacklist`: 블랙리스트 관리
- `/admin/settings/ad-sync`: 광고 sync
- `/admin/settings/head`: 사이트 head 편집
- `/admin/settings/seo`: 페이지 SEO·OG
- `/admin/settings/slack`: 슬랙 알림 설정
- `/admin/settings/alert-rules`: 이상 시그널 룰
- `/admin/help/utm`: UTM 표준 가이드
- `/admin/help/tracking`: 광고 추적 인프라

일부 role 노출:

- `super_admin`, `admin`, `marketing`, `tm_lead`: DB 정책·분배.
- `super_admin`, `admin`: 블랙리스트 관리.

UX 주의:

- SettingsDropdown은 header 좌측 overflow 영역 안에 두면 메뉴가 잘린다.
- 현재 페이지가 설정 하위 페이지이면 설정 메뉴 자체도 활성 표시되어야 한다.
- 모바일/좁은 화면에서 상단 메뉴가 넘치므로 nav는 가로 스크롤/축약 표시를 유지해야 한다.

---

## 4. 다크/화이트 모드

### 구조

- `components/admin/ThemeProvider.tsx`
- `components/admin/ThemeToggle.tsx`
- localStorage key: `admin-theme`
- HTML class: `dark` 또는 `light`
- scope: `data-admin-shell`

### 라이트모드 이슈

기존 어드민 UI는 다크모드 기준 class가 많았다.

예:

- `bg-ink-900`
- `text-ink-400`
- `text-blue-300`
- `bg-blue-500/10`
- `border-ink-700`

이 class들이 흰 배경에서 너무 흐리게 보여 상담 목록/대시보드/설정 페이지 가독성이 떨어졌다.

### 현재 대응

- `app/globals.css`에 `html.light [data-admin-shell]` 보정 레이어 추가.
- 배경, 텍스트, border, hover, badge, table, modal, form control 색을 light mode에서 재매핑.

개발 기준:

- 신규 어드민 컴포넌트는 다크/라이트 둘 다 확인한다.
- 색 대비 문제는 컴포넌트마다 땜질하기보다 `data-admin-shell` 범위 token과 공통 class를 먼저 확인한다.
- 표, 상태 badge, input/select, modal, card, graph는 필수 QA 대상이다.

---

## 5. 대시보드 `/admin`

파일:

- `app/admin/(shell)/page.tsx`

데이터:

- `v_consultation_funnel`
- `v_consultation_by_channel`
- `db_statuses`
- `consultations`
- `revenue_records`
- `ad_metrics`
- `admin_users`

기능:

- 조회 기간 필터.
- 기간 미지정 시 KST 오늘.
- 시작일/종료일 역전 시 자동 보정.
- 이전 기간 비교.
- 정렬: 매출액순, 건수순, 이름순.
- 전체 매출액.
- 광고비 소진액.
- 미수금 영역.
- 상담사별 실적 선그래프.
- 상품별 실적 선그래프.
- 상태별 신청 카드.
- 최근 신청.

역할별 카드:

- `super_admin`, `marketing`, `tm_lead`, `admin`, `marketer`
  - 전체 매출액
  - 광고비 소진액
  - 미수금
  - 미수금 내역

- `counselor`
  - 내 매출액
  - 내 인센티브 포인트
  - 내 미수금
  - 내 미수금 내역

현재 placeholder:

- 미수금 실제 데이터
- 상담사 인센티브 포인트

관련 문서:

- `docs/ADMIN_DASHBOARD_REVENUE_SUMMARY_HANDOFF.md`
- `docs/ADR_014_TRANSACTIONS_DATA_MODEL.md`

주의:

- CTA별 성과는 제거된 기능이다.
- 광고비와 매출을 같은 기간으로 비교하되, 데이터 발생 기준일이 다른 점을 운영자가 이해해야 한다.
- counselor 개인 지표는 반드시 로그인한 `profile.user_id` 기준으로 필터링해야 한다.

---

## 6. 상담 신청 목록 `/admin/consultations`

파일:

- `app/admin/(shell)/consultations/page.tsx`
- `app/admin/(shell)/consultations/ConsultationsListClient.tsx`
- `app/admin/(shell)/consultations/ConsultationDetailModal.tsx`
- `app/admin/(shell)/consultations/BulkActionBar.tsx`
- `app/admin/(shell)/consultations/RevenueModal.tsx`

데이터:

- `consultations`
- `db_statuses`
- `admin_users`
- `consultation_status_history`
- `consultation_messages`
- `revenue_records`

목록 기능:

- 페이지네이션: 30건.
- 검색: 이름, 연락처, 매장명, 내부 메모.
- 기간 preset: 오늘, 최근 7일, 이번 달, 지난 달, 최근 3개월.
- 직접 날짜 필터.
- 상태 필터: `db_statuses` 기반.
- 매체 필터: `utm_source` 기반.
- 상담사 표시.
- 유입 출처 펼침.
- 즐겨찾기/블랙리스트 표시.
- 행 클릭 상세 모달.
- 일괄 처리.
- CSV export.

상세 모달:

- 이전/다음 DB 이동.
- 즐겨찾기.
- 블랙리스트 등록/해제.
- 유입 출처 확인.
- DB 정보 확인.
- 고객이 남긴 정보 확인/수정.
- 내부 상담 메모.
- 상태 변경.
- 담당자 변경.
- 매출 등록.
- 상태 이력.
- 메시지 이력.

고객 정보 수정 UX:

- 기본값은 read-only.
- 수정 버튼을 눌렀을 때만 input/select 활성화.
- 저장/취소가 명확해야 한다.
- 업종/지역은 홈페이지 폼과 같은 `consultation_field_options`를 사용.

API:

- `PATCH /api/admin/consultations/[id]`
- `GET /api/admin/consultations/[id]/history`
- `POST /api/admin/consultations/[id]/block`
- `DELETE /api/admin/consultations/[id]/block`
- `POST /api/admin/consultations/bulk`
- `GET /api/admin/consultations/export`
- `GET/POST /api/admin/revenue`
- `PATCH/DELETE /api/admin/revenue/[id]`

주의:

- `status_id`를 바꾸면 legacy `status` text도 같이 동기화한다.
- 상태 변경은 `consultation_status_history`에 기록한다.
- 상담사 role은 본인 배정 건만 수정 가능하도록 추가 검증을 강화할 여지가 있다.
- export는 개인정보가 포함되므로 권한 세분화 필요성이 있다.

---

## 7. 상태 관리 `/admin/settings/statuses`

권한:

- super_admin

파일:

- `app/admin/(shell)/settings/statuses/page.tsx`
- `app/admin/(shell)/settings/statuses/StatusesManager.tsx`
- `app/api/admin/statuses/route.ts`
- `app/api/admin/statuses/[id]/route.ts`

테이블:

- `db_statuses`

관리 항목:

- code
- label
- sort_order
- bg_color
- text_color
- send_message
- is_promising
- force_recall
- is_conversion
- is_unapproved
- needs_counselor_confirm
- in_progress
- cannot_proceed
- include_in_gcl
- show_in_dashboard
- message_template_code
- is_active

요청된 상태별 신청 카드 정렬:

- 상단: 부재1 -> 부재2 -> 부재3 -> 부재4 -> 부재5+ -> 재통화대기
- 하단: 신규 -> 가망 -> 연락중 -> 상담중 -> 개통 완료

주의:

- 사용 중인 status 삭제는 막아야 한다.
- 대시보드 표시는 `show_in_dashboard`.
- 개통 완료 집계는 `is_conversion`.

---

## 8. DB 정책·분배 `/admin/settings/distribution`

권한:

- `super_admin`
- `marketing`
- `tm_lead`
- `admin`

파일:

- `app/admin/(shell)/settings/distribution/page.tsx`
- `app/admin/(shell)/settings/distribution/DistributionManager.tsx`
- `app/admin/(shell)/settings/consultation-policy/ConsultationPolicyManager.tsx`
- `app/api/admin/distribution/route.ts`
- `app/api/admin/distribution/users/[userId]/route.ts`
- `app/api/admin/distribution/redistribute/route.ts`
- `app/api/admin/consultation-policy/route.ts`

기능:

- 중복 DB 인정기간 관리.
- 전체 자동분배 ON/OFF.
- 상담사별 분배 ON/OFF.
- 상담사별 0.5x/1x/2x 배수.
- 미배정 DB 재분배.
- 특정 상담사 DB 전체 회수 후 재분배.
- 특정 상담사 특정 상태 DB만 회수 후 재분배.

중복 DB 정책:

- 기준: 연락처.
- 저장 위치: `content_blocks`.
- block key: `admin.consultation_policy.duplicate_phone_window_days`.
- 기본값: 30일.
- 입력 범위: 1~365일.

자동분배 대상:

- `tm_lead`
- `counselor`

자동분배 조건:

- `is_active = true`
- `distribution_enabled = true`
- 전체 rule enabled
- role이 대상 role

배수:

- `0.5`: 50% 적게 배정.
- `1.0`: 기본.
- `2.0`: 2배 많이 배정.

관련 migration:

- `supabase/migrations/20260511061959_distribution_weighted_tm_controls.sql`
- `supabase/migrations/20260601014746_fix_consultation_auto_distribution.sql`

중요:

- `20260601014746_fix_consultation_auto_distribution.sql`는 현재 로컬에서 untracked 상태다.
- 자동분배가 실제로 안 되는 문제가 있었으므로 이 migration의 커밋/적용 여부를 반드시 확인해야 한다.
- 상담사를 OFF하면 신규 분배에서 제외된다. 이미 배정된 DB는 자동 회수되지 않으므로 회수/재분배를 별도 실행해야 한다.

---

## 9. 블랙리스트 `/admin/settings/blacklist`

권한:

- `super_admin`
- `admin`

파일:

- `app/admin/(shell)/settings/blacklist/page.tsx`
- `app/admin/(shell)/settings/blacklist/BlacklistManager.tsx`
- `app/api/admin/blacklist/route.ts`
- `app/api/admin/consultations/[id]/block/route.ts`

테이블:

- `abuse_blocklist`

차단 타입:

- phone
- ip

기능:

- 블랙리스트 목록.
- 수동 등록.
- 상담 상세 모달에서 차단.
- 해제.
- source consultation 연결.
- hit count 확인.

접수 API와 관계:

- `/api/consultations`가 insert 전에 `abuse_blocklist` 확인.
- 차단 번호/IP면 DB 등록하지 않는다.

주의:

- 전화번호는 정규화해서 비교.
- IP는 Cloudflare/Vercel proxy 환경에서 header 기준 확인 필요.
- 차단 해제 시 관련 상담 건의 `is_blacklisted` sync를 확인해야 한다.

---

## 10. 상담 옵션 `/admin/settings/consultation-options`

권한:

- `super_admin`
- `admin`

파일:

- `app/admin/(shell)/settings/consultation-options/page.tsx`
- `app/admin/(shell)/settings/consultation-options/OptionsManager.tsx`
- `app/api/admin/consultation-options/route.ts`
- `app/api/admin/consultation-options/[id]/route.ts`
- `app/api/consultation-options/route.ts`

테이블:

- `consultation_field_options`

필드:

- 업종
- 지역
- 단말기
- 약정
- 통화 가능 시간

사용 위치:

- 퍼블릭 상담 폼.
- CTA 모달 폼.
- 상담 상세 모달.
- CTA Wizard 기본 form field.

주의:

- 퍼블릭과 어드민 옵션이 달라지면 상담사 혼란과 데이터 정규화 문제가 생긴다.
- 옵션 삭제보다는 비활성화를 우선 고려한다.

---

## 11. CTA 관리 `/admin/settings/cta`

권한:

- super_admin

파일:

- `app/admin/(shell)/settings/cta/page.tsx`
- `app/admin/(shell)/settings/cta/CtaManager.tsx`
- `app/admin/(shell)/settings/cta/CtaWizardModal.tsx`
- `app/api/admin/cta/route.ts`
- `app/api/admin/cta/[id]/route.ts`
- `components/cta/DynamicCTA.tsx`
- `components/cta/CtaModalForm.tsx`

테이블:

- `cta_buttons`

placement:

- nav
- hero
- showcase
- promotion
- floating
- footer
- pricing
- features
- mechanism
- review
- custom

type:

- inline_anchor
- inline_form
- modal_form
- floating_button
- sticky_bar
- toast

데이터 처리:

- CTA 클릭 시 attribution 저장.
- CTA form 제출 시 `consultations`에 CTA campaign/keyword/placement가 같이 저장된다.
- 외부 URL/전화/카톡 CTA는 form CTA와 추적 방식이 다를 수 있다.

주의:

- 땡큐페이지 전화/카톡 링크는 `lib/contact.ts` 공통값을 따른다.
- CTA 성과 표는 대시보드에서 제거된 상태다.

---

## 12. 콘텐츠 `/admin/content`

권한:

- 쓰기: `super_admin`, `admin`, `marketer` 중심.
- 삭제: `super_admin`, `admin` 중심.

파일:

- `app/admin/(shell)/content/page.tsx`
- `app/admin/(shell)/content/ContentManager.tsx`
- `app/admin/(shell)/content/ContentEditor.tsx`
- `app/api/admin/posts/route.ts`
- `app/api/admin/posts/[id]/route.ts`

목적:

- 꿀팁/블로그 게시판 운영.
- SEO long-tail 키워드 콘텐츠 축적.

에디터 요구:

- Enter는 줄바꿈 중심.
- H2/H3는 현재 커서 단락에만 적용.
- 정렬: left/center/right/justify.
- 툴바 sticky.
- 기본 폰트는 너무 작지 않게.

주의:

- heading 구조는 SEO에 영향을 준다.
- 마케터가 이미지 alt를 비워두지 않도록 UX 보완 권장.

---

## 13. 미디어 `/admin/media`

권한:

- `super_admin`
- `admin`
- `marketer`

파일:

- `app/admin/(shell)/media/page.tsx`
- `app/admin/(shell)/media/MediaLibrary.tsx`
- `app/api/admin/media/route.ts`
- `app/api/admin/media/[id]/route.ts`

기능:

- 이미지 업로드.
- 미디어 목록.
- URL 복사.
- 파일 삭제.
- 전체 비움은 super_admin.

주의:

- 업로드 이미지는 WebP 최적화.
- 5MB 이하 권장.
- 이미지 교체가 SEO/접근성에 미치는 alt 관리 필요.

---

## 14. 사이트 head `/admin/settings/head`

권한:

- super_admin

파일:

- `app/admin/(shell)/settings/head/page.tsx`
- `app/admin/(shell)/settings/head/HeadSettingsForm.tsx`
- `app/api/admin/settings/head/route.ts`
- `lib/admin/site-settings.ts`
- `app/layout.tsx`

테이블:

- `site_settings`

관리 항목:

- GTM ID
- GA4 measurement ID
- Meta Pixel ID
- Google site verification
- Naver site verification
- custom head HTML

중요 처리:

- 검색엔진이 제공한 meta tag 전체를 붙여넣어도 동작해야 한다.
- token만 입력해도 동작해야 한다.
- DB `value`가 NOT NULL이면 빈 값은 `null`이 아니라 `''`로 저장해야 한다.

과거 오류:

```text
null value in column "value" of relation "site_settings" violates not-null constraint
```

주의:

- custom HTML/script는 XSS 위험이 있으므로 super_admin만 허용.
- 저장 후 실제 public `<head>` 출력 확인.
- Search Console/Search Advisor 인증 실패 시 meta 출력, canonical, robots, 배포 도메인을 순서대로 확인.

---

## 15. SEO `/admin/settings/seo`

권한:

- super_admin

파일:

- `app/admin/(shell)/settings/seo/page.tsx`
- `app/admin/(shell)/settings/seo/SeoSettingsClient.tsx`
- `app/api/admin/page-seo/route.ts`
- `lib/admin/page-seo.ts`
- `lib/seo.ts`

기능:

- 페이지별 title.
- description.
- keywords.
- canonical/path.
- OG 이미지.

SEO 방향:

- 메인 키워드는 서비스 랜딩에서 처리.
- 세부 키워드는 꿀팁 콘텐츠에서 처리.
- FAQ schema는 주요 페이지마다 확장 권장.

주요 키워드:

- 네이버 카드 단말기
- 네이버 카드 결제기
- 네이버포스기
- 네이버포스
- 네이버 pos
- 포스기
- 포스단말기
- 결제포스
- 결제포스기
- 애플페이포스기
- 애플페이결제단말기

---

## 16. 상품 관리와 상품 Sync

상품 관리:

- `/admin/settings/products`
- `ProductsManager.tsx`
- `BulkUploadModal.tsx`
- `app/api/admin/products/*`
- `app/api/admin/product-categories/*`

상품 Sync:

- `/admin/settings/product-sync`
- `ProductSyncManager.tsx`
- `app/api/admin/products/sync/route.ts`

권한:

- products: `super_admin`, `admin`, `marketer`
- product-sync: `super_admin`, `admin`, `marketer`, `marketing`

기능:

- 상품 카탈로그.
- 카테고리.
- CSV/XLSX bulk 업로드.
- 구글 시트 URL 저장.
- dry run.
- 실제 sync.
- 한글 시트 템플릿 인식.

관련 문서:

- `docs/PRODUCT_SYNC_GUIDE.md`
- `docs/templates/오즈랩_상품_마스터_시트_v1.csv`
- `docs/templates/오즈랩_상품_마스터_시트_v1.xlsx`

주의:

- 시트 양식 변경 시 parser/API/문서를 같이 갱신.
- 인터넷/POS/CCTV/키오스크/테오 통합 양식이므로 field 의미를 운영팀과 확인해야 한다.

---

## 17. 광고 대시보드와 광고 Sync

광고 대시보드:

- `/admin/dashboard/paid-media`
- `lib/admin/paid-media.ts`
- `ad_metrics`
- `consultations`
- `revenue_records`

광고 Sync:

- `/admin/settings/ad-sync`
- `AdSyncManager.tsx`
- `app/api/admin/ad-sync/route.ts`

권한:

- paid-media: `super_admin`, `marketing`, `tm_lead`, `admin`, `marketer`
- ad-sync: `super_admin`, `marketing`, `admin`

개념:

- 광고 플랫폼 리드와 CRM 도착 리드를 분리.
- DB 매입과 paid media를 분리.
- `ad_metrics.conversions`는 광고 플랫폼 보고 전환.
- `consultations`는 CRM 실제 접수.
- 이 둘은 다를 수 있다.

Sync:

- DB 매입 시트.
- 페이드 미디어 시트.
- upsert key: `(site, date, channel, service)`.
- Slack 알림 연동.

주의:

- `site` 컬럼으로 오즈랩/우리편 등 멀티 사이트 구분.
- unmapped channel은 UTM/channel mapping 보정 필요.

---

## 18. 매출 대시보드와 매출 API

매출 대시보드:

- `/admin/dashboard/sales`
- `CohortBreakdown.tsx`
- `CohortMatrix.tsx`

매출 API:

- `app/api/admin/revenue/route.ts`
- `app/api/admin/revenue/[id]/route.ts`
- `app/api/admin/revenue/export/route.ts`

테이블:

- `revenue_records`
- `consultations`

기능:

- 상담 건별 매출 등록.
- 수정.
- 삭제.
- export.
- dashboard 집계.
- 광고 ROAS와 연결.

권한:

- 생성: `super_admin`, `admin`, `marketer`, `counselor`.
- 삭제: `super_admin`, `admin`.
- export: `super_admin`, `marketing`, `tm_lead`, `admin`, `marketer`.

주의:

- counselor가 본인 건만 등록 가능한지 추가 검증 필요.
- 매출 수정/삭제 audit trail 보강 권장.
- 장기 데이터 모델은 `docs/ADR_014_TRANSACTIONS_DATA_MODEL.md` 참고.

---

## 19. 사용자 관리 `/admin/users`

권한:

- super_admin

파일:

- `app/admin/(shell)/users/page.tsx`
- `app/admin/(shell)/users/UsersManager.tsx`
- `app/api/admin/users/route.ts`
- `app/api/admin/users/[id]/route.ts`
- `app/api/admin/users/invite/route.ts`
- `app/api/admin/users/[id]/reset-password/route.ts`
- `app/api/admin/users/[id]/transfer/route.ts`

기능:

- 사용자 목록.
- 계정 초대.
- role 변경.
- 활성/비활성.
- 비밀번호 재설정.
- 퇴사자 상담 이관.

보호 로직:

- 본인 강등 차단.
- 마지막 활성 super_admin 강등/비활성/삭제 차단.

운영 방식:

- 이메일 자동 발송이 아니라 임시 비밀번호를 화면에 보여주고 슬랙/카톡으로 직접 전달.
- 평문 비밀번호를 DB에 저장하면 안 된다.

---

## 20. Slack과 이상 시그널

Slack:

- `/admin/settings/slack`
- `SlackSettingsClient.tsx`
- `app/api/admin/slack/*`
- `lib/slack.ts`

권한:

- super_admin

기능:

- 채널 등록.
- 테스트 발송.
- 사용자 Slack ID 매핑.
- DM 활성 여부.

이상 시그널:

- `/admin/settings/alert-rules`
- `AlertRulesClient.tsx`
- `app/api/admin/alert-rules/*`
- `lib/alerts/evaluator.ts`

권한:

- `super_admin`
- `marketing`

기능:

- CPA/ROAS/일 신청 수 등 임계 룰.
- 수동 평가.
- Slack 알림.

주의:

- Slack 채널 등록이 먼저 되어 있어야 알림이 간다.
- 광고/매출 데이터 품질이 룰 결과에 직접 영향을 준다.

---

## 21. 도움말 `/admin/help`

파일:

- `app/admin/help/page.tsx`
- `app/admin/help/utm/page.tsx`
- `app/admin/help/tracking/page.tsx`

기능:

- UTM 표준 가이드.
- 광고 추적 인프라 설명.
- 대행사/운영팀 전달용 내부 가이드.

주의:

- 현재 admin 인증 필요.
- 외부 공유용 문서가 필요하면 별도 public 문서/PDF로 분리해야 한다.

---

## 22. 개인정보/보안 주의사항

어드민에는 다음 개인정보/민감정보가 있다.

- 고객명.
- 연락처.
- 매장명.
- IP.
- user agent.
- 상담 메모.
- 통화 가능 시간.
- 매출/정산 정보.
- 광고 성과/비용.

개발 원칙:

- 개인정보를 console log에 남기지 않는다.
- CSV export 권한을 최소화한다.
- 고객 원본 정보 수정은 audit trail 보강이 필요하다.
- service role client는 서버 전용 파일에서만 사용한다.
- custom head HTML은 XSS 위험이 있으므로 super_admin만 허용한다.
- 블랙리스트/중복 DB는 연락처 정규화 기준을 유지한다.

---

## 23. 어드민 QA 체크리스트

### 인증/권한

- 비로그인 `/admin` redirect.
- admin_users 미등록 계정 no_access.
- role별 메뉴 노출.
- super_admin 전용 페이지 차단.
- API 401/403 정상.

### 테마

- 다크모드 상담 목록.
- 라이트모드 상담 목록.
- 모달/input/select/배지/그래프 대비.
- 설정 메뉴 활성 표시.

### 상담

- 신규 DB 접수 후 목록 표시.
- 검색/상태/매체/기간 필터.
- 상세 모달 열기.
- 이전/다음 이동.
- 고객 정보 수정/취소/저장.
- 업종/지역 옵션 동일성.
- 상태 변경과 이력 저장.
- 내부 메모 저장.
- 매출 등록.
- CSV export.

### DB 정책/분배

- 중복 기간 변경.
- 신규 접수 중복 차단.
- 전체 자동분배 OFF.
- 상담사 OFF.
- 0.5x/1x/2x 장기 분배.
- 특정 상담사 전체 회수/재분배.
- 특정 상태만 회수/재분배.

### 블랙리스트

- 상세 모달에서 차단.
- 블랙리스트 페이지에서 해제.
- 차단 연락처 재접수 방지.
- 차단 IP 재접수 방지.

### 콘텐츠/미디어

- 게시글 저장.
- H2/H3 현재 단락만 적용.
- 정렬 4종.
- 툴바 sticky.
- 이미지 업로드/삭제.
- 인라인 편집 public 반영.

### SEO/head

- GTM script 출력.
- GA4/Meta Pixel 출력.
- Google/Naver verification meta 출력.
- 전체 meta tag 붙여넣기 처리.
- null 저장 오류 재발 없음.

### 대시보드

- 기간 기본값 오늘.
- 이전기간 비교.
- 상담사별 그래프.
- 상품별 그래프.
- 미수금 placeholder.
- 라이트모드 가독성.

---

## 24. 개발팀이 우선 확인할 리스크

1. 자동분배 수정 migration 적용 여부.
   - `supabase/migrations/20260601014746_fix_consultation_auto_distribution.sql`
   - 현재 로컬 untracked 상태.

2. 라이트모드 전체 QA.
   - `app/globals.css` 보정은 넓은 범위라 예외 화면 확인 필요.

3. 고객 정보 수정 audit trail.
   - 현재 UX는 잠금/편집 구조지만 변경 이력 정책을 더 강화할 수 있다.

4. 매출/미수금/인센티브 실제 연결.
   - dashboard placeholder가 남아 있다.

5. permission matrix와 role array guard 일원화.
   - 현재 혼합 상태.

6. custom head HTML 보안.
   - super_admin만 유지.
   - 저장값 sanitization/출력 위치 재검토.

7. export 권한 세분화.
   - 개인정보 CSV export는 추후 별도 permission으로 빼는 것이 좋다.
