# 05. API 라우트 명세

> 총 49개 라우트. 모든 어드민 API 는 `guardApi(allowedRoles)` 호출 필수.

## 0. 공통 패턴

### 인증 가드

```ts
// app/api/admin/.../route.ts
import { guardApi } from '@/lib/admin/auth-helpers'

export async function POST(req: NextRequest) {
  const guard = await guardApi(['super_admin', 'admin', 'marketer'])
  if (!guard.ok) return guard.response   // 401/403 자동 반환

  // guard.profile.user_id, guard.profile.role 사용 가능
  ...
}
```

### Supabase 클라이언트

```ts
import { createAdminClient } from '@/lib/supabase/admin'
// → SERVICE_ROLE_KEY 사용. RLS 우회.

import { createServerClient } from '@/lib/supabase/server'
// → 쿠키 기반 세션. RLS 적용.
```

### 응답 패턴

- 성공: `NextResponse.json(data)` (200)
- 4xx: `NextResponse.json({ error: '...' }, { status: 400 })`
- 5xx: `NextResponse.json({ error: error.message }, { status: 500 })`

### 동적 렌더링

캐싱 안 되어야 하는 라우트는 상단에:
```ts
export const dynamic = 'force-dynamic'
```

## 1. 인증 / 사용자

### `POST /api/admin/users/invite`
- 권한: `super_admin`
- Body: `{ email, role, display_name?, department? }`
- 동작: Supabase Auth 초대 → admin_users 행 생성

### `GET /api/admin/users`
- 권한: `super_admin`
- 응답: 사용자 목록 + 통계

### `PATCH /api/admin/users/[id]`
- 권한: `super_admin`
- Body: `{ role?, display_name?, distribution_enabled?, distribution_weight?, ... }`
- 동작: admin_users 업데이트

### `DELETE /api/admin/users/[id]`
- 권한: `super_admin`
- 동작: `is_active=false` (실제 삭제 안 함)

### `POST /api/admin/users/[id]/reset-password`
- 권한: `super_admin`
- 동작: Supabase Auth 비밀번호 재설정 메일 발송

### `POST /api/admin/users/[id]/transfer`
- 권한: `super_admin`
- Body: `{ to_user_id }`
- 동작: 이 사용자의 상담을 `to_user_id` 로 일괄 이관

## 2. 상담

### `GET /api/admin/consultations` (없음 — page.tsx 가 직접 fetch)

### `PATCH /api/admin/consultations/[id]`
- 권한: super_admin / admin / tm_lead / tm (본인 것)
- Body: `{ status?, assigned_to?, customer_name?, phone?, store_name?, customer_message?, opening_status?, ... }`
- 동작: consultations 업데이트 + status 변경 시 history row 자동

### `POST /api/admin/consultations/[id]/block`
- 권한: super_admin / admin
- Body: `{ reason }`
- 동작: 해당 연락처를 abuse_blocklist 에 추가

### `GET /api/admin/consultations/[id]/history`
- 권한: admin 권한
- 응답: 상태 변경 이력

### `POST /api/admin/consultations/bulk`
- 권한: admin
- Body: `{ ids: [], action: 'change_status' | 'assign', payload: {...} }`
- 동작: 일괄 상태 변경 / 일괄 분배

### `GET /api/admin/consultations/export`
- 권한: admin
- Query: 기간 필터
- 응답: CSV (한글 BOM)

### `POST /api/consultations` (public)
- 권한: 없음 (anon)
- Body: 폼 입력 (utm 자동 캡쳐)
- 동작: 새 consultation 생성 + 자동 분배 + 슬랙 알림

## 3. 매출

### `GET /api/admin/revenue`
- 권한: admin / marketing
- Query: 기간 + 필터
- 응답: revenue_records 목록

### `POST /api/admin/revenue`
- 권한: admin
- Body: `{ consultation_id, amount, product_id, recognized_at, source, note }`
- 동작: revenue_records 생성 + GA4 Measurement Protocol 발사 + Meta CAPI Purchase 발사

### `PATCH /api/admin/revenue/[id]`
- 권한: admin
- Body: 일부 필드 업데이트

### `DELETE /api/admin/revenue/[id]`
- 권한: admin

### `GET /api/admin/revenue/export`
- 권한: admin
- 응답: CSV

## 4. 상품

### `GET /api/admin/products`
- 권한: admin
- 응답: 전체 products 목록

### `POST /api/admin/products`
- 권한: admin / marketer
- Body: products 행
- 동작: products INSERT (code unique)

### `PATCH /api/admin/products/[id]`
- 권한: admin / marketer

### `DELETE /api/admin/products/[id]`
- 권한: admin
- 동작: `is_active=false` (실제 삭제 안 함)

### `POST /api/admin/products/bulk` ★

대량 업로드 / 한글 헤더 자동 인식.

- 권한: super_admin / admin / marketer
- Body:
  ```ts
  {
    rows: InputRow[],
    dry_run?: boolean,           // 기본 true (안전)
    auto_create_category?: boolean // 기본 true
  }
  ```
- 동작:
  1. 행별 정규화 + 검증
  2. category 가 한글이면 영문 코드로 변환 (KO_CATEGORY)
  3. label 만 있으면 code 자동 생성 (slug)
  4. dry_run=true → 검증 결과만
  5. dry_run=false → 신규 카테고리 INSERT + products INSERT/UPDATE
- 응답:
  ```ts
  {
    dry_run: boolean,
    results: [{ row_idx, code, label, category, action: 'insert'|'update'|'error', message?, new_category? }],
    summary: { total, insert, update, error, new_categories: [...] }
  }
  ```
- 에러 시: dry_run=false 인데 에러 행이 있으면 전체 거부 (400)

### `POST /api/admin/products/sync` ★ (Phase E 추가)

상품 시트 sync — bulk 의 래퍼.

- 권한: super_admin / admin / marketer / marketing
- Body: `{ dry_run?: boolean }` (기본 false)
- 동작:
  1. `product_sync_config.sheet_csv_url` 조회
  2. CSV fetch (자동 export 형식 변환)
  3. 파싱 → bulk API 내부 fetch 호출 (cookie 전달, 인증 유지)
  4. 결과를 `product_sync_config` 에 기록
- 응답:
  ```ts
  {
    success: boolean,
    dry_run: boolean,
    message: string,
    summary: { rows, inserted, updated, errors },
    bulkResult: {...}
  }
  ```

### `GET /api/admin/products/sync`
- 응답: `{ config, recent: products[] }`

### `PATCH /api/admin/products/sync`
- Body: `{ sheet_csv_url }`
- 동작: URL 저장

### `GET /api/admin/product-categories`
### `POST /api/admin/product-categories`
### `PATCH /api/admin/product-categories/[id]`

## 5. 광고 시트 sync (ad-sync) ★

### `GET /api/admin/ad-sync`
- 권한: super_admin / marketing / admin
- 응답: `{ config: AdSyncConfig, recent: ad_metrics[] }` (최근 50건)

### `PATCH /api/admin/ad-sync`
- Body: `{ sheet_csv_url? / sheet_csv_url_paid? / site? }`
- 동작: URL 또는 site 저장

### `POST /api/admin/ad-sync` ★

- 권한: super_admin / marketing / admin
- Body:
  ```ts
  {
    type?: 'db_purchase' | 'paid_media',  // 없으면 둘 다
    site?: string                          // 기본 'ozlab'
  }
  ```
- 동작:
  1. ad_sync_config 에서 URL 로드 + site 결정
  2. type 별로 (또는 둘 다) syncOneSheet 호출
  3. 각각:
     - CSV fetch (edit→csv 자동 변환)
     - normalizeRow (한글 헤더 → 표준 필드)
     - sheet_channel_alias 매핑 (한글 매체값 → channel_code)
     - (date, channel, service) 사전 집계 SUM
     - ad_metrics UPSERT (`onConflict: 'site,date,channel,service'`)
  4. 결과 → ad_sync_config 기록
  5. 슬랙 알림 broadcast (`alerts_warning`)
- 응답:
  ```ts
  {
    success: boolean,
    results: [{
      type,
      status: 'success' | 'error',
      rows,
      message,
      normalizedUrl?,
      unmappedChannels?: string[]   // 매핑 안 된 매체값
    }]
  }
  ```

## 6. 채널 / utm

### `GET /api/admin/channel-mapping` (현재 없음, 추후 추가 예정)
- 어드민 편집 페이지 신설 시 추가

## 7. 슬랙

### `GET /api/admin/slack/channels`
- 응답: 채널 목록

### `POST /api/admin/slack/channels`
- Body: `{ key, channel_id, label, is_active }`

### `PATCH /api/admin/slack/channels/[id]`

### `POST /api/admin/slack/test`
- Body: `{ channel_key, message }`
- 동작: 즉시 발사

## 8. 알림 룰

### `GET /api/admin/alert-rules`
### `POST /api/admin/alert-rules`
### `PATCH /api/admin/alert-rules/[id]`
### `DELETE /api/admin/alert-rules/[id]`

### `POST /api/admin/alert-rules/[id]/evaluate`
- 동작: 룰을 즉시 평가 → 조건 만족 시 슬랙 발사

## 9. 분배 (DB 정책)

### `GET /api/admin/distribution`
- 응답: 분배 룰 + TM 목록

### `POST /api/admin/distribution`
- Body: 분배 룰

### `PATCH /api/admin/distribution/users/[userId]`
- Body: `{ distribution_enabled?, distribution_weight?, distribution_paused_until?, ... }`

### `POST /api/admin/distribution/redistribute`
- 동작: 미배정 상담을 룰에 따라 재분배

## 10. 블랙리스트

### `GET /api/admin/blacklist`
### `POST /api/admin/blacklist`
### (DELETE 는 PATCH 로 해제 시간 설정)

## 11. 상담 옵션

### `GET /api/admin/consultation-options`
- 응답: 5종 옵션 풀

### `POST /api/admin/consultation-options`
- Body: `{ field, value, sort_order? }`

### `PATCH /api/admin/consultation-options/[id]`

### `GET /api/consultation-options` (public, 60s CDN 캐시)
- 응답: 활성 옵션만 (사이트의 상담 폼에서 사용)

## 12. 상담 정책

### `GET /api/admin/consultation-policy`
### `POST /api/admin/consultation-policy` (또는 PATCH)

## 13. CTA

### `GET /api/admin/cta`
### `POST /api/admin/cta`
### `PATCH /api/admin/cta/[id]`

## 14. 콘텐츠 / 미디어

### `GET /api/admin/content-blocks`
### `POST /api/admin/content-blocks` (history 자동)
### `POST /api/admin/content-blocks/upload` (이미지 업로드)

### `GET /api/admin/media`
### `POST /api/admin/media` (Supabase Storage 업로드)
### `DELETE /api/admin/media/[id]`

### `GET /api/admin/posts`
### `POST /api/admin/posts` (블로그 포스트)
### `PATCH /api/admin/posts/[id]`

### `POST /api/admin/landing-sections`

## 15. 사이트 설정

### `GET /api/admin/settings/head`
- 응답: site_settings 단일 row

### `PATCH /api/admin/settings/head`
- Body: `{ gtm_id?, ga4_id?, meta_pixel?, ... }`

### `GET /api/admin/page-seo`
### `POST /api/admin/page-seo` (또는 PATCH)

## 16. 상태 관리

### `GET /api/admin/statuses`
### `POST /api/admin/statuses`
### `PATCH /api/admin/statuses/[id]`

## 17. 권한 매트릭스

### `GET /api/admin/permissions`
### `POST /api/admin/permissions` (role-permission 토글)

## 18. Cron 라우트

### `GET /api/cron/alerts`
- Vercel Cron 호출용 (인증: secret header)
- 동작: 활성 alert_rules 평가 + 조건 만족 시 슬랙 발사

### `GET /api/cron/daily-digest`
- 일일 요약 슬랙 발사 (실 운영 미시작)

## 19. 라우트 추가 패턴

새 API 라우트 만들 때:

```ts
// app/api/admin/my-resource/route.ts

import { createAdminClient } from '@/lib/supabase/admin'
import { guardApi } from '@/lib/admin/auth-helpers'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// ─────────────────────────────────────────────
// GET — 목록 조회
// ─────────────────────────────────────────────
export async function GET() {
  const guard = await guardApi(['super_admin', 'admin'])
  if (!guard.ok) return guard.response

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('my_resource')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data ?? [] })
}

// ─────────────────────────────────────────────
// POST — 신규 생성
// ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const guard = await guardApi(['super_admin', 'admin'])
  if (!guard.ok) return guard.response

  const body = await req.json().catch(() => null)
  if (!body || !body.required_field) {
    return NextResponse.json({ error: 'required_field 누락' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('my_resource')
    .insert({ ...body, created_by: guard.profile.user_id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

[id] 동적 라우트:
```ts
// app/api/admin/my-resource/[id]/route.ts

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await guardApi(['admin'])
  if (!guard.ok) return guard.response

  const body = await req.json()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('my_resource')
    .update(body)
    .eq('id', params.id)
    .select()
    .single()

  ...
}
```

## 20. 에러 처리 패턴

| HTTP | 사용 시점 |
|---|---|
| 200 | 성공 |
| 400 | 입력 검증 실패 (필수 누락, 타입 오류) |
| 401 | 인증 안 됨 (guardApi 가 자동) |
| 403 | role 부족 (guardApi 가 자동) |
| 404 | 리소스 없음 (조회 실패) |
| 409 | 중복 충돌 (unique constraint) |
| 500 | Supabase 에러 등 서버 |

## 21. 다음 문서로

- 데이터 흐름 → `06_DATA_FLOWS.md`
- 디자인 → `07_DESIGN_SYSTEM.md`
