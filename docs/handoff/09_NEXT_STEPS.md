# 09. 다음 단계 로드맵 (Phase F~H + Beyond)

> 우선순위 P0 (긴급) > P1 (중요) > P2 (정상) > P3 (낮음)

## 0. 한눈에 보기

| Phase | 작업 | 우선순위 | 예상 기간 |
|---|---|---|---|
| **P0** | 우리편 데이터 정리 (오즈랩 운영 시작 후) | P0 | 5분 |
| **F** | 인센티브 시스템 (incentive_rates + entries + view) | **P1** | 2~3일 |
| **G** | 지출 시스템 (expenses + 손익 통합) | P2 | 1~2일 |
| **H** | 매출 4차원 분해 페이지 (광고×상담사×상품×일자) | **P1** | 2~3일 |
| **I** | 인터넷 정책서 자동 파싱 | P3 | 1일 |
| **J** | Vercel Cron (자동 sync) | P2 | 0.5일 |
| **K** | 어드민 channel_mapping / sheet_channel_alias 편집 페이지 | P2 | 1일 |
| **L** | audit log + 변경 이력 | P2 | 1일 |
| **M** | SaaS 멀티테넌트 (tenant_id) | P3 | 1주 |
| **N** | 차트 라이브러리 (Recharts) | P3 | 1일 |

---

## 1. P0 — 우리편 데이터 정리

### 시점

오즈랩페이가 실제 광고 + 매출 운영 시작 후 (예: 6월 중순 또는 7월).

### 작업

```sql
-- 우리편 임시 데이터 일괄 삭제
DELETE FROM ad_metrics WHERE site = 'wooripen';
-- → 약 450행 삭제

-- 검증
SELECT site, COUNT(*) FROM ad_metrics GROUP BY site;
-- → 'ozlab' 만 남아야 함
```

### 주의
- 우리편 데이터가 필요 없어진 시점 확실히 한 후 실행
- 백업 권장 (`pg_dump` 또는 Supabase Dashboard → Backup)
- paid-media 페이지의 "전체 기간" 통계가 변할 수 있음 (예상된 동작)

---

## 2. Phase F — 인센티브 시스템 (P1, 2~3일)

### 배경

현재 시트로 인센티브 관리 (인센티브_단가 + 인센티브_박영철/임승현/신규인원1). 시트 폐기 + DB 자동화 필요.

### 마이그레이션 1: `incentive_rates`

상품별 P 단가 마스터.

```sql
CREATE TABLE incentive_rates (
  product_code text PRIMARY KEY,
  product_name text NOT NULL,
  weekday_p numeric(4,2) NOT NULL,
  weekend_p numeric(4,2) NOT NULL,
  attribution_field text NOT NULL,
    -- '접수일' / '인터넷설치일' / '토스설치일' / '정수기설치일' / '테이블오더설치일'
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- 시드 (오즈랩 11종)
INSERT INTO incentive_rates VALUES
  ('인',   '인터넷',     1.5, 1.5, '인터넷설치일'),
  ('티',   '전화',       0.5, 0.5, '접수일'),
  ('전',   '전 (옵션)',  0.1, 0.1, '접수일'),
  ('CCTV', 'CCTV',       0.2, 0.2, '접수일'),
  ('테이블오더', '테이블오더', 0.2, 0.2, '테이블오더설치일'),
  ('정수기', '정수기',   0.2, 0.2, '정수기설치일'),
  ('VAN',  'VAN',        0.5, 0.3, '토스설치일'),
  ('토스', '토스',       0.2, 0.2, '토스설치일'),
  ('키오스크', '키오스크', 1.0, 1.0, '접수일'),
  ('배달연동', '배달연동', 1.0, 1.0, '접수일'),
  ('학원연동', '학원연동', 0.5, 0.5, '접수일');
```

### 마이그레이션 2: `incentive_entries`

직원별 상담/개통 입력.

```sql
CREATE TABLE incentive_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES admin_users(user_id),
  consultation_id uuid REFERENCES consultations(id),  -- 상담 연동 시 자동
  customer_name text,
  customer_phone text,
  store_name text,
  received_date date,            -- 접수일
  internet_install_date date,    -- 인터넷 설치일
  tos_install_date date,         -- 토스 설치일
  fridge_install_date date,      -- 정수기 설치일
  tableorder_install_date date,  -- 테이블오더 설치일
  -- 상품 수량 (11종)
  qty_internet int DEFAULT 0,
  qty_phone int DEFAULT 0,
  qty_jeon int DEFAULT 0,
  qty_cctv int DEFAULT 0,
  qty_tableorder int DEFAULT 0,
  qty_fridge int DEFAULT 0,
  qty_van int DEFAULT 0,
  qty_tos int DEFAULT 0,
  qty_kiosk int DEFAULT 0,
  qty_delivery int DEFAULT 0,
  qty_academy int DEFAULT 0,
  shift_type text NOT NULL CHECK (shift_type IN ('weekday', 'weekend')),
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_incentive_entries_employee_date
  ON incentive_entries (employee_id, received_date);
```

### View: `incentive_monthly_summary`

월별 정산 자동 계산.

```sql
CREATE VIEW incentive_monthly_summary AS
WITH p_by_product AS (
  SELECT
    ie.employee_id,
    -- 귀속일 = 상품별 룰
    CASE r.product_code
      WHEN '인' THEN ie.internet_install_date
      WHEN '테이블오더' THEN ie.tableorder_install_date
      WHEN '정수기' THEN ie.fridge_install_date
      WHEN 'VAN' THEN ie.tos_install_date
      WHEN '토스' THEN ie.tos_install_date
      ELSE ie.received_date
    END as attribution_date,
    ie.shift_type,
    -- 상품 수량 × P 단가
    CASE r.product_code
      WHEN '인' THEN ie.qty_internet
      WHEN '티' THEN ie.qty_phone
      WHEN '전' THEN ie.qty_jeon
      WHEN 'CCTV' THEN ie.qty_cctv
      WHEN '테이블오더' THEN ie.qty_tableorder
      WHEN '정수기' THEN ie.qty_fridge
      WHEN 'VAN' THEN ie.qty_van
      WHEN '토스' THEN ie.qty_tos
      WHEN '키오스크' THEN ie.qty_kiosk
      WHEN '배달연동' THEN ie.qty_delivery
      WHEN '학원연동' THEN ie.qty_academy
    END * (CASE WHEN ie.shift_type='weekend' THEN r.weekend_p ELSE r.weekday_p END) as p
  FROM incentive_entries ie
  CROSS JOIN incentive_rates r
  WHERE r.is_active
)
SELECT
  employee_id,
  date_trunc('month', attribution_date) as month,
  SUM(p) FILTER (WHERE shift_type = 'weekday') as weekday_p,
  SUM(p) FILTER (WHERE shift_type = 'weekend') as weekend_p,
  -- 평일: (P-40)*30000, 단 40 미만이면 0
  GREATEST(SUM(p) FILTER (WHERE shift_type='weekday') - 40, 0) * 30000 as weekday_incentive,
  SUM(p) FILTER (WHERE shift_type='weekend') * 50000 as weekend_incentive
FROM p_by_product
WHERE attribution_date IS NOT NULL
GROUP BY employee_id, date_trunc('month', attribution_date);
```

### 어드민 페이지 추가

1. `/admin/incentives` — 직원별 입력 폼 + 월별 합계
2. `/admin/settings/incentive-rates` — P 단가 편집

### 마이그레이션 작업

1. 우리편 시트 4-5월 데이터 → `incentive_entries` 일괄 import
2. 검증: 시트 합계 vs view 결과 ±0% 일치 확인

---

## 3. Phase G — 지출 시스템 (P2, 1~2일)

### 배경

시트의 `TM 지출 세부` (인터넷사은품, 월세, 인건비 등)를 DB화. 손익 자동 계산 가능.

### 마이그레이션: `expenses`

```sql
CREATE TABLE expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date date NOT NULL,
  category text NOT NULL,
    -- '월 고정비' | '광고비' | '일별 지출'
  subcategory text,
    -- '월세' | '인건비' | '인터넷사은품' | 채널명 등
  item_name text NOT NULL,
  amount numeric(12, 0) NOT NULL,
  notes text,
  created_by uuid REFERENCES admin_users(user_id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_expenses_date_cat ON expenses (expense_date, category);
```

### 어드민 페이지

1. `/admin/settings/expenses` — 일별 지출 수동 입력 + 월 고정비 자동
2. `/admin/dashboard/profit-loss` — 손익 통합 페이지
   - 매출 (revenue_records) vs 지출 (expenses + ad_metrics)
   - 인센티브 (incentive_monthly_summary view) 포함
   - 월별 / 분기별 / 연간 토글

### 데이터 이관

우리편 시트 4-5월 지출 → `expenses` 일괄 import:
- 4월: 인건비 23.48M + 월세 2M + 인터넷사은품 33.29M
- 5월: 인건비 27.29M + 월세 2M + 인터넷사은품 16.81M

---

## 4. Phase H — 매출 4차원 분해 페이지 (P1, 2~3일) ★

대웅의 **핵심 비전** — 절대 잊지 말 것.

### 배경

매출이 발생하면 다음 4축으로 분해:
- 광고 매체 (utm_source/medium)
- 상담사 (consultations.assigned_to / closed_by)
- 상품 (revenue_records.product_id)
- 일자 (recognized_at)

현재 paid-media 페이지는 광고 매체 + 일자만 분해. 상담사 / 상품 누락.

### 페이지 설계

**경로**: `/admin/dashboard/revenue-breakdown` (또는 `/admin/dashboard/sales-deep`)

### 4가지 뷰 모드

1. **매체 × 상담사 매트릭스**: 행=매체, 열=상담사, 셀=매출
2. **매체 × 상품 매트릭스**: 행=매체, 열=상품, 셀=매출
3. **상담사 × 상품 매트릭스**: 행=상담사, 열=상품, 셀=매출
4. **상담사별 일별 추이**: 각 상담사의 매출 트렌드

### SQL (예시)

```sql
SELECT
  COALESCE(cm.channel_label, '직접/기타') as channel,
  COALESCE(au.display_name, '미배정') as counselor,
  COALESCE(p.label, '미지정') as product,
  date_trunc('day', r.recognized_at) as day,
  COUNT(*) as conversions,
  SUM(r.amount) as revenue
FROM revenue_records r
LEFT JOIN consultations c ON c.id = r.consultation_id
LEFT JOIN admin_users au ON au.user_id = c.assigned_to
LEFT JOIN products p ON p.id = r.product_id
LEFT JOIN LATERAL (
  SELECT channel_code, channel_label
  FROM channel_mapping
  WHERE lower(utm_source) = lower(coalesce(c.utm_source, ''))
    AND lower(coalesce(utm_medium, '')) = lower(coalesce(c.utm_medium, ''))
  LIMIT 1
) cm ON true
WHERE r.recognized_at BETWEEN :from AND :to
GROUP BY 1, 2, 3, 4;
```

### 필터

- 기간 (paid-media 와 동일 패턴)
- 매체 (다중 선택)
- 상담사 (다중 선택)
- 상품 카테고리 (다중 선택)

### 응답 시간

- 6개월 데이터: 1~2초 예상
- 1년 이상: 캐싱 또는 머터리얼라이즈드 뷰 검토

---

## 5. Phase I — 인터넷 정책서 자동 파싱 (P3, 1일)

### 배경

현재 인터넷 정책서 (해피 SKT정책서)는 담당자가 수동으로 표준 양식으로 변환. 자동 파싱 가능하면 편의성 증대.

### 옵션 A: 인터넷 전용 시트 양식

별도 시트 (구글 시트 1탭) 추가:
- 헤더: 약정 / 요금제 / 단품/번들 / 지원금 (현금) / 지원금 (제휴) / 사은품 / 시점
- 제품군별 별도 시트 탭

### 옵션 B: 정책서 직접 파싱

SKT 정책서 헤더 자동 인식:
- "전국(전액현금)" 컬럼 → 지원금
- 행 헤더 ("광랜 단품" 등) → 상품명
- 시점 (날짜 컬럼) → 시점

### 권장

옵션 A 가 안정적 — 담당자가 인터넷 전용 시트만 따로 관리.

---

## 6. Phase J — Vercel Cron (P2, 0.5일)

### 매일 자동 sync

`vercel.json`:
```json
{
  "crons": [
    { "path": "/api/cron/sync-ads", "schedule": "0 18 * * *" },
    { "path": "/api/cron/sync-products", "schedule": "0 19 * * *" }
  ]
}
```

→ 18:00 UTC = 03:00 KST (광고 시트 sync)
→ 19:00 UTC = 04:00 KST (상품 시트 sync — 정책 변경 반영)

### `/api/cron/sync-ads` 라우트

```ts
export async function GET(req: NextRequest) {
  // Vercel Cron 인증 (header secret)
  const secret = req.headers.get('x-vercel-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 내부 fetch — ad-sync POST (둘 다)
  const url = new URL('/api/admin/ad-sync', req.url).toString()
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-cron': 'true' },
    body: JSON.stringify({})
  })
  return NextResponse.json(await res.json())
}
```

→ `guardApi` 가 `x-internal-cron` 헤더 인식하도록 보강 필요.

### `CRON_SECRET` 환경변수 추가 필수

---

## 7. Phase K — channel_mapping / sheet_channel_alias 어드민 (P2, 1일)

### 페이지

`/admin/settings/channel-mapping` — utm 정규화 매핑 편집
`/admin/settings/sheet-channel-alias` — 시트 매체값 정규화 매핑 편집

### UX

각각:
- 매핑 목록 (utm_source / utm_medium / channel_code / channel_label / is_paid)
- 인라인 편집 + 행 삭제
- 새 매핑 추가 (검색 가능한 드롭다운)
- "테스트" 버튼 — 입력한 utm 조합이 어떤 channel_code 로 매핑되는지 즉시 확인

### 추가 — 미매핑 utm 자동 표시

paid-media 페이지의 "⚠️ 매핑 안 된 UTM 조합" 박스의 항목을 클릭하면 → 어드민 매핑 페이지로 이동 + 해당 utm 자동 입력.

---

## 8. Phase L — audit log (P2, 1일)

### 마이그레이션

```sql
CREATE TABLE audit_log (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES admin_users(user_id),
  action text NOT NULL,         -- 'create' | 'update' | 'delete'
  table_name text NOT NULL,
  record_id text NOT NULL,
  changes jsonb,                 -- diff
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_audit_user_time ON audit_log (user_id, created_at);
CREATE INDEX idx_audit_table_record ON audit_log (table_name, record_id);
```

### 통합 위치

모든 어드민 API 라우트의 INSERT/UPDATE/DELETE 직후:

```ts
await logAudit(guard.profile.user_id, 'update', 'products', id, { before, after })
```

→ `lib/admin/audit.ts` 헬퍼 만들고 라우트마다 호출.

### 어드민 페이지

`/admin/logs` — 사용자별/테이블별 필터 + 시간순.

---

## 9. Phase M — SaaS 멀티테넌트 (P3, 1주)

### 배경

`ozlab_saas_potential` 메모리 — 이 시스템을 다른 비즈에 SaaS 로 판매할 가능성.

### 작업

1. 모든 테이블에 `tenant_id uuid` 컬럼 추가
2. RLS 정책에 `tenant_id = current_tenant()` 추가
3. 도메인별 tenant 매핑 (예: ozlab.com → tenant_A, abc.com → tenant_B)
4. 어드민 페이지 진입 시 tenant 컨텍스트 설정

### 주의

지금 미리 멀티테넌트 설계해두는 것이 가장 효율적 — 나중에 retrofit 어려움. 모든 신규 테이블에 `tenant_id` 포함하는 습관.

> 메모리 `ozlab_saas_potential` 참조 (대웅 명시).

---

## 10. Phase N — 차트 라이브러리 (P3, 1일)

### 배경

paid-media / sales 페이지의 일별 추이를 인라인 막대 표 대신 차트로.

### 라이브러리 후보

- **Recharts** (메모리에 언급된 후보) — React 친화, 가벼움
- Plotly — 인터랙티브, 크기 부담
- Chart.js — 일반적, React wrapper 필요

→ Recharts 추천.

### 적용 위치

1. paid-media 일별 추이 (Bar/Line)
2. sales 코호트 매트릭스 (Heatmap)
3. (Phase H) 매출 4차원 분해 (Stacked Bar / Sankey)
4. (Phase F) 인센티브 추이 (Line)
5. (Phase G) 손익 추이 (Bar + Line)

---

## 11. 권장 작업 순서

```
P0 우리편 데이터 정리 (오즈랩 운영 시작 시)
  ↓
P1 Phase F 인센티브 시스템 (직원 정산 자동화)
  ↓
P1 Phase H 매출 4차원 분해 페이지 (대웅 핵심 비전)
  ↓
P2 Phase G 지출 + 손익 통합 (재무 가시화)
  ↓
P2 Phase J Vercel Cron (자동화)
  ↓
P2 Phase K 매핑 편집 페이지 (운영 편의)
  ↓
P2 Phase L audit log (보안/추적)
  ↓
P3 Phase I 인터넷 정책서 (편의)
  ↓
P3 Phase N 차트 (시각화 강화)
  ↓
P3 Phase M SaaS 멀티테넌트 (확장)
```

## 12. 다음 문서로

- 파일 맵 → `10_FILES_MAP.md`
- 의사결정 기록 → `11_DECISIONS.md`
