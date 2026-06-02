# 오즈랩페이 개발팀 인수인계 문서

- 작성일: 2026-06-02
- 레포: `/Users/anarchy/Claud_Projects/ozlab`
- GitHub: `anarchy84/ozlab`
- 기준 브랜치: `main`
- 기준 원격 HEAD: `95645c2 Add privacy policy PDF link`

이 문서는 5월 이후 오즈랩페이 홈페이지와 어드민에 누적된 작업, 데이터 처리 흐름, UI/UX 기준, 운영 주의사항을 개발팀에 전달하기 위한 최신 요약본이다.

어드민 상세 인수인계는 별도 문서로 분리했다.

- `docs/ADMIN_HANDOFF_DETAILED_2026_06_02.md`

---

## 1. 현재 상태 요약

오즈랩페이는 Next.js 14 App Router 기반의 퍼블릭 랜딩 사이트 + Supabase 기반 어드민 CRM이다.

핵심 기능은 아래 5개 축으로 정리된다.

1. 퍼블릭 홈페이지
   - 네이버 POS, 애플페이, 사업자 인터넷, 테이블오더, CCTV, 사업자 마케팅지원, 꿀팁/블로그, FAQ 중심 GNB.
   - 리브랜드 이후 메인 컬러는 네이버 그린이 아니라 블루-퍼플 계열이다.
   - 대표번호는 `1670-2050`, 카카오 채널은 `http://pf.kakao.com/_FkCbX`.

2. 마케터용 인라인 편집
   - `content_blocks` 기반으로 텍스트/이미지/링크를 페이지에서 직접 편집.
   - `landing_slot_items` 기반으로 특정 위치에 마케터가 섹션을 추가/수정/정렬/삭제.
   - 기존 고정 섹션 전체를 자유롭게 교체하는 기능은 보류 상태다.

3. 상담 DB 접수/CRM
   - `/api/consultations`가 상담 신청을 받고 Supabase `consultations`에 저장.
   - 연락처 기준 중복 접수 제한, 블랙리스트 차단, UTM/클릭/GA/Facebook 추적값 저장.
   - `/admin/consultations`에서 상담 목록, 상세 모달, 고객 정보 수정, 매출 등록, 블랙리스트 처리.

4. 어드민 운영
   - 역할 기반 메뉴와 대시보드.
   - DB 정책/분배, 블랙리스트, 상담 옵션, 사이트 head, SEO, 상품/광고/매출 관련 설정.
   - 다크/화이트 모드 전환 지원. 라이트모드 대비 보정 CSS가 추가됨.

5. SEO/AEO/GEO
   - 페이지별 메타데이터, JSON-LD, sitemap, robots, `llms.txt`.
   - 검색엔진 소유권 메타태그는 토큰만이 아니라 전체 meta 태그 입력도 수용하도록 설계.

---

## 2. 기술 스택

- Framework: Next.js 14 App Router
- Language: TypeScript
- UI: React 18, Tailwind CSS 3.4, lucide-react, Iconify
- Editor: Tiptap
- Backend/DB/Auth/Storage: Supabase
- Deploy: Vercel
- Main domain: `https://www.ozlabpay.kr`
- Local dev: `npm run dev`
- Validation:
  - `npm run typecheck`
  - `npm run build`
  - `git diff --check`

---

## 3. 핵심 폴더와 파일

### 퍼블릭 사이트

- `app/page.tsx`
  - 홈 서버 컴포넌트.
  - `content_blocks`, CTA, 랜딩 슬롯 데이터를 로드해 홈 클라이언트에 전달.

- `app/(home)/HomeClient.tsx`
  - 홈 섹션 조립.

- `components/sections/Nav.tsx`
  - 상단 GNB.
  - 현재 메뉴: 네이버 POS, 애플페이, 사업자 인터넷, 테이블오더, CCTV, 사업자 마케팅지원, 꿀팁, FAQ.
  - 모바일에서는 GNB가 사라지지 않도록 가로 스크롤 스트립으로 노출.

- `components/sections/Footer.tsx`
  - 서비스 링크, 고객센터, 개인정보처리방침 PDF 링크.

- `components/sections/ApplyForm.tsx`
  - 홈 상담 신청 폼.
  - 성공 화면에 홈으로 돌아가기, `1670-2050` 전화하기, 카톡 문의하기 CTA.

- `components/cta/CtaModalForm.tsx`
  - 플로팅/모달 CTA 상담 신청 폼.
  - 성공 화면도 동일 대표번호/카톡 CTA 사용.

- `lib/contact.ts`
  - 대표번호와 카카오 채널의 단일 소스.
  - 현재 값:
    - `SITE_PHONE = '1670-2050'`
    - `SITE_PHONE_HREF = 'tel:16702050'`
    - `KAKAO_CHAT_URL = 'http://pf.kakao.com/_FkCbX'`

### 서비스/콘텐츠 페이지

- `components/sections/ServiceLanding.tsx`
  - 사업자 인터넷, 테이블오더, CCTV 등 서비스 상세 랜딩 공통 렌더러.

- `lib/service-pages.ts`
  - 서비스 랜딩 데이터 정의.

- `components/sections/MarketingSupportLanding.tsx`
  - 사업자 마케팅지원 페이지.
  - N커넥트 신청/교체 고객 대상 플레이스 최적화, 광고비 지원, 블로그리뷰 10건 지원 이벤트 내용 반영.

- `app/tips`, `app/blog`
  - 꿀팁/블로그 게시판 계열.

### 어드민

- `app/admin/(shell)/layout.tsx`
  - 어드민 shell, 인증 게이트, 메뉴, 설정 드롭다운.

- `components/admin/ThemeProvider.tsx`
  - `admin-theme` localStorage 기반 다크/라이트 모드.

- `app/globals.css`
  - 퍼블릭 디자인 토큰과 어드민 라이트모드 보정 CSS.
  - `html.light [data-admin-shell]` 범위 아래에서 다크 유틸을 라이트 색상으로 치환한다.

- `app/admin/(shell)/page.tsx`
  - 어드민 대시보드.
  - 기간 필터, 전체/상담사별 매출 요약, 광고비 소진액, 미수금 placeholder, 상담사별/상품별 선그래프, 상태별 신청 카드.

- `app/admin/(shell)/consultations/page.tsx`
  - 상담 신청 목록.

- `app/admin/(shell)/consultations/ConsultationDetailModal.tsx`
  - 상담 상세 모달.
  - 고객이 남긴 정보는 기본 read-only, 별도 편집 진입 후 저장.
  - 업종/지역은 홈페이지 폼과 같은 옵션 데이터 사용.

- `app/admin/(shell)/settings/distribution/DistributionManager.tsx`
  - DB 정책 + 자동분배 통합 관리.
  - 상담사별 ON/OFF, 0.5x/1x/2x 배수, 재분배 기능.

- `app/admin/(shell)/settings/blacklist/BlacklistManager.tsx`
  - 블랙리스트 목록/등록/해제 관리.

- `app/admin/(shell)/settings/head/HeadSettingsForm.tsx`
  - GTM, GA4, Meta Pixel, Google/Naver 인증 메타, custom head HTML 관리.

- `app/admin/(shell)/settings/seo/SeoSettingsClient.tsx`
  - 페이지별 SEO 메타/OG 관리.

---

## 4. 데이터 처리 흐름

### 4-1. 인라인 편집: `content_blocks`

목적: 개발자 없이 마케터가 텍스트, 이미지, 링크를 직접 수정.

테이블:

- `content_blocks`
- `content_block_history`

핵심 파일:

- `lib/content-blocks-server.ts`
- `components/editable/EditableText.tsx`
- `components/editable/EditableLink.tsx`
- `components/editable/EditableVisualSlot.tsx`
- `components/editable/EditorModal.tsx`
- `app/api/admin/content-blocks/route.ts`
- `app/api/admin/content-blocks/upload/route.ts`

데이터 형태:

```ts
type ContentBlock = {
  block_key: string
  page_path: string
  type: 'text' | 'image' | 'link' | string
  value: Record<string, unknown>
  semantic_tag?: string | null
}
```

중요 원칙:

- `semantic_tag`는 SEO 구조 보존용이다. 마케터가 임의로 `h1/h2/img` 등을 바꾸면 안 된다.
- 이미지 업로드는 WebP 최적화.
- 저장 후 관련 page path revalidate가 필요하다.
- 에디터 Enter는 문단 분리 대신 줄바꿈 중심 UX로 조정된 상태다.
- H2/H3 적용은 커서가 있는 현재 block/paragraph에만 적용되어야 한다.
- 텍스트 정렬은 left/center/right/justify를 지원한다.
- 에디터 툴바는 스크롤 시 sticky로 유지되어야 한다.

### 4-2. 랜딩 섹션 빌더: `landing_slot_items`

목적: 마케터가 특정 위치에 안전한 템플릿 섹션을 추가/수정/정렬/삭제.

테이블:

- `landing_slot_items`

마이그레이션:

- `supabase/migrations/20260526024731_landing_section_builder.sql`

핵심 파일:

- `lib/landing-sections.ts`
- `lib/landing-sections-server.ts`
- `components/landing/LandingSlot.tsx`
- `components/landing/LandingModuleRenderer.tsx`
- `app/api/admin/landing-sections/route.ts`

현재 지원 방향:

- 텍스트 섹션
- 이미지 섹션
- 텍스트+이미지
- 카드 묶음
- CTA 섹션
- FAQ 섹션

보류된 범위:

- 기존 하드코딩 섹션 전체를 빌더로 치환하는 기능.
- 기존 섹션 내부의 모든 요소를 구조 단위로 자유 삭제/교체하는 기능.
- 이유: 작업 범위가 크고 현재 우선순위 낮음.

### 4-3. 상담 신청 접수: `consultations`

흐름:

1. 퍼블릭 폼에서 제출.
2. `POST /api/consultations`.
3. honeypot, 개인정보 동의, 연락처 정규화.
4. 블랙리스트 확인.
5. 중복 DB 확인.
6. 자동분배 가능 시 상담사 배정.
7. Supabase `consultations` insert.
8. dataLayer / Meta CAPI / Slack 등 후속 처리는 fire-and-forget 또는 별도 route.

핵심 파일:

- `app/api/consultations/route.ts`
- `components/sections/ApplyForm.tsx`
- `components/cta/CtaModalForm.tsx`
- `lib/consultation-policy.ts`
- `lib/consultation-policy-server.ts`
- `lib/cta-attribution.ts`
- `lib/tracking/datalayer.ts`

저장 데이터:

- 고객 입력: 이름, 연락처, 매장명, 업종, 지역, 단말기/약정/통화 가능 시간, 메시지, 개인정보 동의.
- 시스템 입력: IP, user agent, referer, landing page.
- 어트리뷰션: utm_source, utm_medium, utm_campaign, utm_content, utm_term, gclid, fbclid, CTA campaign/keyword/label 등.
- GA/Facebook: ga_client_id, ga_session_id, fbp, fbc.

중복 정책:

- 기준: 이름이 아니라 연락처.
- 기간: 어드민에서 수정 가능.
- 저장 위치: `content_blocks`의 `admin.consultation_policy.duplicate_phone_window_days`.
- 기본값: 30일.
- 검증 이력: 5일 기준으로 5일 전 데이터는 중복, 6일 전 데이터는 신규 접수 허용 시나리오를 강제 데이터로 검증한 이력이 있다.

블랙리스트:

- 테이블: `abuse_blocklist`.
- 전화번호/IP 기반.
- 접수 API에서 차단 대상이면 신규 DB 저장하지 않음.
- 상세 모달과 별도 블랙리스트 관리 페이지에서 해제 가능.

### 4-4. 자동분배

목적: 신규 상담 DB를 TM 상담사에게 자동 배정.

핵심 테이블/컬럼:

- `admin_users.role`
- `admin_users.distribution_enabled`
- `admin_users.distribution_weight`
- `admin_users.distribution_score`
- `consultations.counselor_id`

지원 기능:

- TM 상담사만 분배 대상.
- 상담사별 분배 ON/OFF.
- 분배 배수:
  - `0.5`: 1/2배수
  - `1.0`: 기본
  - `2.0`: 2배수
- 특정 상담사에게 배정된 DB 전체 또는 특정 상태 DB 회수 후 재분배.

핵심 파일:

- `app/api/admin/distribution/route.ts`
- `app/api/admin/distribution/users/[userId]/route.ts`
- `app/api/admin/distribution/redistribute/route.ts`
- `app/admin/(shell)/settings/distribution/DistributionManager.tsx`

마이그레이션:

- `supabase/migrations/20260511061959_distribution_weighted_tm_controls.sql`
- `supabase/migrations/20260601014746_fix_consultation_auto_distribution.sql`

주의:

- `20260601014746_fix_consultation_auto_distribution.sql`은 현재 로컬에서 untracked 상태다. 프로덕션 DB 적용/커밋 여부를 개발팀이 확인해야 한다.

### 4-5. 상담 옵션

목적: 홈페이지 폼과 어드민 상세 모달의 업종/지역 등 선택값 통일.

테이블:

- `consultation_field_options`

핵심 파일:

- `lib/consultation-options.ts`
- `lib/consultation-options-server.ts`
- `app/api/consultation-options/route.ts`
- `app/api/admin/consultation-options/route.ts`
- `app/admin/(shell)/settings/consultation-options/OptionsManager.tsx`

필드:

- 업종
- 지역
- 단말기
- 약정
- 통화 가능 시간

### 4-6. 매출/광고/상품 데이터

현재 운영 데이터는 단계적으로 확장 중이다.

대시보드에서 이미 사용하는 데이터:

- `revenue_records`
- `ad_metrics`
- `consultations`
- `admin_users`

기존 문서:

- `docs/ADMIN_DASHBOARD_REVENUE_SUMMARY_HANDOFF.md`
- `docs/ADR_014_TRANSACTIONS_DATA_MODEL.md`
- `docs/PRODUCT_SYNC_GUIDE.md`
- `docs/UTM_NAMING_GUIDE.md`

현재 대시보드:

- 기간 미지정 시 KST 오늘 기준.
- 시작일/종료일 지정 가능.
- 이전기간 비교 옵션.
- 전체 role은 전체 매출액/광고비/미수금 placeholder.
- counselor role은 내 매출액/인센티브/미수금 placeholder.
- CTA별 성과는 제거.
- 상담사별 실적, 상품별 실적을 선그래프로 표시.

미완료/연동 대기:

- 미수금 실제 데이터 연결.
- 상담사 인센티브 포인트 계산/연동.
- ADR-014 거래 모델의 전체 UI/자동 정산 연결.

---

## 5. SEO / AEO / GEO / Tracking

핵심 파일:

- `lib/seo.ts`
- `app/sitemap.xml/route.ts`
- `app/robots.txt/route.ts`
- `app/llms.txt/route.ts`
- `app/layout.tsx`
- `app/admin/(shell)/settings/seo/SeoSettingsClient.tsx`
- `app/admin/(shell)/settings/head/HeadSettingsForm.tsx`
- `lib/admin/site-settings.ts`

구현 내용:

- 주요 페이지 `generateMetadata`에 `mergePageMetadata` 통합.
- page SEO admin에서 title/description/keywords/OG 이미지 관리.
- FAQ와 구조화 데이터는 주요 랜딩에 확장 가능하도록 설계.
- sitemap/robots/llms.txt 제공.
- custom head HTML과 검색엔진 인증 메타태그 저장.
- Naver/Google 인증 메타는 전체 `<meta ...>` 태그를 그대로 넣어도 파싱/삽입 가능해야 한다.

site_settings 주의:

- DB `site_settings.value`가 NOT NULL이면 빈 입력 저장 시 `''`로 정규화해야 한다.
- 과거 오류:
  - `ga4_measurement_id: null value in column "value" ...`
  - `custom_head_html: null value in column "value" ...`
- 해결 방향: null 대신 빈 문자열 저장.

검색엔진/봇:

- 네이버 소유권 인증 실패 당시 robots 차단이 핵심 원인은 아니었다.
- 인증 태그 입력 UX는 "토큰만"이 아니라 "메타태그 전체" 입력을 허용하는 것이 현재 요구사항이다.

---

## 6. UI / UX 기준

### 브랜드

- 리브랜드 후 메인 컬러는 블루-퍼플.
- 기존 네이버 그린톤/초록 그라데이션은 제거 대상이다.
- 로고:
  - 밝은 배경: `/brand/ozlabpay-logo-horizontal.png`
  - 어두운 배경: `/brand/ozlabpay-logo-horizontal-white.png`

### 퍼블릭 페이지 UX

- 첫 화면은 랜딩/마케팅 페이지가 아니라 실제 상담 전환 중심.
- GNB는 PC/MO 모두 접근 가능해야 한다.
- 모바일 CTA는 너무 둥글고 큰 버튼이 되지 않도록 가로 긴 타원형, 적절한 높이/폰트 크기를 유지.
- 이미지와 텍스트는 viewport에 따라 반응형으로 자동 조정.
- 긴 한국어 텍스트는 `break-keep`, `leading-relaxed`, clamp 기반 폰트 크기를 사용.
- 땡큐페이지 CTA:
  - 홈으로 돌아가기
  - `1670-2050 전화하기`
  - 카톡 문의하기
  - 정보 다시 입력

### 어드민 UX

- 어드민은 운영 도구이므로 카드가 과하게 장식적이면 안 된다.
- 밀도 있게 읽히되, 다크/라이트 모두 대비가 확보되어야 한다.
- 현재 선택된 상단 메뉴는 시각적으로 활성 표시.
- 설정 메뉴에 들어가도 설정 항목이 활성 표시되어야 한다.
- 상태별 신청 카드 순서:
  - 상단: 부재1 -> 부재2 -> 부재3 -> 부재4 -> 부재5+ -> 재통화대기
  - 하단: 신규 -> 가망 -> 연락중 -> 상담중 -> 개통 완료
- 상담 상세 모달:
  - 고객이 남긴 정보는 기본 잠금.
  - 별도 수정 버튼을 눌렀을 때만 수정.
  - 오입력 방지를 위해 저장/취소 명확히 제공.
- 라이트모드:
  - 다크모드용 `text-*-200/300`, `bg-*-500/10`이 그대로 남으면 글자가 흐려진다.
  - `app/globals.css`의 `html.light [data-admin-shell]` 보정 레이어를 유지해야 한다.

### 콘텐츠 에디터 UX

- Enter는 문단 분리가 아니라 줄바꿈 중심.
- H2/H3는 전체 본문이 아니라 현재 커서 단락에만 적용.
- 정렬: 왼쪽/가운데/오른쪽/양쪽.
- 툴바는 스크롤 시 상단 sticky.
- 디폴트 폰트 크기는 브라우저/시스템 기본에 가깝게, 너무 작아지지 않게 유지.

---

## 7. 현재 미커밋/주의 상태

2026-06-02 현재 로컬 working tree에는 아래 변경이 있다.

이미 사용자가 요청해 반영된 최신 변경:

- `app/globals.css`
  - 어드민 라이트모드 대비 보정.

- `lib/contact.ts`
  - 대표번호 `1670-2050`.
  - 카카오 채널 `http://pf.kakao.com/_FkCbX`.

- `components/sections/ApplyForm.tsx`
- `components/cta/CtaModalForm.tsx`
  - 상담 완료 CTA 링크/반응형 텍스트 조정.

- `components/sections/Nav.tsx`
- `components/sections/Footer.tsx`
- `components/sections/MarketingSupportLanding.tsx`
- `lib/service-pages.ts`
- `app/llms.txt/route.ts`
  - 공통 대표번호 참조로 교체.

기존부터 있었던 로컬 변경:

- `.gitignore`
  - 내용 확인 후 관련 작업인지 판단 필요.

- `supabase/migrations/20260601014746_fix_consultation_auto_distribution.sql`
  - 자동분배 미작동 수정용 migration으로 보임.
  - 커밋/DB 적용/프로덕션 반영 여부 확인 필요.

권장 처리:

1. 위 변경을 개발팀이 검토.
2. Supabase migration 적용 여부 확인.
3. `npm run typecheck`, `npm run build`.
4. 커밋 메시지 예:
   - `fix(ui): improve thank-you CTA and admin light mode`
   - `fix(db): restore weighted consultation auto distribution`

---

## 8. 배포 전 체크리스트

1. 환경변수
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - GA/GTM/Meta 관련 env 또는 `site_settings`
   - Slack webhook/env 사용 여부

2. DB 마이그레이션
   - `landing_slot_items` 존재 여부.
   - `consultation_field_options` 존재 여부.
   - `admin_users.distribution_enabled`, `distribution_weight`, `distribution_score` 존재 여부.
   - `abuse_blocklist` RLS와 API 동작 확인.

3. 빌드
   - `npm run typecheck`
   - `npm run build`
   - `git diff --check`

4. 퍼블릭 QA
   - PC/MO GNB 배열.
   - 대표번호 `1670-2050`.
   - 땡큐페이지 전화/카톡 링크.
   - 홈/서비스페이지 초록색 잔여 배경 제거.
   - 개인정보처리방침 PDF 링크.
   - SEO meta/head 태그 출력.

5. 어드민 QA
   - 다크/라이트 전환.
   - 상담 목록 텍스트 대비.
   - 상담 상세 모달 고객 정보 수정.
   - 블랙리스트 등록/해제.
   - 중복 접수 제한 기간 변경.
   - 자동분배 ON/OFF, 배수, 재분배.
   - 대시보드 기간 필터/그래프.

---

## 9. 다음 작업 권장 순서

1. 현재 미커밋 변경 정리 및 push.
2. `20260601014746_fix_consultation_auto_distribution.sql` 프로덕션 적용 여부 확인.
3. 어드민 라이트모드 실사용 화면 전체 QA.
4. 상담 신청 실제 접수 테스트:
   - 정상 신규 접수
   - 중복 접수
   - 블랙리스트 차단
   - 자동 상담사 분배
5. SEO QA:
   - Google Search Console
   - Naver Search Advisor
   - sitemap/robots/llms.txt
   - 주요 페이지 FAQ schema.
6. 매출/미수금/인센티브 실제 데이터 연결.
7. 기존 섹션 전체 빌더화 여부 재검토.

---

## 10. 개발팀에 전달할 한 줄 요약

오즈랩페이는 이제 단순 랜딩이 아니라 "마케터가 직접 편집하는 전환형 홈페이지 + 상담 DB CRM + 광고/매출 운영 어드민"으로 확장되어 있다. 다음 개발은 UI를 새로 만들기보다 기존 `content_blocks`, `landing_slot_items`, `consultations`, `admin_users`, `site_settings` 흐름을 유지하면서 데이터 연결과 운영 안정성을 보강하는 방향으로 진행해야 한다.
