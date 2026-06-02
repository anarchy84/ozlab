# 03. DB 스키마 — 전체 테이블 + RLS + 마이그레이션 이력

> Supabase 프로젝트: `vbdoyambycopigfajcgk` (woori-nconnect)
> Postgres: 17.6.1

## 1. 테이블 분류 (29개 테이블 + 13개 뷰)

```
┌─ 인증/권한 (5)
│   admin_users, app_roles, app_permissions, role_permissions, abuse_blocklist
│
├─ 상담/매출 (9)
│   consultations, consultation_messages, consultation_status_history,
│   consultation_field_options, revenue_records, db_statuses,
│   distribution_rules, cta_buttons, slack_channels
│
├─ 상품 (3)
│   products, product_categories, product_sync_config
│
├─ 광고/분석 (5)
│   ad_metrics, ad_sync_config, channel_mapping, sheet_channel_alias, alert_rules, alert_log
│
├─ 콘텐츠/미디어 (5)
│   content_blocks, content_block_history, content_posts, media, page_seo, site_settings
│
└─ 분석 뷰 (13)
    v_consultation_*, v_revenue_*, v_cta_performance 등
```

## 2. 마이그레이션 이력 (시간 순)

| 파일 | 주요 변경 |
|---|---|
| `20260421000001_content_blocks.sql` | content_blocks + history |
| `20260428000001_consultations.sql` | consultations + status_history + messages |
| `20260429000001_admin_phase_a.sql` | abuse_blocklist + db_statuses + slack_channels |
| `20260429000002_admin_users_and_roles.sql` | admin_users + app_roles + app_permissions + role_permissions |
| `20260429000003_phase_a_security_hardening.sql` | RLS 보강 |
| `20260429000004_loosen_status_check.sql` | status 제약 완화 |
| `20260429000005_cta_buttons.sql` | cta_buttons 테이블 |
| `20260430000001_media_and_posts_editor.sql` | media + content_posts |
| `20260430000002_attribution_classification.sql` | consultations utm 컬럼 + 분류 뷰 (v_consultations_by_*) |
| `20260430000003_products_revenue_cohort.sql` | products + revenue_records + 코호트 뷰 |
| `20260430000004_phase2_through_6_skeleton.sql` | 추가 스켈레톤 |
| `20260430000005_security_hardening.sql` | RLS 추가 보강 |
| `20260504000001_cta_form_builder.sql` | CTA 폼 빌더 |
| `20260511055531_distribution_member_availability.sql` | distribution_rules |
| `20260511061959_distribution_weighted_tm_controls.sql` | 분배 가중치 |
| `20260526024731_landing_section_builder.sql` | landing section |
| `20260526060000_transactions_v2.sql` | ADR_014 거래 객체 — customers, policies, transactions, revenue_streams, settlements_raw 등 |
| `20260526063000_products_extra_columns.sql` | vendor/default_commission/customer_price/device_cost 추가 |
| `20260526070000_products_device_type_cost_tiers.sql` | device_type + cost_5plus~100plus (정찰제 7단가) |
| `20260526080000_consultation_field_options.sql` | 상담 입력 5종 옵션 DB화 |
| `20260527000000_channel_mapping.sql` | channel_mapping + 시드 24개 |
| `20260527010000_ad_metrics_lead_qty.sql` | lead_qty + source 컬럼 |
| `20260527020000_ad_metrics_service_not_null.sql` | service NOT NULL + unique 인덱스 단순화 |
| `20260527030000_ad_sync_config_paid.sql` | sheet_csv_url_paid + 페이드 sync 상태 컬럼 |
| `20260527040000_sheet_channel_alias.sql` | 시트 매체값 정규화 (27개 시드) |
| `20260527050000_ad_metrics_site.sql` | site 컬럼 + (site, date, channel, service) unique |
| `20260527060000_product_sync_config.sql` | 상품 시트 sync 설정 |
| `20260601014746_fix_consultation_auto_distribution.sql` | 상담 자동 분배 버그 fix |

> 파일은 모두 `supabase/migrations/` 폴더.

## 3. 핵심 테이블 상세

### 3.1 `admin_users` — 어드민 사용자

```sql
admin_users (
  user_id uuid PRIMARY KEY,              -- auth.users 의 id
  role text NOT NULL,                     -- super_admin/admin/marketing/marketer/tm_lead/tm
  display_name text,
  department text,
  note text,
  is_active boolean NOT NULL,
  distribution_enabled boolean,           -- TM 분배 받을지
  distribution_pause_reason text,
  distribution_paused_until timestamptz,
  distribution_note text,
  distribution_weight numeric,            -- 분배 가중치
  distribution_score numeric,             -- 누적 점수
  slack_user_id text,                     -- Slack DM 알림용
  slack_dm_enabled boolean,
  created_at timestamptz,
  updated_at timestamptz
)
```

> 현재 5명 등록. 추가는 `/admin/users` 페이지에서.

### 3.2 `ad_metrics` — 광고비 + 리드 (시트 sync 결과)

```sql
ad_metrics (
  id bigserial PRIMARY KEY,
  date date NOT NULL,
  channel text NOT NULL,                  -- channel_code (정규화됨, 예: 'meta-ads')
  service text NOT NULL DEFAULT '',       -- '인터넷가입'/'토스단말기'/'티오더'/'기타'
  impressions numeric DEFAULT 0,
  clicks numeric DEFAULT 0,
  conversions numeric DEFAULT 0,           -- 광고 플랫폼 보고 결과수 = '광고 리드'
  spend numeric DEFAULT 0,                 -- 광고비 (KRW)
  lead_qty numeric DEFAULT 0,              -- DB 매입 수량 (source='db_purchase' 만)
  source text DEFAULT '',                  -- 'paid_media' | 'db_purchase'
  site text NOT NULL DEFAULT 'ozlab',     -- 'ozlab' | 'wooripen'
  synced_at timestamptz
);

-- unique index
CREATE UNIQUE INDEX ux_ad_metrics_site_date_channel_service
  ON ad_metrics (site, date, channel, service);
```

**현재 데이터**:
- site='wooripen': 4-5월 우리편 데이터 450행
- site='ozlab': 116행 (테스트 + DB 매입 일부)

**source 의미**:
- `paid_media`: 페이드 광고 (네이버/메타/구글/당근) — impressions/clicks/conversions/spend 사용
- `db_purchase`: 토스 등 공급자가 매입해서 전달 — lead_qty/spend 만 사용

### 3.3 `channel_mapping` — utm → channel_code 정규화 (consultations 측)

```sql
channel_mapping (
  id bigserial PRIMARY KEY,
  utm_source text NOT NULL,
  utm_medium text,
  channel_code text NOT NULL,
  channel_label text NOT NULL,
  is_paid boolean NOT NULL DEFAULT true,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz
);

CREATE UNIQUE INDEX ux_channel_mapping
  ON channel_mapping (lower(utm_source), lower(coalesce(utm_medium, '')));
```

**시드 24개**: 네이버 5종 + 구글 4종 + 메타 3종 + 카카오 2종 + 그 외 페이드 3종 + 비유료 5종.

**RPC**: `resolve_channel(p_source text, p_medium text) RETURNS table_row` — utm 조합 받아서 channel_code/label/is_paid 반환.

### 3.4 `sheet_channel_alias` — 시트 매체값 → channel_code (ad_metrics 측)

```sql
sheet_channel_alias (
  id bigserial PRIMARY KEY,
  sheet_value text NOT NULL UNIQUE,       -- '네이버 검색광고', '메타 비즈니스' 등
  channel_code text NOT NULL,              -- 'naver-search', 'meta-ads'
  notes text,
  created_at timestamptz,
  updated_at timestamptz
);

CREATE UNIQUE INDEX ux_sheet_channel_alias_value
  ON sheet_channel_alias (lower(sheet_value));
```

**시드 26개**: 네이버 3종 + 메타 5종 + 당근 3종 + 구글 4종 + 유튜브 3종 + 카카오 3종 + 틱톡 2종 + 토스/자체/site.

**RPC**: `resolve_sheet_channel(p_sheet_value text) RETURNS text` — 매체값 받아서 channel_code 반환.

### 3.5 `consultations` — 리드 (상담)

```sql
consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  -- 고객 정보
  customer_name text,
  phone text,
  store_name text,
  -- utm (자동 캡쳐)
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  gclid text,                              -- 구글 클릭 ID
  fbclid text,                             -- 메타 클릭 ID
  referrer text,
  landing_path text,
  -- 입력 옵션 (consultation_field_options 매핑)
  industry text, region text, terminal text, contract text, call_time text,
  -- 상태
  status text DEFAULT 'new',
  assigned_to uuid REFERENCES admin_users(user_id),
  closed_by uuid REFERENCES admin_users(user_id),
  opening_status text,
  -- 메시지 (자유 텍스트)
  customer_message text,
  -- 메타
  ip_address inet,
  user_agent text,
  blocked_reason text,
  updated_at timestamptz
)
```

**관련 테이블**:
- `consultation_messages` — 상담 채팅/메모
- `consultation_status_history` — 상태 변경 이력
- `consultation_field_options` — 5종 옵션 마스터 (업종/지역/단말기/약정/통화시간)

### 3.6 `revenue_records` — 매출 (개통)

```sql
revenue_records (
  id uuid PRIMARY KEY,
  consultation_id uuid REFERENCES consultations(id),
  amount numeric NOT NULL,
  product_id uuid REFERENCES products(id),
  recognized_at date NOT NULL,
  source text,                             -- '자체'/'토스 프리미엄'/'토스 스프레드'
  note text,
  created_by uuid,
  created_at timestamptz
)
```

> 현재 0행 (실 매출 미시작).

### 3.7 `products` — 상품 마스터 (25 컬럼)

```sql
products (
  id uuid PRIMARY KEY,
  code text NOT NULL UNIQUE,               -- 자동 생성 또는 시트 입력
  label text NOT NULL,                     -- '상품 이름' (식별)
  category text NOT NULL,                  -- internet/pos/cctv/kiosk/tableorder/etc
  -- 가격 (단가 모델)
  vendor text,                             -- 공급사
  default_amount numeric,                   -- (기본 — 사용 빈도 낮음)
  default_commission numeric,              -- 우리 수당 (마진)
  customer_price numeric,                  -- 고객 판매가
  device_cost numeric,                     -- 원가 (1대, 부가세 포함)
  -- 정찰제 7단가 (NIT 양식)
  device_type text,
  cost_5plus numeric, cost_10plus numeric,
  cost_20plus numeric, cost_30plus numeric,
  cost_50plus numeric, cost_100plus numeric,
  -- 정기 결제
  default_period text,                     -- '12개월'/'24개월'/'36개월'/'48개월'/'없음'
  is_subscription boolean DEFAULT false,
  default_monthly numeric,
  -- 메타
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  note text,
  created_at timestamptz,
  updated_at timestamptz,
  created_by uuid
)
```

**가격 모델별 사용 컬럼**:
- POS 단말기 (NIT 양식): `device_cost`(1대 가격) + `cost_5plus~100plus`(정찰제 단가)
- 패키지 (네이버 양식): `device_cost`(원가) + `default_commission`(마진) + `customer_price`(판매가)
- 인터넷 (지원금 모델): `device_cost=0` + `default_commission`(우리 수당=지원금) + `customer_price=0`

### 3.8 `ad_sync_config` + `product_sync_config` — 시트 sync 설정

#### `ad_sync_config`
```sql
ad_sync_config (
  id integer PRIMARY KEY DEFAULT 1,
  sheet_csv_url text,                       -- DB 매입 시트
  last_synced_at timestamptz,
  last_status text,
  last_message text,
  -- 페이드 미디어 시트 (Phase E 추가)
  sheet_csv_url_paid text,
  last_synced_at_paid timestamptz,
  last_status_paid text,
  last_message_paid text,
  -- 사이트 (multi-site 분리)
  site text DEFAULT 'ozlab',
  updated_at timestamptz,
  CHECK (id = 1)                            -- 단일 row
);
```

#### `product_sync_config`
```sql
product_sync_config (
  id integer PRIMARY KEY DEFAULT 1,
  sheet_csv_url text,
  last_synced_at timestamptz,
  last_status text,
  last_message text,
  rows_processed integer DEFAULT 0,
  rows_inserted integer DEFAULT 0,
  rows_updated integer DEFAULT 0,
  rows_error integer DEFAULT 0,
  CHECK (id = 1)
);
```

### 3.9 `cta_buttons` — CTA 폼 빌더

```sql
cta_buttons (
  id uuid PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  label text,
  enabled boolean,
  utm_source text, utm_medium text, utm_campaign text,
  form_fields jsonb,                        -- 필드 정의 (slug, label, required)
  ...
)
```

> `/admin/settings/cta` 에서 관리. 홈/랜딩 페이지의 모든 CTA 버튼이 여기서 생성됨.

### 3.10 그 외 주요 테이블

| 테이블 | 역할 |
|---|---|
| `db_statuses` | 상담 상태 마스터 (new/contacted/closed 등) |
| `distribution_rules` | TM 자동 분배 정책 (중복 룰, 가중치 등) |
| `abuse_blocklist` | 차단 연락처/IP |
| `slack_channels` | Slack 알림 채널 마스터 (key, channel_id, is_active) |
| `alert_rules` | 이상 시그널 룰 (CPA 임계, 일신청 임계 등) |
| `alert_log` | 알림 발사 이력 |
| `content_blocks` + history | 사이트 콘텐츠 블록 (재사용 가능) |
| `content_posts` | 블로그 포스트 |
| `media` | 미디어 라이브러리 |
| `page_seo` | 페이지별 SEO 메타 + OG 이미지 |
| `site_settings` | head 편집 (GTM, GA4, 픽셀, verification) |

## 4. 분석 뷰 (13개)

`20260430000002_attribution_classification.sql` 와 `_products_revenue_cohort.sql` 에서 추가됨:

| 뷰 | 역할 |
|---|---|
| `v_consultation_by_channel` | 채널별 상담 수 |
| `v_consultation_by_counselor` | 상담사별 상담 수 |
| `v_consultation_funnel` | 상담 깔때기 |
| `v_consultations_by_blog_post` | 블로그 포스트 어트리뷰션 |
| `v_consultations_by_creative` | 크리에이티브 어트리뷰션 |
| `v_consultations_by_inferred_channel` | 추론 채널 |
| `v_consultations_by_keyword` | 키워드 어트리뷰션 |
| `v_cta_performance` | CTA 버튼 성과 |
| `v_revenue_by_channel` | 매체별 매출 |
| `v_revenue_by_product` | 상품별 매출 |
| `v_revenue_cohort_daily` | 일별 코호트 |
| `v_revenue_cohort_matrix` | 코호트 매트릭스 |
| `v_revenue_ltv_by_channel` | 매체별 LTV |

> 코호트 뷰는 `/admin/dashboard/sales` 에서 사용. `04_ADMIN_UI.md` 참조.

## 5. RLS 패턴

### 패턴 A — anon read + admin write

```sql
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "my_table_read" ON my_table FOR SELECT USING (true);

CREATE POLICY "my_table_admin_write" ON my_table FOR ALL
  USING (EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
  ));
```

→ `channel_mapping`, `sheet_channel_alias`, `db_statuses` 등 마스터 데이터.

### 패턴 B — 모든 작업 어드민만

```sql
CREATE POLICY "my_table_admin_only" ON my_table FOR ALL
  USING (EXISTS (...)) WITH CHECK (EXISTS (...));
```

→ `product_sync_config`, `ad_sync_config`, `admin_users` 등 설정 테이블.

### 패턴 C — 본인 데이터만

```sql
CREATE POLICY "my_data" ON my_table FOR SELECT
  USING (assigned_to = auth.uid() OR EXISTS (admin check));
```

→ TM 의 본인 상담만 보기.

> 마이그레이션마다 정책이 다를 수 있음. 변경 시 RLS도 함께 검토.

## 6. 마이그레이션 작성 규칙

### 파일명 규칙

```
supabase/migrations/YYYYMMDDhhmmss_short_name.sql
```

예: `20260527060000_product_sync_config.sql`

### 헤더 주석 (필수)

```sql
-- =============================================================
-- Migration: 20260527060000_product_sync_config
-- 상품표 시트 sync 설정 (단일 row 테이블)
-- =============================================================
-- 배경 :
--   <왜 이 변경이 필요한지>
--
--   <ad_sync_config 패턴 따라 단일 row 사용 이유>
-- =============================================================
```

### 안전 룰

- `CREATE TABLE IF NOT EXISTS` 사용 (재실행 안전)
- `CREATE INDEX IF NOT EXISTS` 사용
- `DROP POLICY IF EXISTS` 이후 `CREATE POLICY` (재실행 안전)
- 컬럼 추가는 `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` 권장
- DEFAULT 값 명시 (NULL 안전)
- 시드 INSERT 는 `ON CONFLICT DO NOTHING` 또는 `DO UPDATE SET` 사용

### 적용 흐름

```
1. supabase/migrations/ 에 새 파일 추가 (위 규칙)
2. mcp__supabase__apply_migration 으로 prod 적용 (또는 supabase db push)
3. 어드민 페이지/API 수정
4. git commit + push → Vercel 자동 배포
5. 검증 — 어드민에서 동작 확인
```

## 7. 다음 문서로

- 어드민 페이지 명세 → `04_ADMIN_UI.md` (가장 두꺼움)
- API 라우트 명세 → `05_API_ROUTES.md`
- 데이터 흐름 다이어그램 → `06_DATA_FLOWS.md`
