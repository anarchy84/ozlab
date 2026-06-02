# 04. 어드민 UI — 24개 페이지 전수 명세

> **이 문서가 핵심**. 모든 어드민 페이지의 역할 / 권한 / UX / 컴포넌트 / 인터랙션 / 상태관리.
> 페이지를 수정하거나 새로 만들 때 이 문서의 패턴을 따를 것.

## 0. 어드민 구조 개요

```
/admin
├── login                       ─ 로그인 (Supabase Auth)
├── (shell)/                    ─ 어드민 셸 (layout 공통)
│   ├── page                    ─ 대시보드 홈
│   ├── consultations           ─ 상담 (메인)
│   ├── dashboard/
│   │   ├── paid-media          ─ 광고 퍼포먼스 ★ (Phase E 핵심)
│   │   └── sales               ─ 매출 코호트
│   ├── content                 ─ 콘텐츠 블록
│   ├── media                   ─ 미디어 라이브러리
│   ├── users                   ─ 사용자 관리
│   └── settings/               ─ 설정 그룹
│       ├── statuses
│       ├── consultation-options
│       ├── consultation-policy
│       ├── cta
│       ├── products
│       ├── product-sync        ─ 상품 시트 sync ★ (Phase 추가)
│       ├── distribution
│       ├── blacklist
│       ├── ad-sync             ─ 광고 시트 sync ★
│       ├── head
│       ├── seo
│       ├── slack
│       ├── alert-rules
│       └── permissions
└── help/                       ─ 도움말
    ├── utm
    └── tracking
```

## 1. 어드민 셸 (layout)

**파일**: `app/admin/(shell)/layout.tsx`

### 역할
- 헤더 (네비 메뉴 + 사용자 정보 + 로그아웃)
- 좌측 사이드 메뉴 (mainMenu + settingsMenu)
- 전체 영역 다크 테마 (`AdminThemeProvider`)

### 메뉴 구조

**일상 메뉴 (모든 admin)**:
```ts
{ href: '/admin', label: '대시보드' },
{ href: '/admin/consultations', label: '상담' },
{ href: '/admin/dashboard/sales', label: '매출' },
{ href: '/admin/dashboard/paid-media', label: '광고' },
{ href: '/admin/content', label: '콘텐츠' },
{ href: '/admin/media', label: '미디어' },
```

**설정 드롭다운 (super_admin)**:
- 사용자 관리, 권한 매트릭스
- 상태 관리, 상담 옵션 관리, CTA 관리
- 상품 관리, **상품 시트 sync** ★
- DB 정책·분배, 블랙리스트, **광고 sync** ★
- 사이트 head 편집, 페이지 SEO·OG
- 슬랙 알림 설정, 이상 시그널 룰
- UTM 표준 가이드, 광고 추적 인프라

**역할별 부분 노출**:
- `tm_lead` / `admin` / `marketing`: DB 정책·분배 메뉴만
- 블랙리스트 권한 보유 시: 블랙리스트 메뉴

### 공통 디자인
- 다크 테마: `bg-surface-dark`, `text-ink-100`
- 헤더: `bg-ink-900 border-b border-ink-700 sticky`
- 최대 너비: `max-w-[1280px] mx-auto`

> 디자인 토큰 상세: `07_DESIGN_SYSTEM.md`.

## 2. 로그인 `/admin/login`

**파일**: `app/admin/login/page.tsx`

### 역할
- Supabase Auth 이메일/비밀번호 로그인
- 로그인 후 `admin_users` 테이블 조회 → role 확인 → `/admin` 리다이렉트
- 등록 안 된 사용자는 거부 (sign-up 차단)

### UX
- 단일 폼 (이메일 + 비밀번호)
- 에러 메시지 인라인
- "비밀번호 잊으셨나요" 없음 (수동 reset 만)

## 3. 대시보드 홈 `/admin`

**파일**: `app/admin/(shell)/page.tsx`

### 역할
- 환영 메시지 + 빠른 통계 (오늘의 리드, 미처리 상담)
- 자주 가는 페이지 바로가기 카드

## 4. 상담 `/admin/consultations` (메인 페이지)

**파일**: `app/admin/(shell)/consultations/page.tsx`
**주요 컴포넌트**: `ConsultationsListClient.tsx`, `ConsultationDetailModal.tsx`, `BulkActionBar.tsx`, `RevenueModal.tsx`

### 역할
TM 의 메인 작업 페이지. 상담 리스트 + 상세 편집 + 매출 입력.

### UX
- 좌측: 필터 (날짜, 상태, 매체, 담당자, 키워드)
- 메인: 상담 목록 (테이블)
  - 컬럼: 일자 / 고객명 / 전화 / 매체 / 캠페인 / 상태 / 담당자 / 메모 / 액션
  - 체크박스 선택 → 하단 `BulkActionBar` 표시 (일괄 상태 변경, 일괄 분배)
- 행 클릭 → `ConsultationDetailModal` 열림
  - 고객이 남긴 정보 (수정 가능 — Phase 인라인 편집 완료)
  - 상담 메시지 (자유 텍스트, 메모 누적)
  - 상태 변경 (드롭다운 → history 자동 기록)
  - 담당자 변경 (admin_users 드롭다운)
  - **매출 등록 버튼** → `RevenueModal` 열림 (revenue_records 입력)

### 권한
- `super_admin` / `admin`: 전체 상담
- `tm_lead`: 자신 팀 + 미배정
- `tm`: 본인 배정 상담만

### 자동화
- 새 상담 등록 시 자동 분배 (`distribution_rules` 기반)
- 중복 연락처 차단 (`abuse_blocklist` 매칭)
- 상태 변경 시 `consultation_status_history` 자동 row

### 컴포넌트 상태 관리
- React Server Component (page.tsx) — 초기 데이터 fetch
- Client Component (`ConsultationsListClient.tsx`) — 필터링 + 페이지네이션 + 모달 트리거
- useEffect 로 검색/필터 디바운싱

## 5. 매출 `/admin/dashboard/sales`

**파일**: `app/admin/(shell)/dashboard/sales/page.tsx`
**주요 컴포넌트**: `PeriodControl.tsx`, `CohortMatrix.tsx`, `CohortBreakdown.tsx`

### 역할
매출 코호트 분석 — 매체별/일자별/상품별.

### UX
- 상단: 기간 필터 (오늘/7일/이번달/지난달/3개월/전체)
- **CohortMatrix**: 매체 × 코호트일 매출 매트릭스
  - 셀: 해당 매체에서 해당일 가입 → 누적 매출
  - 색상: 매출 크기에 따라 농도
- **CohortBreakdown**: 선택한 매체의 일별 LTV
  - X축: 가입 후 N일
  - Y축: 누적 매출

### 데이터 소스
- `v_revenue_cohort_daily` 뷰
- `v_revenue_cohort_matrix` 뷰

### 권한
- `super_admin` / `admin` / `marketing`

## 6. 광고 퍼포먼스 `/admin/dashboard/paid-media` ★ (Phase E 핵심)

**파일**: `app/admin/(shell)/dashboard/paid-media/page.tsx`
**주요 컴포넌트**: `PeriodControl.tsx`
**데이터 헬퍼**: `lib/admin/paid-media.ts`

### 역할
광고비 × 리드 × 매출 3개 데이터를 매체별로 조인한 통합 KPI 대시보드.

### 페이지 구조 (위에서 아래)

1. **헤더**
   - 제목 + 기간 표시 (예: "최근 7일 (2026-05-27 ~ 2026-06-02)")
   - 우측: "매출 통합 →" / "시트 sync →" 링크

2. **기간 필터** (`PeriodControl.tsx`)
   - 6종: 오늘 / 최근 7일 (기본) / 이번 달 / 지난 달 / 최근 3개월 / 전체
   - URL query `?preset=week|month|...` 변경 시 페이지 재렌더

3. **DB 매입 섹션** (보라색, 조건부 표시)
   - 토스 스프레드 + 토스 프리미엄 매입 데이터
   - KPI 3종: 총 매입수량 / 총 매입비 / 평균 단가
   - 출처별 표 (매입수량 / 총매입비 / 평균 단가)
   - 조건: `dbPurchaseTotals.lead_qty > 0` 이거나 행이 있을 때만

4. **페이드 미디어 KPI 10종** (5cols × 2rows 그리드)
   - 노출 / 클릭 / CTR / **광고 리드** / **광고 CPL**
   - **CRM 리드** / 개통 / CPA (개통기준) / 광고비 / ROAS
   - **광고 리드 = `ad_metrics.conversions` SUM** (광고 플랫폼 보고)
   - **CRM 리드 = `consultations` count** (utm 매칭)
   - ROAS 색상 룰: ≥200% 녹색 / 100-200% 황색 / <100% 빨강

5. **매체별 종합 표** (14컬럼)
   - 매체 / 노출 / 클릭 / CTR / 광고비
   - **광고 리드** (보라 컬럼) / **광고 CPL** (보라 + amber)
   - **CRM 리드** (블루 컬럼) / **CRM CPL** (블루 + amber)
   - 개통 / CPA / 매출 / ROAS / 개통률
   - 정렬: 페이드 우선 + 광고비 내림차순
   - 비유료 채널 (organic/direct/site) `opacity-60` 으로 흐리게
   - 행 hover 시 배경 강조
   - 표 하단: 색상 의미 안내 (보라 = 광고 측, 블루 = CRM 측)

6. **일별 추이 표** (10컬럼)
   - 일자 / 광고비 / 광고비 추이 (인라인 막대)
   - **광고 리드** / 광고 리드 추이 (보라 막대)
   - **CRM 리드** / CRM 리드 추이 (블루 막대)
   - 개통 / 매출 / 광고 CPL

7. **캠페인 드릴다운** (CRM 기준)
   - 매체 / utm_campaign / CRM 리드 / 개통 / 매출 / 개통률
   - 상위 50개 (리드 내림차순)
   - 안내 문구: "ad_metrics 에 캠페인 raw 저장 안 됨 — 시트에서 확인"

8. **미매핑 utm 진단** (조건부)
   - `channel_mapping` 에 없는 utm 조합 노란색 박스로 표시
   - 코드 블록에 한 줄씩

### 데이터 흐름 (paid-media.ts)

```
loadPaidMediaSummary(preset)
  ↓
1. channel_mapping 전체 fetch → utm 정규화 lookup
2. ad_metrics 기간 내 fetch (db_purchase + paid_media)
3. consultations 기간 내 fetch (utm 매칭 → channel_code)
4. revenue_records 기간 내 fetch (consultation utm 별도 IN 쿼리)
5. JS 에서 channel_code 기준 조인 + 집계
   - byCode Map: 채널별 KPI
   - byDate Map: 일별 KPI
   - byCampaign Map: 캠페인별 KPI
   - dbPurchaseByCh Map: DB 매입 별도
6. 지표 계산: ctr / cvr / ad_cpl / cpl / cpa / roas / lead_cvr
7. totals 합산 (페이드 미디어 only — !is_paid 제외)
```

### 권한
- `super_admin` / `marketing` / `tm_lead` / `admin` / `marketer`

### 컴포넌트 분리
- Server Component: `page.tsx` (데이터 fetch + 렌더)
- Client Component: `PeriodControl.tsx` (URL query 변경)
- Helper 컴포넌트: `Kpi`, `Bar`, `DailySeriesTable`, `ActionBadge` (page.tsx 내부)

## 7. 콘텐츠 `/admin/content`

**파일**: `app/admin/(shell)/content/page.tsx`
**컴포넌트**: `ContentManager.tsx`, `ContentEditor.tsx`

### 역할
사이트의 재사용 가능한 콘텐츠 블록 관리 (히어로 카피, FAQ, 약관 등).

### UX
- 좌측: 콘텐츠 블록 목록 (key, label)
- 우측: 선택한 블록의 본문 (Markdown 에디터)
- 저장 시 `content_block_history` 에 자동 이력 (revert 가능)

### 권한
- `super_admin` / `admin` / `marketer` / `marketing`

## 8. 미디어 `/admin/media`

**파일**: `app/admin/(shell)/media/page.tsx`
**컴포넌트**: `MediaLibrary.tsx`

### 역할
이미지/파일 업로드 + 라이브러리.

### UX
- 그리드 뷰 (썸네일)
- 업로드 → Supabase Storage
- URL 복사 → 콘텐츠에서 사용

## 9. 사용자 관리 `/admin/users`

**파일**: `app/admin/(shell)/users/page.tsx`
**컴포넌트**: `UsersManager.tsx`

### 역할
어드민 계정 초대 / 권한 변경 / 비활성화.

### UX
- 사용자 목록 표 (이름 / 이메일 / 역할 / 활성 / 분배 enabled / 마지막 로그인)
- "+ 초대" 버튼 → 이메일 + 역할 선택 → invite 메일 발송 (Supabase Auth)
- 행 클릭 → 편집 모달 (role 변경, distribution_weight, slack_user_id 등)
- "비밀번호 reset" 버튼 → 재설정 메일 발송
- "transfer" 버튼 → 이 사용자의 상담을 다른 사용자에게 일괄 이관

### 권한
- `super_admin` 만

## 10. 상태 관리 `/admin/settings/statuses`

**파일**: `app/admin/(shell)/settings/statuses/page.tsx`
**컴포넌트**: `StatusesManager.tsx`

### 역할
상담 상태 마스터 + 상태별 자동화 플래그 관리.

### UX
- 상태 목록 (sort_order 순)
- 인라인 편집: key / label / color / is_active / is_final / auto_close
- 드래그 앤 드롭 정렬

## 11. 상담 옵션 관리 `/admin/settings/consultation-options`

**파일**: `app/admin/(shell)/settings/consultation-options/page.tsx`
**컴포넌트**: `OptionsManager.tsx`

### 역할
업종 / 지역 / 단말기 / 약정 / 통화시간 5종 드롭다운 옵션 마스터.

### UX
- 5개 카드 (각 필드 그룹)
- 인라인 편집 (값/순서/활성/삭제)
- 새 옵션 추가는 "+ 추가" 버튼

### 데이터 모델
`consultation_field_options` 테이블:
- `field` text (industry/region/terminal/contract/call_time)
- `value` text
- `sort_order`, `is_active`

### 권한
- `super_admin` 만

## 12. 상담 정책 `/admin/settings/consultation-policy`

**파일**: `app/admin/(shell)/settings/consultation-policy/page.tsx`
**컴포넌트**: `ConsultationPolicyManager.tsx`

### 역할
상담 정책 텍스트 (개인정보, 마케팅 동의 등) 편집.

## 13. CTA 관리 `/admin/settings/cta`

**파일**: `app/admin/(shell)/settings/cta/page.tsx`
**컴포넌트**: `CtaManager.tsx`, `CtaWizardModal.tsx`

### 역할
홈/랜딩의 CTA 버튼 + 폼 빌더.

### UX
- CTA 목록 (slug, label, enabled, utm)
- "+ 새 CTA" → `CtaWizardModal` (3단계: 기본 / utm / 폼 필드)
- 폼 빌더: 필드 추가 (slug, label, type, required) — drag/drop 순서
- 활성/비활성 토글

### 데이터
- `cta_buttons` 테이블
- `form_fields` 는 jsonb 배열

## 14. 상품 관리 `/admin/settings/products`

**파일**: `app/admin/(shell)/settings/products/page.tsx`
**컴포넌트**: `ProductsManager.tsx`, `BulkUploadModal.tsx`

### 역할
상품 카탈로그 (이름/분류/공급사/가격/원가/약정 등) 수동 관리 + CSV 일괄 업로드.

### UX
- 상품 목록 표 (8컬럼: 이름 / 분류 / 공급사 / 약정 / 고객가격 / 우리수당 / 기기값 / 액션)
- 카테고리 필터 (드롭다운)
- "+ 새 상품" → 인라인 폼 (label/category/vendor/price/period 등)
- "📥 Bulk 업로드" → `BulkUploadModal`
  - 한글 양식 / 영문 양식 다운로드 버튼
  - CSV 업로드 → 미리보기 표 → 확인 → 일괄 upsert
  - dry_run 검증 단계 거침

### 데이터
- `products` 테이블
- `product_categories` 테이블 (카테고리 마스터)

### 권한
- `super_admin` / `admin` / `marketer`

## 15. 상품 시트 sync `/admin/settings/product-sync` ★ (Phase 추가)

**파일**: `app/admin/(shell)/settings/product-sync/page.tsx`
**컴포넌트**: `ProductSyncManager.tsx`

### 역할
구글 시트 URL 등록 → 4종 상품 sync (`/admin/settings/products` 와 별개).

### UX

```
[헤더]
  제목 + 설명 + "상품 목록 →" 링크

[사용 가이드 펼치기] (접힌 상태로 시작)
  ▶ 클릭 시 펼침
  - 표준 헤더 표 (11컬럼)
  - 컬럼 설명 (필수 표시)
  - 상품 종류별 가격 모델 안내 (단가 vs 지원금)
  - 자동 인식 헤더 (NIT/네이버 렌탈표)
  - "📥 표준 양식 CSV 다운로드" 버튼

[🔗 구글 시트 URL]
  - URL 입력란 (font-mono)
  - 안내: edit URL 그대로 OK, 공유 권한 "뷰어" 필요
  - 버튼 3개: "URL 저장" / "🧪 미리보기" / "🚀 동기화 실행"
  - 결과 메시지 (성공 emerald-300 / 실패 red-400)

[📊 마지막 동기화 결과] (last_synced_at 있을 때만)
  - 5개 카드: 시각 / 상태 / 처리 / 신규 / 업데이트
  - 메시지 줄

[🔍 행별 처리 결과 (상위 30)] (미리보기/동기화 직후만)
  - 표: # / 상품명 / 분류 / 액션(신규/업데이트/에러) / 메모
  - 에러 메시지 인라인

[🕘 최근 업데이트된 상품 (참고)]
  - 표: 상품명 / 분류 / 공급사 / 원가 / 고객가 / 업데이트일
```

### 상태 관리

```ts
// ProductSyncManager.tsx
const [config, setConfig] = useState<Config | null>(null)
const [recent, setRecent] = useState<RecentProduct[]>([])
const [url, setUrl] = useState('')
const [loading, setLoading] = useState(true)
const [working, setWorking] = useState(false)
const [msg, setMsg] = useState('')
const [preview, setPreview] = useState<SyncResult[] | null>(null)
const [showGuide, setShowGuide] = useState(false)
```

### 인터랙션
- 초기 로드: `GET /api/admin/products/sync` → config + recent
- "URL 저장" → `PATCH` body `{ sheet_csv_url }`
- "🧪 미리보기" → `POST` body `{ dry_run: true }` → preview 표시
- "🚀 동기화 실행" → `POST` body `{ dry_run: false }` → 실제 upsert
- "📥 표준 양식 CSV 다운로드" → 클라이언트 사이드 CSV 생성 + BOM 추가
  - 4종 예시 9행 포함 (인터넷 4, POS 2, CCTV 1, 키오스크 1, 테오 1)

### 권한
- `super_admin` / `admin` / `marketer` / `marketing`

### 자동 인식 헤더
bulk API 의 `pick(...)` 매핑이 처리:
- 표준: `상품 이름`, `분류`, `공급사`, `원가`, `우리 수당`, `고객 가격`, `약정 기간`, `월 정기 결제`, `월 결제 금액`, `단말기 종류`, `메모`
- NIT: `품목명`, `품목군`, `공급사`, `판매가(기본)`, `판매가(5대이상)~`, `제품설명`, `특이사항`
- 네이버 렌탈: `상품구성`, `구성`, `단가`, `렌탈가`, `일시불`, `비고`
- 무시: `여신협회인증여부`, `인증일`, `인증만료일`, `NO`

## 16. DB 정책·분배 `/admin/settings/distribution`

**파일**: `app/admin/(shell)/settings/distribution/page.tsx`
**컴포넌트**: `DistributionManager.tsx`

### 역할
새 상담 자동 분배 룰 + TM 가중치 관리.

### UX
- 분배 룰 목록 (중복 기준, 우선순위)
- TM 별 가중치 슬라이더 (`admin_users.distribution_weight`)
- 일시 정지 (`distribution_paused_until`)

### 권한
- `super_admin` / `admin` / `marketing` / `tm_lead`

## 17. 블랙리스트 `/admin/settings/blacklist`

**파일**: `app/admin/(shell)/settings/blacklist/page.tsx`
**컴포넌트**: `BlacklistManager.tsx`

### 역할
차단 연락처/IP 관리.

### UX
- 블랙리스트 목록 (phone/ip, reason, expires_at)
- "+ 추가", "🗑 해제"

## 18. 광고 sync `/admin/settings/ad-sync` ★

**파일**: `app/admin/(shell)/settings/ad-sync/page.tsx`
**컴포넌트**: `AdSyncManager.tsx`

### 역할
2개 광고 시트 sync (DB 매입 + 페이드 미디어).

### UX

```
[헤더]
  "광고 sync" + 안내

[보라색 카드: DB 매입]
  - 헤더 가이드 펼치기 (날짜·출처·매입수량·단가·총매입비)
  - URL 입력 + 저장
  - "이 시트 sync" 버튼
  - 마지막 sync 상태 (시각/상태/메시지)

[블루 카드: 페이드 미디어]
  - 헤더 가이드 펼치기 (날짜·출처·노출·클릭·광고비)
  - URL 입력 + 저장
  - "이 시트 sync" 버튼
  - 마지막 sync 상태

[중앙: 둘 다 sync 버튼]

[하단: 최근 50건]
  - source 배지 (DB매입 보라 / 페이드 블루)
  - 날짜 / 채널 / 서비스 / 노출 / 클릭 / 전환 / 광고비 / lead_qty / synced_at
```

### 상태 관리
- `config` (sheet_csv_url + sheet_csv_url_paid + 각각의 last_status/message)
- `recent` (최근 50건 ad_metrics)
- `urlDb` / `urlPaid` 입력 state
- `working` / `msg` 작업 상태

### 인터랙션
- 초기: `GET /api/admin/ad-sync` → config + recent
- "URL 저장": `PATCH` body `{ sheet_csv_url }` 또는 `{ sheet_csv_url_paid }`
- "이 시트 sync": `POST` body `{ type: 'db_purchase' }` 또는 `{ type: 'paid_media' }`
- "둘 다 sync": `POST` body `{}`

### 슬랙 알림
sync 완료 시 자동으로 `alerts_warning` 채널 broadcast (성공/실패 + 매핑 안 된 매체값).

### 권한
- `super_admin` / `marketing` / `admin`

## 19. 사이트 head `/admin/settings/head`

**파일**: `app/admin/(shell)/settings/head/page.tsx`
**컴포넌트**: `HeadSettingsForm.tsx`

### 역할
GTM / GA4 / Meta 픽셀 / verification / 자유 HTML 편집.

### UX
- 폼: GTM ID / GA4 measurement ID / Meta 픽셀 ID / Google verification / Naver verification / 자유 HTML
- 저장 후 즉시 사이트 반영 (`site_settings` 단일 row)

## 20. 페이지 SEO·OG `/admin/settings/seo`

**파일**: `app/admin/(shell)/settings/seo/page.tsx`
**컴포넌트**: `SeoSettingsClient.tsx`

### 역할
페이지별 메타 + OG 이미지 업로드.

### UX
- 페이지 목록 (`/`, `/internet`, `/business/cctv`, `/business/torder`, `/marketing-support`)
- 각 페이지 별: title / description / og_image / canonical 편집
- OG 이미지 업로드 → Supabase Storage → URL 자동 저장

### 데이터
- `page_seo` 테이블
- `lib/admin/page-seo.ts` 의 `buildPageMetadata(path, base)` 헬퍼가 base Metadata 와 머지

## 21. 슬랙 알림 `/admin/settings/slack`

**파일**: `app/admin/(shell)/settings/slack/page.tsx`
**컴포넌트**: `SlackSettingsClient.tsx`

### 역할
Slack 채널 관리 + 테스트 메시지.

### UX
- 채널 목록 (key, channel_id, label, is_active)
- "+ 추가" → channel_id + key + label 입력
- "테스트 메시지 보내기" 버튼 → 해당 채널로 ping

### 데이터
- `slack_channels` 테이블
- `lib/slack.ts` 의 `sendToSlackChannel(channelKey, payload)` 가 DB 조회 후 발사

## 22. 이상 시그널 룰 `/admin/settings/alert-rules`

**파일**: `app/admin/(shell)/settings/alert-rules/page.tsx`
**컴포넌트**: `AlertRulesClient.tsx`

### 역할
CPA 임계 / ROAS 임계 / 일신청 임계 등 룰 빌더.

### UX
- 룰 목록 (이름 / 조건 / 액션 / 활성)
- "+ 새 룰" → 조건 빌더 (metric / operator / threshold / window) + 액션 (slack 채널)
- "테스트 평가" 버튼 → `/api/admin/alert-rules/[id]/evaluate`

### 데이터
- `alert_rules` 테이블 (룰 정의)
- `alert_log` 테이블 (발사 이력)

## 23. 권한 매트릭스 `/admin/settings/permissions`

**파일**: `app/admin/(shell)/settings/permissions/page.tsx`
**컴포넌트**: `PermissionsMatrix.tsx`

### 역할
role × permission 토글 매트릭스.

### UX
- 행: app_roles (super_admin, admin, marketing, ...)
- 열: app_permissions (consultations.read, products.write, ...)
- 셀: 체크박스 → `role_permissions` 토글

### 권한
- `super_admin` 만

## 24. 도움말 페이지들

### `/admin/help` — 헬프 인덱스

### `/admin/help/utm` — UTM 표준 가이드
- 광고 대행사에 UTM 표준 룰 전달용
- `utm_source` / `utm_medium` / `utm_campaign` 명명 규칙
- channel_mapping 시드 24개 표

### `/admin/help/tracking` — 광고 추적 인프라
- GTM 컨테이너 설정
- GA4 이벤트 (generate_lead, purchase)
- Meta CAPI 흐름
- 전환 가치 (value) 룰

## 25. 공통 패턴

### Server Component vs Client Component

```
page.tsx (Server Component)
  ├── requireAdminProfile() 호출 (인증 + role 체크)
  ├── DB 조회 (createServerClient or createAdminClient)
  └── <SomeManager initialData={...} /> 렌더 (Client Component)

SomeManager.tsx (Client Component)
  ├── 'use client'
  ├── useState + useEffect
  ├── fetch('/api/...') → 상태 업데이트
  └── 사용자 인터랙션
```

### Period Filter 패턴

```ts
// PeriodControl.tsx (Client)
const router = useRouter()
const handleChange = (preset: PeriodPreset) => {
  router.push(`?preset=${preset}`)
}

// page.tsx (Server)
export default async function Page({ searchParams }) {
  const preset = (searchParams?.preset ?? 'week') as PeriodPreset
  const data = await loadData(preset)
  return <Layout>{...}</Layout>
}
```

### 모달 패턴

```ts
const [open, setOpen] = useState(false)
const [editingItem, setEditingItem] = useState<Item | null>(null)

const openEdit = (item: Item) => {
  setEditingItem(item)
  setOpen(true)
}

{open && editingItem && (
  <SomeModal
    item={editingItem}
    onClose={() => { setOpen(false); setEditingItem(null) }}
    onSaved={(updated) => { /* 목록 갱신 */ }}
  />
)}
```

### 인라인 편집 패턴 (consultation-options, statuses 등)

```ts
const [editing, setEditing] = useState<string | null>(null)  // 편집 중인 row id

// 보기 모드
<div onClick={() => setEditing(row.id)}>
  {row.label}
</div>

// 편집 모드
{editing === row.id && (
  <input
    value={value}
    onChange={...}
    onBlur={() => save()}
    autoFocus
  />
)}
```

### dry_run / preview 패턴 (bulk + sync)

```
1. dry_run=true 호출 → DB 변경 X, 검증 결과만
2. 결과 표시 (행별 insert/update/error)
3. 에러 0건이면 → 실제 적용 버튼 활성화
4. dry_run=false 호출 → 실제 upsert
5. 결과 표시 (요약 카드)
```

## 26. 페이지 추가 패턴

새 어드민 페이지 만들 때 다음 순서:

```
1. 라우트 폴더 생성
   app/admin/(shell)/settings/my-feature/

2. page.tsx (Server Component)
   - requireAdminProfile() + role 체크 → redirect 또는 ok
   - 초기 데이터 fetch
   - <MyFeatureManager /> 렌더

3. MyFeatureManager.tsx (Client Component, 필요 시)
   - 'use client'
   - 상태 관리 + fetch + 인터랙션

4. layout.tsx 에 메뉴 추가
   { href: '/admin/settings/my-feature', label: '...', desc: '...' }

5. API 라우트 (app/api/admin/my-feature/route.ts)
   - guardApi(['allowed_roles']) 호출
   - GET / POST / PATCH / DELETE 핸들러

6. 마이그레이션 (필요 시) — 03_DB_SCHEMA 참조

7. TypeScript 타입 (lib/admin/types.ts 또는 페이지 내부 interface)

8. 테스트 — npm run typecheck + 로컬 실행

9. 커밋 + push (Vercel 자동 배포)
```

## 27. 알려진 UX 이슈 / 개선 사항

| 페이지 | 이슈 | 우선순위 |
|---|---|---|
| `paid-media` | 모바일에서 표 가로 스크롤 어려움 | 낮 |
| `consultations` | 빠른 검색 (Cmd+K) 없음 | 중 |
| `product-sync` | 시트 탭 (gid) 자동 감지 없음 — URL 끝 `#gid=` 수동 입력 필요 | 중 |
| `ad-sync` | 같음 | 중 |
| 전체 | 다크 모드만 — 라이트 모드 없음 | 낮 |
| `users` | invite 후 사용자 첫 로그인 시 안내 UX 없음 | 낮 |

## 28. 다음 문서로

- API 라우트 명세 → `05_API_ROUTES.md`
- 데이터 흐름 다이어그램 → `06_DATA_FLOWS.md`
- 디자인 토큰 → `07_DESIGN_SYSTEM.md`
