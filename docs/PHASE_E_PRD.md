# Phase E PRD — 시트 광고 데이터 어드민 100% 이관 (v2)

> **목표**: `우리편_광고 성과 파이프라인 (v2.0)` 시트의 광고비/매체 효율 데이터를 어드민 URL 입력만으로 ad_metrics에 자동 이관. `/admin/dashboard/paid-media`에서 시트와 동일한 매체×서비스 효율 표시.  
> **범위**: 광고비/리드/매체별 효율만. 인센티브/지출/손익은 Phase F~G.  
> **작성일**: 2026-05-27 (v2: 사용자 정정사항 반영)  
> **상태**: 코드 작성 완료 — prod 적용 검수 대기

## v2 정정사항 (2026-05-27 대웅 피드백)

1. **4-5월 데이터는 우리편(wooripen) 데이터**, 오즈랩 아님. 일단 같은 ad_metrics에 넣되 `site='wooripen'`으로 구분. 오즈랩 본격 빌드 후 `DELETE WHERE site='wooripen'` 한 줄로 정리.
2. **시트의 헤더/탭 이름 그대로 사용** — 시트 측 변경 없이 어드민 쪽에서 받기만 잘 함. (`_서비스분류`, `외부디비` 탭 / 9컬럼 헤더 그대로)
3. **즉시 진행** — PRD 검수 없이 코드 작성까지 한 번에.

---

## 1. 배경 & 문제

### 1.1 현재 작동 중인 시스템
- `/admin/dashboard/paid-media` 페이지 ✅
- `ad_metrics` 테이블 + `channel_mapping` (utm 정규화) ✅
- `ad_sync_config.sheet_csv_url` (DB매입) + `sheet_csv_url_paid` (페이드미디어) ✅
- ad-sync API: 한글 헤더 매핑 + Google Sheets URL 자동 변환 ✅

### 1.2 갭

| 갭 | 영향 |
|---|---|
| 시트의 `통합데이터` 탭에는 캠페인×상세타겟까지 raw — 현재 sync는 (date, channel, service) 단위로만 upsert → **같은 (날짜, 매체) 행 14개 평균 충돌, 마지막만 남음** | 매체별 광고비 합산 부정확 |
| 시트 매체값('네이버 검색광고', '메타 비즈니스', '당근 비즈니스', '구글ads')이 channel_mapping의 channel_code(naver-search, meta-ads, daangn-ads, google-ads)와 직접 매핑 안 됨 | KPI 합산 시 페이드 미디어 매체 인식 실패 |
| service 컬럼이 비어있어 (`''`) 서비스별 효율(토스단말기/인터넷가입/티오더) 분해 불가 | "광고매체별 개별 효율" 요구사항 미달 |
| 시트 첫 번째 탭이 `통합데이터` (캠페인/키워드 raw) — 사용자가 만든 정답 분류는 `_서비스분류` 탭에 있음 | 어떤 탭을 sync할지 미정 |

### 1.3 사용자 요구사항 (2026-05-27 OK)

1. **스프레드시트 URL 어드민 입력 → 광고비/매체별 효율 자동 적재**
2. **광고매체별 개별 효율** 우선 (인센티브/지출/손익은 다음 스텝)
3. **4-5월 시트 데이터 전부 마이그레이션**
4. **시트 URL 입력 방식 유지** (CSV 일괄 업로드 아님)

---

## 2. 솔루션 개요

### 2.1 데이터 흐름

```
[시트 URL — _서비스분류 탭]
  헤더: 날짜·매체·캠페인·키워드·광고비·노출수·클릭수·전환수·서비스
        ↓
[ad-sync API POST]
  1. CSV fetch
  2. CSV 파싱
  3. 매체값 → channel_code 정규화 (sheet_channel_alias 신규 테이블 or 하드코딩 룰)
  4. (date, channel_code, service) 단위로 행 집계 (광고비/노출/클릭/전환 SUM)
  5. ad_metrics UPSERT (source='paid_media')
        ↓
[/admin/dashboard/paid-media]
  - 매체×서비스 KPI (광고비/리드/CPL/CPA/ROAS)
  - 일별 추이
  - 캠페인 드릴다운 (consultations.utm_campaign 기반 — 변경 없음)
```

### 2.2 핵심 결정 사항

| 결정 | 채택 | 사유 |
|---|---|---|
| sync 대상 탭 | **`_서비스분류`** (gid=?, 4,466행) | 사용자가 만든 정답 service 컬럼 포함. 통합데이터+서비스 |
| ad_metrics 스키마 | **변경 없음** (집계 후 upsert) | (date, channel, service) unique 그대로. 캠페인 raw는 페이지에서 안 씀 (utm_campaign 사용) |
| 매체값 정규화 | **`sheet_channel_alias` 신규 테이블** | 어드민에서 편집 가능. 한글 매체값 ↔ channel_code 매핑. 향후 새 매체 추가 시 SQL 없이 어드민에서 |
| service 자동 분류 | **시트 service 컬럼 그대로 사용** | 사용자가 이미 분류한 결과 신뢰 |
| 4-5월 데이터 | **임시 스크립트로 일괄 import** | scripts/migrate_wooripen_sheet.ts (1회성) |

---

## 3. 변경 사항 (실제 적용된 코드)

### 3.0 마이그레이션 2개 (✅ 파일 작성 완료)

- `supabase/migrations/20260527040000_sheet_channel_alias.sql` — 시트 매체값 → channel_code 매핑 테이블 + 27종 시드 + RLS + RPC
- `supabase/migrations/20260527050000_ad_metrics_site.sql` — `ad_metrics.site` 컬럼 추가 + unique 인덱스 (site, date, channel, service) 로 확장 + `ad_sync_config.site` 컬럼 추가

### 3.1 마이그레이션 (이전 V1 — 참고용)

**파일**: `supabase/migrations/20260527040000_sheet_channel_alias.sql`

```sql
-- =============================================================
-- Migration: 20260527040000_sheet_channel_alias
-- 시트 매체값 → channel_code 매핑 테이블
-- =============================================================
-- 배경 :
--   시트 매체 컬럼값은 한글 ('네이버 검색광고', '메타 비즈니스' 등).
--   channel_mapping 은 utm_source/utm_medium 기반이라 직접 매핑 불가.
--   시트값 → channel_code 1:1 매핑 별도 테이블 필요.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.sheet_channel_alias (
  id           bigserial PRIMARY KEY,
  sheet_value  text NOT NULL UNIQUE,        -- 시트 매체 컬럼값 (한글)
  channel_code text NOT NULL,                -- 정규화된 channel_code
  notes        text,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sheet_channel_alias_code
  ON public.sheet_channel_alias (channel_code);

-- 시드 — 우리편 시트 매체값
INSERT INTO public.sheet_channel_alias (sheet_value, channel_code, notes) VALUES
  ('네이버 검색광고',  'naver-search', '네이버 검색광고 SA'),
  ('메타 비즈니스',    'meta-ads',     '메타 비즈니스 (페이스북/인스타)'),
  ('당근 비즈니스',    'daangn-ads',   '당근마켓 비즈니스'),
  ('구글ads',          'google-ads',   '구글 광고'),
  ('구글 광고',        'google-ads',   '구글 광고 — 한글 표기'),
  ('youtube ads',      'youtube-ads',  '유튜브 광고'),
  ('카카오 모먼트',    'kakao-ads',    '카카오 모먼트')
ON CONFLICT (sheet_value) DO NOTHING;

-- RLS
ALTER TABLE public.sheet_channel_alias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sheet_channel_alias_admin_read"
  ON public.sheet_channel_alias FOR SELECT
  USING (true);

CREATE POLICY "sheet_channel_alias_admin_write"
  ON public.sheet_channel_alias FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'marketing', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'marketing', 'admin')
    )
  );

COMMENT ON TABLE public.sheet_channel_alias IS '시트 매체 컬럼값 → channel_code 정규화 매핑. 어드민에서 편집 가능.';

-- END --
```

### 3.2 ad-sync API 확장

**파일**: `app/api/admin/ad-sync/route.ts`

#### 변경 1 — `normalizeRow` 함수에 service 보존 + 새 헤더 매핑

```typescript
// 기존:
service: get('service', '서비스', '상품군') || '',

// 추가 헤더 매핑 :
// '캠페인' 컬럼은 무시 (캠페인별 raw는 ad_metrics에 저장 안 함)
// '키워드' 컬럼도 무시
```

#### 변경 2 — `syncOneSheet` 함수에 매체값 정규화 + 사전 집계 추가

```typescript
async function syncOneSheet(
  type: SourceType,
  rawUrl: string,
): Promise<...> {
  // ... 기존 CSV fetch + parse ...

  // [NEW] 매체값 정규화 매핑 로드
  const admin = createAdminClient()
  const { data: aliases } = await admin
    .from('sheet_channel_alias')
    .select('sheet_value, channel_code')
  const aliasMap = new Map(
    (aliases ?? []).map((a) => [a.sheet_value.trim().toLowerCase(), a.channel_code])
  )

  // [CHANGE] 행 매핑 시 매체값 정규화
  const rows = parsed
    .map((r) => ({ ...r, dateNorm: normalizeDate(r.date) }))
    .filter((r) => r.dateNorm && r.channel)
    .map((r) => ({
      date: r.dateNorm as string,
      channel: aliasMap.get(r.channel.trim().toLowerCase()) ?? r.channel,  // [NEW]
      service: r.service,
      impressions: r.impressions,
      clicks: r.clicks,
      conversions: r.conversions,
      spend: r.spend,
      lead_qty: r.lead_qty,
    }))

  // [NEW] 사전 집계 — (date, channel, service) 단위로 SUM
  const aggMap = new Map<string, typeof rows[0]>()
  for (const r of rows) {
    const key = `${r.date}|${r.channel}|${r.service}`
    const existing = aggMap.get(key)
    if (existing) {
      existing.impressions += r.impressions
      existing.clicks += r.clicks
      existing.conversions += r.conversions
      existing.spend += r.spend
      existing.lead_qty += r.lead_qty
    } else {
      aggMap.set(key, { ...r })
    }
  }
  const aggregated = Array.from(aggMap.values()).map(r => ({
    ...r,
    source: type,
    synced_at: new Date().toISOString(),
  }))

  // ... upsert (기존 그대로) ...
}
```

#### 변경 3 — sync 실패 시 진단 메시지 강화

- 매핑 안 된 시트 매체값이 있으면 결과에 `unmapped_channels` 배열 포함
- 슬랙 알림에도 unmapped 매체 표시

### 3.3 일괄 마이그레이션 스크립트 (1회성)

**파일**: `scripts/migrate_wooripen_sheet.ts`

```typescript
// ─────────────────────────────────────────────
// 우리편 시트 4-5월 데이터 일괄 import
// 사용법:
//   tsx scripts/migrate_wooripen_sheet.ts
// 환경변수:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (.env.local)
// ─────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const SHEET_ID = '1tHMGXEjhH-mFOsonG3ReFqiRng9K2E6FLd3fjsl6K0E'

// _서비스분류 탭 gid는 시트 메타에서 가져옴 (예: 1234567890)
const SERVICE_TAB_GID = '__TO_BE_FILLED__'  // 시트에서 _서비스분류 탭의 gid 확인 필요

const EXTERNAL_DB_TAB_GID = '__TO_BE_FILLED__'  // 외부디비 탭 gid

async function main() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1) sheet_channel_alias 로드
  const { data: aliases } = await supabase.from('sheet_channel_alias').select('*')
  const aliasMap = new Map((aliases ?? []).map(a => [a.sheet_value.trim().toLowerCase(), a.channel_code]))

  // 2) _서비스분류 fetch + 파싱
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SERVICE_TAB_GID}`
  const csv = await (await fetch(url)).text()
  // ... 파싱 + (date, channel, service) 집계 + upsert ...

  // 3) 외부디비 fetch + 파싱 + upsert (source='db_purchase')
  // ...

  // 4) 검증 — 시트 합계 vs DB 합계
  // ...
}

main().catch(console.error)
```

### 3.4 (선택) 어드민 페이지 — sheet_channel_alias 편집

**파일**: `app/admin/(shell)/settings/sheet-channel-alias/page.tsx` (신규)

- 현재는 SQL 직접 편집 (Phase E 범위 밖, 추후)
- Phase F~G에서 어드민 페이지 추가

---

## 4. 검증 계획

### 4.1 시트 vs DB 합계 ±0% 검증

| 기간 | 지표 | 시트 값 (기대) | DB 값 (검증) |
|---|---|---:|---:|
| 2026-04 | 페이드 광고비 합 | 22,963,780 | ? |
| 2026-04 | 페이드 디비 합 | 513 | ? |
| 2026-04 | 외부DB 매입수량 | 517 | ? |
| 2026-04 | 외부DB 매입비 | 15,510,000 | ? |
| 2026-05 | 페이드 광고비 합 | 285,991 | ? |
| 2026-05 | 외부DB 매입수량 | 272 | ? |

### 4.2 매체×서비스 매트릭스 (4월)

| 매체 \ 서비스 | 토스단말기 | 인터넷가입 | 티오더 |
|---|---:|---:|---:|
| google-ads | 649,713 | 1,390,543 | 0 |
| meta-ads | 2,982,998 | 1,077,484 | 2,992,238 |
| daangn-ads | 8,294,591 | 1,784,227 | 2,954,881 |
| naver-search | 0 | 392,856 | 0 |

→ 어드민 `/admin/dashboard/paid-media`에서 위 표가 그대로 나와야 OK.

### 4.3 어드민 sync 동작 검증

1. `/admin/settings/ad-sync` 에서 시트 URL 입력 (`https://docs.google.com/spreadsheets/d/.../edit?gid=<_서비스분류>`)
2. "동기화" 버튼 클릭
3. 결과 메시지 — `4466행 동기화 완료` (또는 집계 후 ~150행)
4. paid-media 페이지에서 4월/5월 데이터 즉시 확인

---

## 5. 단계별 실행 순서

| # | 작업 | 산출물 | 소요 | 검수 포인트 |
|---|---|---|---|---|
| 1 | PRD 검수 (지금) | 본 문서 | - | 대웅 OK |
| 2 | 마이그레이션 SQL 작성 | `20260527040000_sheet_channel_alias.sql` | 0.5h | SQL diff 검수 |
| 3 | ad-sync API 변경 작성 | `route.ts` diff | 1h | 코드 diff 검수 |
| 4 | 일괄 마이그레이션 스크립트 작성 | `scripts/migrate_wooripen_sheet.ts` | 1h | 스크립트 검수 |
| 5 | 로컬 dry-run | (콘솔 출력만) | 0.5h | 합계 검증 결과 |
| 6 | prod 마이그레이션 apply | DB 변경 | 0.1h | Supabase 마이그레이션 로그 |
| 7 | prod 코드 배포 (Vercel) | git push + auto deploy | 0.2h | 배포 성공 |
| 8 | 어드민에서 시트 URL 입력 + sync | ad_metrics에 데이터 들어감 | 0.1h | 합계 일치 |
| 9 | paid-media 페이지 검증 | 매체×서비스 표 일치 | 0.5h | 표가 시트와 동일 |
| 10 | 메모리 업데이트 + 커밋 | `ozlab_paid_media_analytics` 메모리 수정 | 0.2h | - |

**총 예상 소요**: 4~5시간 (검수 단계 포함).

---

## 6. 리스크 & 완화

| 리스크 | 영향 | 완화 |
|---|---|---|
| _서비스분류 탭의 gid를 사용자가 알아야 sync 가능 | sync 작동 안 함 | 어드민 sync 페이지에 "시트 탭 선택 가이드" 추가 (HelpText) |
| sheet_channel_alias에 없는 매체값 들어오면 channel_code='네이버 검색광고' 같은 한글 그대로 들어감 → KPI 합산 누락 | KPI 부정확 | sync 결과에 unmapped 매체 목록 반환 + 슬랙 알림 |
| 4-5월 마이그레이션 도중 중복 행 발생 가능 | 데이터 오염 | upsert with onConflict='date,channel,service' (기존 그대로) |
| 시트의 캠페인/키워드 raw 손실 | 향후 캠페인 효율 분석 불가 | Phase G에서 ad_metrics_raw 신규 테이블 도입 검토 (현재 범위 밖) |
| paid-media 페이지의 캠페인 드릴다운은 consultations.utm_campaign 기반 — 시트와 별개 | 시트 캠페인과 일치 안 할 수 있음 | UTM_NAMING_GUIDE 강제 + 추후 매핑 추가 |

---

## 7. 메모리 업데이트 계획 (배포 후)

`ozlab_paid_media_analytics.md` 에 추가:

```markdown
## 시트 sync 정규화 (Phase E, 2026-05-27 적용)

`sheet_channel_alias` 테이블 — 시트 매체값('네이버 검색광고', '메타 비즈니스' 등) → channel_code 매핑.
ad-sync 시 자동 적용. 새 매체 추가 시 이 테이블만 편집.

sync 시 (date, channel, service) 사전 집계 후 upsert — 같은 키 충돌 없이 합산.

4-5월 우리편 시트 데이터 일괄 이관 완료 (4,466행 → ~150행 집계 후 ad_metrics).
```

---

## 8. Phase F 예고 (현재 범위 밖)

- 인센티브 시스템 (`incentive_rates` + `incentive_entries` + monthly view + 어드민 페이지)
- 지출 시스템 (`expenses` + 어드민 입력)
- 손익 통합 대시보드 (`/admin/dashboard/profit-loss`)
- 시트 폐기 ← 모든 Phase 완료 후

---

## 9. 검수 OK 후 진행할 일

대웅의 다음 OK 항목을 명시적으로 받은 후 코드 작업 시작:

- [ ] PRD 전체 검수 OK
- [ ] sheet_channel_alias 시드값 검수 (특히 '구글ads' vs '구글 광고' 등 표기 변형)
- [ ] _서비스분류 탭의 gid 확인 (시트 URL에서 #gid=... 끝번호)
- [ ] 4-5월 일괄 마이그레이션 dry-run 결과 검수
- [ ] prod 배포 OK

---

> 📌 본 PRD는 `wooripen_sheet_analysis.md` 분석 결과를 기반으로 작성. raw 데이터 분석 결과는 해당 문서 참조.
