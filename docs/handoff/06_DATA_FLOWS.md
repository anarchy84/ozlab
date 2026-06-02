# 06. 데이터 흐름 — 시트 sync / 광고 / 매출

## 1. 광고 시트 sync (ad-sync) — 핵심 흐름

### 1.1 시퀀스

```
[담당자] 구글 시트에 광고비 데이터 입력
    │
    ▼
[어드민] /admin/settings/ad-sync 에서 URL 등록
    │
    ▼
[POST /api/admin/ad-sync] body: { type: 'paid_media' | 'db_purchase' | 둘 다, site?: 'ozlab' }
    │
    ├─► ad_sync_config 에서 URL 로드
    ├─► normalizeGoogleSheetUrl(rawUrl)  ─── edit URL → CSV export URL 자동 변환
    ├─► fetch(csvUrl, no-store)
    ├─► parseCsv(text)  ─── RFC 4180 호환 파서
    ├─► sheet_channel_alias 전체 로드 → Map<sheetValue, channelCode>
    │
    ├─► rows.map((r) => normalizeRow(r))  ─── 한글 헤더 → 표준 필드
    │   ┌─ '날짜'/'date' → date
    │   ├─ '매체'/'채널'/'출처'/'channel' → channel
    │   ├─ '서비스'/'service' → service
    │   ├─ '노출수'/'노출'/'impressions' → impressions
    │   ├─ '클릭수'/'클릭'/'clicks' → clicks
    │   ├─ '전환수'/'전환'/'conversions' → conversions
    │   ├─ '광고비'/'비용'/'총매입비'/'spend' → spend
    │   └─ '매입수량'/'lead_qty' → lead_qty
    │
    ├─► 행 cleaning + 매체값 정규화
    │   - normalizeDate(raw)  ─── 'YYYY.MM.DD.' → 'YYYY-MM-DD' 등
    │   - aliasMap.get(channel.toLowerCase()) → 정규화된 channel_code (예: '메타 비즈니스' → 'meta-ads')
    │   - 매핑 없으면 unmappedSet 에 추가 (시트값 그대로 저장)
    │
    ├─► 사전 집계 (date, channel, service) Map 으로 SUM
    │   ┌─ 같은 키의 여러 행을 합산 (네이버 시트 캠페인 단위 raw → 합산)
    │
    ├─► upsert(rows, onConflict='site,date,channel,service')
    │   - site, date, channel, service 가 unique
    │   - 기존 행 있으면 update (impressions/clicks/conversions/spend/lead_qty 갱신)
    │
    └─► recordSyncResult — ad_sync_config 에 last_synced_at / status / message 기록
    ▼
[notifySlack] — alerts_warning 채널로 결과 broadcast (fire-and-forget)
    └─ unmappedChannels 있으면 함께 표시
```

### 1.2 핵심 함수 (`app/api/admin/ad-sync/route.ts`)

| 함수 | 역할 |
|---|---|
| `normalizeGoogleSheetUrl(rawUrl)` | edit URL → CSV export URL |
| `parseCsv(text)` | RFC 4180 CSV → Record<string, string>[] |
| `parseCsvLine(line)` | 따옴표 묶인 콤마 보존 |
| `normalizeRow(r)` | 한글/영문 헤더 alias 인식 |
| `normalizeDate(raw)` | 다양한 날짜 포맷 → YYYY-MM-DD |
| `syncOneSheet(type, rawUrl, site)` | 한 시트 처리 메인 로직 |
| `recordSyncResult(type, r)` | ad_sync_config 결과 기록 |
| `notifySlack(results, site)` | Slack 알림 |

### 1.3 시트 헤더 종류별 매핑

| 시트 종류 | 헤더 (한글) | 매핑 결과 |
|---|---|---|
| DB 매입 (토스) | 날짜, 출처, 매입수량, 단가, 총매입비 | source='db_purchase' / lead_qty + spend |
| 페이드 미디어 (간단) | 날짜, 출처, 노출, 클릭, 광고비 | source='paid_media' / impressions + clicks + spend |
| 페이드 미디어 (통합) | 날짜, 매체, 캠페인, 키워드, 광고비, 노출수, 클릭수, 전환수, 서비스 | source='paid_media' / 전 항목 |

## 2. 상품 시트 sync (product-sync) — 신규 흐름

### 2.1 시퀀스

```
[담당자] 구글 시트에 상품 입력 (표준 헤더 11개 + 또는 NIT/네이버 양식)
    │
    ▼
[어드민] /admin/settings/product-sync 에서 URL 등록
    │
    ▼
[POST /api/admin/products/sync] body: { dry_run?: boolean }
    │
    ├─► product_sync_config 에서 URL 로드
    ├─► normalizeGoogleSheetUrl + fetch + parseCsv
    │
    ├─► 인증 컬럼 사전 제거: '여신협회인증여부', '인증일', '인증만료일', 'NO'
    │
    ├─► [내부 fetch] POST /api/admin/products/bulk
    │   - cookie 전달 (인증 세션 유지)
    │   - body: { rows, dry_run, auto_create_category: true }
    │
    │   bulk route 가 처리:
    │   ┌─ 행마다 pick() 로 영문/한글 alias 인식
    │   │   - label: 'label' / '상품 이름' / '상품이름' / '품목명' / '상품구성' / ...
    │   │   - category: 'category' / '분류' / '품목군' / '구성'
    │   │   - device_cost: '원가' / '단가' / '렌탈가' / '판매가(기본)' / ...
    │   │   - customer_price: '고객 가격' / '판매가' / '일시불' / ...
    │   │   - default_commission: '우리 수당' / '마진' / ...
    │   ├─ KO_CATEGORY[categoryRaw] → 영문 코드 ('포스기' → 'pos')
    │   ├─ code 비어있으면 label 로 자동 생성 (slug)
    │   ├─ 약정 한글 매핑 ('1년' → '12개월')
    │   ├─ 검증 (label/category 필수)
    │   ├─ existingCodes 와 비교 → insert vs update 결정
    │   ├─ dry_run=true → results 만 반환
    │   └─ dry_run=false → INSERT/UPDATE 실행
    │
    └─► 결과 → product_sync_config 기록 + 어드민 표시
    ▼
[페이지 갱신] preview / 마지막 결과 카드 / 최근 상품
```

### 2.2 표준 헤더 11개

```
상품 이름 | 분류 | 공급사 | 원가 | 우리 수당 | 고객 가격 |
약정 기간 | 월 정기 결제 | 월 결제 금액 | 단말기 종류 | 메모
```

### 2.3 자동 인식 헤더 (alias)

`app/api/admin/products/bulk/route.ts` 의 `pick(r, ...keys)` 호출에 등록된 키:

| 표준 헤더 | 자동 인식되는 다른 표기 |
|---|---|
| 상품 이름 | label, 상품이름, 이름, 상품명, 품목명, **상품구성** |
| 분류 | category, 카테고리, **품목군**, **구성** |
| 공급사 | vendor, 공급 회사, 공급회사, **공급사**, 본사, 회사, 제조사 |
| 원가 | device_cost, 원가 1대, 원가(1대), 기기 값, 기기값, 기기 매입가, **원가**, **단가**, **렌탈가**, **매입가**, **판매가(기본)** |
| 우리 수당 | default_commission, 우리수당, 수당, 마진 |
| 고객 가격 | customer_price, 고객가격, 가격, 판매가, **일시불** |
| 약정 기간 | default_period, 약정기간, 약정, 계약 기간 |
| 월 정기 결제 | is_subscription, 월정기결제, 월결제, 정기결제 |
| 월 결제 금액 | default_monthly, 월결제금액 |
| 메모 | note, 비고, 특이사항, **제품설명**, 설명 |

(굵게 = NIT/네이버 렌탈표 표기)

## 3. paid-media 페이지 — 데이터 매칭 흐름

### 3.1 시퀀스

```
[/admin/dashboard/paid-media] 페이지 진입
    │
    ▼
[loadPaidMediaSummary(preset)] (lib/admin/paid-media.ts)
    │
    ├─► resolvePeriod(preset) → { from, to, label } (KST)
    │
    ├─► 병렬 fetch:
    │   ┌─ channel_mapping 전체
    │   ├─ ad_metrics where date IN range
    │   ├─ consultations where created_at IN range
    │   └─ revenue_records where recognized_at IN range
    │
    ├─► consultation_ids → 별도 IN 쿼리로 utm 추가 fetch
    │   (revenue_records 의 매출 utm 매칭용)
    │
    ├─► mappingByKey: Map<'source|medium', ChannelMappingRow>
    │   channelInfoByCode: Map<channel_code, { label, is_paid }>
    │
    ├─► [집계 1] ad_metrics → channel_code 기준 SUM
    │   ┌─ source='db_purchase' → dbPurchaseByCh (별도)
    │   └─ source='paid_media' → byCode
    │       - impressions, clicks, spend 누적
    │       - ad_leads += conversions (= 광고 측 리드)
    │
    ├─► [집계 2] consultations → utm 매칭 → channel_code → leads 카운트
    │   ┌─ matched = mappingByKey.get(src|med) || mappingByKey.get(src|'')
    │   ├─ code = matched?.channel_code ?? 'unmapped'
    │   ├─ row.leads += 1 (CRM 리드)
    │   └─ unmapped 면 unmappedSet 에 'source/medium' 추가
    │
    ├─► [집계 3] revenue_records → consultation_id 의 utm → channel_code → conversions 카운트
    │   ┌─ row.conversions += 1 (개통)
    │   └─ row.revenue += amount
    │
    ├─► [일별 시계열] byDate Map
    │   ┌─ ad_metrics spend 누적
    │   ├─ source='db_purchase' → leads += lead_qty (DB 매입 수량)
    │   ├─ source='paid_media' → ad_leads += conversions
    │   ├─ consultations → leads += 1 (CRM 리드)
    │   └─ revenue_records → conversions + revenue
    │
    ├─► [캠페인 드릴다운] byCampaign Map
    │   utm_campaign 기준 (consultations 만)
    │   leads / conversions / revenue
    │
    ├─► [지표 계산] (행별)
    │   ctr = clicks / impressions
    │   cvr = conversions / clicks (광고플랫폼 기준)
    │   ad_cpl = spend / ad_leads
    │   cpl = spend / leads (CRM 기준)
    │   cpa = spend / conversions (개통)
    │   roas = revenue / spend
    │   lead_cvr = conversions / leads (개통률)
    │
    ├─► [총합] 페이드 미디어 only (is_paid 만 합산)
    │   organic/direct/site 제외
    │
    └─► 반환:
        {
          totals,
          byChannel: ChannelPerformanceRow[],
          dailySeries: DailySeriesRow[],
          byCampaign: CampaignRow[],
          dbPurchaseTotals, dbPurchaseByChannel,
          range, unmappedLeadKeys
        }
```

### 3.2 광고 리드 vs CRM 리드 분리 (Phase E 추가)

| 컬럼 | 출처 | 의미 |
|---|---|---|
| `ad_leads` | `ad_metrics.conversions` SUM (source='paid_media') | 광고 플랫폼이 보고한 결과수 |
| `leads` | `consultations` count (utm 매칭) | 우리 사이트에 도착한 리드 |
| `conversions` | `revenue_records` count (utm 매칭) | 실제 매출/개통 |

→ ad_leads 와 leads 가 다른 경우:
- 광고 클릭 → 폼 도달 못 함 (어트리뷰션 누수)
- utm 캡쳐 실패 (utm 누락)
- 광고 플랫폼의 conversion 정의 차이

→ paid-media 페이지에서 둘 다 분리해서 보여줌 (보라 vs 블루).

### 3.3 매체별 표 컬럼 14개

```
| 매체 | 노출 | 클릭 | CTR | 광고비 |
| 광고 리드 (보라) | 광고 CPL (보라+amber) |
| CRM 리드 (블루) | CRM CPL (블루+amber) |
| 개통 | CPA | 매출 | ROAS | 개통률 |
```

## 4. 매출 등록 → GA4/Meta CAPI 발사

### 4.1 시퀀스

```
[/admin/consultations] 상담 상세 → RevenueModal 열기
    │
    ▼
[POST /api/admin/revenue]
  body: { consultation_id, amount, product_id, recognized_at, source }
    │
    ├─► revenue_records INSERT
    │
    ├─► consultation 의 utm + 고객 정보 조회
    │   (GA4/Meta 매칭용)
    │
    ├─► [GA4 Measurement Protocol]
    │   POST https://www.google-analytics.com/mp/collect
    │   payload: {
    │     client_id (고객 식별),
    │     events: [{ name: 'purchase', params: { value, currency, transaction_id, items } }]
    │   }
    │   → 환경변수 GA4_MEASUREMENT_ID + GA4_API_SECRET 필요
    │   → 미설정 시 no-op (안전)
    │
    ├─► [Meta Conversions API]
    │   POST https://graph.facebook.com/.../{pixel_id}/events
    │   payload: {
    │     data: [{
    │       event_name: 'Purchase',
    │       event_time, event_id (dedupe key),
    │       custom_data: { value (= net 마진), currency, content_ids },
    │       user_data: { fbc, fbp, em, ph (해시) }
    │     }]
    │   }
    │   → 환경변수 META_PIXEL_ID + META_CAPI_TOKEN 필요
    │   → 미설정 시 no-op
    │
    └─► 응답: revenue_records row + 발사 결과
```

### 4.2 폼 제출 시 (이전 단계, 1차 추정값)

폼 제출 → consultation 등록 시점에 미리:

```
[POST /api/consultations] (public)
  │
  ├─► consultations INSERT (utm 자동 캡쳐)
  ├─► auto-distribution → assigned_to 결정
  │
  ├─► [GA4 generate_lead]
  │   value = NEXT_PUBLIC_LEAD_DEFAULT_VALUE (fallback 30000)
  │
  └─► [Meta CAPI Lead 이벤트]
      value = 추정 net 마진
      event_id = 브라우저 픽셀 Lead 와 dedupe
```

→ 매출 시점에 net 마진을 동적으로 보정 (`A-3` 단계).

## 5. 슬랙 알림 흐름

### 5.1 채널 매핑

`slack_channels` 테이블의 key 로 매칭:

```ts
sendToSlackChannel('alerts_warning', { text: '...' })
  ↓
slack_channels.where(key='alerts_warning').channel_id 조회
  ↓
fetch('https://slack.com/api/chat.postMessage', {
  headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
  body: { channel: channel_id, text: ... }
})
```

### 5.2 자동 알림 위치

| 트리거 | 채널 | 내용 |
|---|---|---|
| ad-sync 완료 | `alerts_warning` | source/site/rows/unmapped |
| product-sync 완료 | (미연결) | TODO: 추후 추가 |
| alert_rules 발사 | 룰별 채널 | CPA 임계 초과 등 |
| 새 상담 도착 | `new_lead` (또는 별도) | 미구현 |
| 매출 등록 | `revenue` (또는 별도) | 미구현 |
| 슬랙 DM (담당자) | 사용자별 `slack_user_id` | `/admin/users` 에서 설정 |

## 6. 상담 자동 분배 흐름

### 6.1 시퀀스

```
[POST /api/consultations] (public, 폼 제출)
    │
    ├─► consultations INSERT (status='new', assigned_to=null)
    │
    ├─► [중복 체크] abuse_blocklist + 같은 전화번호 24h 내 상담
    │   - 중복이면 blocked_reason 설정, 분배 안 함
    │
    ├─► [분배 룰 평가] distribution_rules
    │   - 활성 룰 우선순위 순회
    │   - 조건 매칭 (utm, industry, region 등)
    │
    ├─► [가중치 선택] admin_users where distribution_enabled=true
    │   - distribution_paused_until 이 미래면 제외
    │   - distribution_weight 가중 랜덤 → 1명 선택
    │
    ├─► UPDATE consultations SET assigned_to = ...
    │
    └─► [슬랙 DM] (옵션) 담당자에게 알림
```

### 6.2 재분배

미배정 상담을 다시 돌리고 싶을 때:
```
POST /api/admin/distribution/redistribute
  → assigned_to IS NULL 인 상담 일괄 재처리
```

## 7. 코호트 분석 흐름 (매출)

### 7.1 뷰 정의

`v_revenue_cohort_daily`:
```sql
SELECT
  date_trunc('day', c.created_at) as cohort_date,
  channel_code(c.utm_source, c.utm_medium) as channel,
  date_trunc('day', r.recognized_at) as recognized_date,
  SUM(r.amount) as revenue,
  COUNT(*) as conversions
FROM consultations c
JOIN revenue_records r ON r.consultation_id = c.id
GROUP BY 1, 2, 3
```

`v_revenue_cohort_matrix`:
```sql
SELECT
  channel,
  cohort_date,
  recognized_date - cohort_date as days_after,
  SUM(revenue) as cumulative_revenue
FROM v_revenue_cohort_daily
GROUP BY 1, 2, 3
```

### 7.2 페이지에서 사용

`/admin/dashboard/sales`:
- `CohortMatrix.tsx` — channel × cohort_date 매트릭스 (셀: 누적 매출)
- `CohortBreakdown.tsx` — 선택 channel 의 days_after × revenue 차트

## 8. 다음 문서로

- 디자인 시스템 → `07_DESIGN_SYSTEM.md`
- 알려진 이슈 → `08_OPEN_ISSUES.md`
