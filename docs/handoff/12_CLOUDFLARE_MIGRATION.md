# 12. Vercel → Cloudflare 전면 이전 — 마스터 플랜

> **인계 대상**: 자체 개발팀
> **작성일**: 2026-06-02
> **결정 시점**: 2026-06-02 (대웅 OK — 전체 이전 + 개발팀 직접 작업)
> **예상 일정**: 5~10일 (시니어 1명 풀타임) / 4~7일 (시니어 + 주니어 2명)
> **위험도**: 중 (Edge 런타임 호환성)
> **롤백**: Vercel 프로젝트 1주일 이상 유지 + DNS TTL 낮춤

## 1. 권장 도구 선택

### 1.1 OpenNext for Cloudflare (`@opennextjs/cloudflare`) — **권장**

| 항목 | 평가 |
|---|---|
| Next.js App Router 지원 | ★★★★★ (풀 호환) |
| Node.js API 지원 | ★★★★ (`nodejs_compat` flag) |
| 운영 안정성 | ★★★★ (Cloudflare 직접 협업) |
| 문서 | 우수 — https://opennext.js.org/cloudflare |
| 현재 시점 권장도 | ★★★★★ (2025년 표준) |

### 1.2 `@cloudflare/next-on-pages` — 비권장

deprecated 방향. 새 프로젝트는 OpenNext 로 가는 게 표준이 됨. 기존 next-on-pages 프로젝트도 OpenNext 로 마이그레이션 권장됨.

### 1.3 최종 선택

> **`@opennextjs/cloudflare` + Cloudflare Workers (Pages 가 아닌 Pure Workers)**

이유:
- App Router 풀 호환
- `nodejs_compat` flag 로 대부분 Node API 사용 가능
- Supabase 서버 SDK 동작 검증됨
- 동적 OG 이미지 / `next/image` 등 까다로운 케이스 지원
- 라우팅 / 헤더 / 쿠키 직접 제어 가능

## 2. 사전 체크리스트 (Phase 0)

### 2.1 코드 인벤토리

```bash
# Edge incompatible 코드 식별
grep -rn "from 'node:" app/ lib/         # node: 프리픽스 import
grep -rn "from 'fs'" app/ lib/           # fs 모듈
grep -rn "child_process" app/ lib/       # 프로세스 spawn
grep -rn "node-fetch" app/ lib/          # 옛 node-fetch
grep -rn "Buffer.from" app/ lib/         # Buffer 사용 (Edge 도 가능하지만 확인)
```

→ 결과 정리 후 패치 계획 수립.

### 2.2 환경변수 인벤토리

`.env.example` 기반으로 옮길 12개+ 변수:

```
NEXT_PUBLIC_SUPABASE_URL                  # public (브라우저 노출 OK)
NEXT_PUBLIC_SUPABASE_ANON_KEY              # public
SUPABASE_SERVICE_ROLE_KEY                  # SECRET ★
NEXT_PUBLIC_GTM_ID                         # public
NEXT_PUBLIC_LEAD_DEFAULT_VALUE             # public
GA4_MEASUREMENT_ID                         # SECRET ★
GA4_API_SECRET                             # SECRET ★
META_PIXEL_ID                              # public-ish (서버에서만 사용)
META_CAPI_TOKEN                            # SECRET ★
META_CAPI_TEST_CODE                        # (선택)
SLACK_BOT_TOKEN                            # SECRET ★
CRON_SECRET                                # SECRET (Phase J 추가 시)
```

→ `★` 는 Cloudflare Secrets 로 (`wrangler secret put`).

### 2.3 외부 의존성 인벤토리

| 외부 서비스 | 사용 패턴 | Edge 호환성 |
|---|---|---|
| Supabase (DB/Auth/Storage) | `@supabase/supabase-js` v2 (fetch 기반) | ✅ 동작 |
| Google Sheets CSV | `fetch(csvUrl)` | ✅ 동작 |
| Slack API | `fetch(slack.com/api/...)` | ✅ 동작 |
| GA4 Measurement Protocol | `fetch(google-analytics.com/mp/collect)` | ✅ 동작 |
| Meta Conversions API | `fetch(graph.facebook.com/...)` | ✅ 동작 |

→ 모두 fetch 기반이라 Edge 호환. 안심.

### 2.4 Next.js 버전 확인

```bash
cat package.json | grep '"next"'
# → "next": "14.x" (호환)
```

OpenNext for Cloudflare 가 Next 13.5+ 지원. 14는 풀 지원. 15는 일부 제약 있을 수 있음.

## 3. 8단계 마이그레이션 (Phase 0~7)

### Phase 0 — 사전 조사 + 백업 (0.5일)

```bash
# 1. 현재 prod 동작 베이스라인 캡처
# - 주요 페이지 스크린샷 (홈/어드민/paid-media/product-sync)
# - 환경변수 dump (Vercel CLI 또는 대시보드)

# 2. 별도 브랜치
git checkout -b migration/cloudflare

# 3. 위 § 2.1 인벤토리 실행
```

체크:
- [ ] Vercel 환경변수 모두 export (백업)
- [ ] 현재 prod 동작 풀 스크린샷
- [ ] Edge incompatible 코드 목록

---

### Phase 1 — OpenNext 설치 + 설정 (0.5일)

```bash
npm install -D @opennextjs/cloudflare wrangler @cloudflare/workers-types
```

### 1.1 `open-next.config.ts` 생성 (루트)

```typescript
import { defineCloudflareConfig } from '@opennextjs/cloudflare'
import r2IncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache'

export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
})
```

### 1.2 `wrangler.toml` 작성 (루트)

전체 예시는 `docs/handoff/templates/wrangler.toml.example` 참고. 핵심:

```toml
name = "ozlab"
main = ".open-next/worker.js"
compatibility_date = "2025-09-01"
compatibility_flags = ["nodejs_compat"]

[assets]
directory = ".open-next/assets"
binding = "ASSETS"

# 환경변수 (public — 코드에 노출 가능)
[vars]
NEXT_PUBLIC_GTM_ID = "GTM-N3HSNZPJ"
NEXT_PUBLIC_LEAD_DEFAULT_VALUE = "30000"

# R2 (ISR 캐시용)
[[r2_buckets]]
binding = "NEXT_INC_CACHE_R2_BUCKET"
bucket_name = "ozlab-next-cache"

# Cron (Vercel Cron 대체)
[triggers]
crons = []  # Phase 5 에서 활성화
```

### 1.3 `package.json` 스크립트 추가

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "build:cf": "opennextjs-cloudflare build",
    "deploy:cf": "opennextjs-cloudflare build && wrangler deploy",
    "preview:cf": "opennextjs-cloudflare build && wrangler dev"
  }
}
```

### 1.4 `next.config.mjs` 패치

```js
const nextConfig = {
  // ... 기존 설정
  // Edge 환경에서 이미지 최적화 사용 안 함 (임시)
  images: { unoptimized: true },
  // 외부 도메인 이미지는 그대로 OK
}
```

> 추후 Cloudflare Images ($5/mo) 연결 시 다시 활성화.

체크:
- [ ] `open-next.config.ts` 생성
- [ ] `wrangler.toml` 작성
- [ ] scripts 추가
- [ ] `next.config.mjs` images 패치

---

### Phase 2 — Cloudflare 프로젝트 생성 (0.5일)

### 2.1 R2 버킷 생성 (ISR 캐시용)

```bash
wrangler r2 bucket create ozlab-next-cache
```

### 2.2 Workers 프로젝트 생성

대시보드 → Workers & Pages → Create application → Workers → 빈 워커 생성 (이름: `ozlab`).

또는 CLI:
```bash
wrangler init ozlab --type none
```

### 2.3 환경변수 + Secrets 등록

```bash
# Public 변수 (wrangler.toml [vars] 에 있는 거 외)
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put GA4_MEASUREMENT_ID
wrangler secret put GA4_API_SECRET
wrangler secret put META_CAPI_TOKEN
wrangler secret put SLACK_BOT_TOKEN
wrangler secret put CRON_SECRET   # Phase 5 용
```

각 명령마다 값 입력 프롬프트 — Vercel 대시보드에서 복사해서 입력.

### 2.4 GitHub 연동 (옵션)

대시보드 → Workers → ozlab → Settings → Build → Connect GitHub.

브랜치: `main` (또는 `cloudflare-prod` 별도 브랜치 사용).
빌드 명령: `npm run build:cf`
출력 디렉토리: `.open-next`

체크:
- [ ] R2 버킷 생성
- [ ] Workers 프로젝트 생성
- [ ] Secrets 7개+ 등록
- [ ] GitHub 연동 (또는 수동 deploy 로 진행)

---

### Phase 3 — 호환성 패치 (2~3일, 가장 시간 소요)

### 3.1 API 라우트 runtime 명시

49개 API 라우트에 다음 중 하나 추가:

```ts
// Edge runtime (기본, 가장 빠름) — fetch 기반 작업만 있을 때
export const runtime = 'edge'

// 또는 Node runtime — Buffer / fs / etc 필요할 때
export const runtime = 'nodejs'

// 동적 라우트 (현재 모든 admin API)
export const dynamic = 'force-dynamic'
```

대부분 라우트는 `edge` 로 가능. **확인 필요한 라우트**:
- `app/api/admin/products/bulk/route.ts` — CSV 파싱 (Buffer 사용 가능성)
- `app/api/admin/consultations/export/route.ts` — CSV export
- `app/api/admin/revenue/export/route.ts` — CSV export
- `app/api/admin/media/route.ts` — 파일 업로드 (Storage 클라이언트)

→ 위 4개는 `nodejs` runtime 사용 고려.

### 3.2 Supabase 클라이언트

이미 `@supabase/supabase-js` v2 사용 중 (fetch 기반). **변경 없음**.

검증:
- `lib/supabase/admin.ts` — `createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false }})` 패턴 OK
- `lib/supabase/server.ts` — 쿠키 기반. `cookies()` API 호환 확인.
- `lib/supabase/browser.ts` — 클라이언트 전용. 영향 없음.

### 3.3 동적 OG 이미지

`app/opengraph-image.tsx` 의 `ImageResponse`:

```ts
import { ImageResponse } from 'next/og'  // ★ 새 경로

export const runtime = 'edge'   // 필수
export const alt = 'OZ labPay'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(...)
}
```

→ Edge 동작 확인. OpenNext 가 `next/og` 풀 지원.

### 3.4 파비콘 (`app/icon.tsx`)

동일하게 Edge runtime. 그대로 동작.

### 3.5 `next/image` 임시 패치

`next.config.mjs` 에 `images: { unoptimized: true }` 추가했으면 OK.

대안 (추후): Cloudflare Images 또는 외부 이미지 CDN.

### 3.6 Server Component Cookie 사용

```ts
// Server Component
import { cookies } from 'next/headers'

const supabase = createServerClient(url, anonKey, {
  cookies: { get: (n) => cookies().get(n)?.value, set, remove }
})
```

→ OpenNext 가 `next/headers` 지원. 그대로 동작.

### 3.7 Cron 라우트 인증

Cron 호출 시 인증 헤더 검증:

```ts
// app/api/cron/sync-ads/route.ts
export const runtime = 'edge'

export async function GET(req: NextRequest) {
  // Cloudflare Cron 호출 검증
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  // ...
}
```

→ Vercel 의 `x-vercel-cron-secret` 헤더와 다름. wrangler.toml 의 `[triggers]` 에서 헤더 추가 필요.

### 3.8 CSV 한글 BOM

CSV 응답에서 BOM 추가하는 코드:
```ts
const csv = '﻿' + content
return new Response(csv, { headers: { 'Content-Type': 'text/csv;charset=utf-8' }})
```

→ Edge 에서 동작 OK.

체크:
- [ ] 49개 API 라우트 runtime 명시
- [ ] Supabase 클라이언트 3개 검증
- [ ] OG 이미지 Edge 동작
- [ ] 파비콘 Edge 동작
- [ ] next/image 임시 패치
- [ ] CSV export 4개 Node runtime 검토
- [ ] Cron 인증 헤더 패턴 통일

---

### Phase 4 — 환경변수 + Secrets (0.5일)

### 4.1 매핑 표

| Vercel env | Cloudflare | 비고 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `wrangler.toml [vars]` | public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `wrangler.toml [vars]` | public |
| `NEXT_PUBLIC_GTM_ID` | `wrangler.toml [vars]` | public |
| `NEXT_PUBLIC_LEAD_DEFAULT_VALUE` | `wrangler.toml [vars]` | public |
| `SUPABASE_SERVICE_ROLE_KEY` | **Workers Secret** | `wrangler secret put` |
| `GA4_MEASUREMENT_ID` | Workers Secret | |
| `GA4_API_SECRET` | Workers Secret | |
| `META_PIXEL_ID` | `wrangler.toml [vars]` or Secret | 서버 only 사용이라 어느쪽도 OK |
| `META_CAPI_TOKEN` | **Workers Secret** | |
| `SLACK_BOT_TOKEN` | **Workers Secret** | |
| `CRON_SECRET` | **Workers Secret** | Phase 5 용 |

### 4.2 Preview 환경 별도 등록 (옵션)

```bash
wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env preview
```

→ Preview 배포 시 prod 와 분리된 값 사용 가능.

### 4.3 Cloudflare 대시보드에서 확인

Workers & Pages → ozlab → Settings → Variables → 모두 등록됐는지 확인.

체크:
- [ ] 환경변수 매핑 표 작성 (실제 값 포함)
- [ ] Secrets 7개+ `wrangler secret put` 실행
- [ ] Public vars `wrangler.toml [vars]` 등록
- [ ] Preview env 별도 (선택)

---

### Phase 5 — Cron Triggers (Vercel Cron 대체) (0.5일)

현재 Vercel Cron 비활성 상태 (`app/api/cron/*` 라우트만 있고 vercel.json 없음). Phase J 작업 시 활성화 예정.

Cloudflare 에서는:

### 5.1 `wrangler.toml`

```toml
[triggers]
crons = [
  "0 18 * * *",   # 03:00 KST — 광고 시트 sync
  "0 19 * * *",   # 04:00 KST — 상품 시트 sync
  "*/15 * * * *", # 15분마다 — alert_rules 평가
]
```

### 5.2 Worker fetch handler 안에서 cron 처리

OpenNext 가 자동으로 처리. 호출 URL 패턴:

```
https://ozlab.workers.dev/__scheduled?cron=0+18+*+*+*
```

→ 또는 라우트 매핑:
```ts
// 라우트 인식 패턴 — OpenNext 가 처리하니까 신경 안 써도 됨
```

### 5.3 Cron 라우트 → Cloudflare scheduled handler

또는 명시적으로 ScheduledEvent 처리:

```ts
// 별도 worker entry — open-next.config.ts 에서 설정
export default {
  async fetch(req, env, ctx) {
    // 일반 요청
    return openNextHandler(req, env, ctx)
  },
  async scheduled(event, env, ctx) {
    // cron 호출
    if (event.cron === '0 18 * * *') {
      ctx.waitUntil(fetch('/api/cron/sync-ads', { headers: { 'x-cron-secret': env.CRON_SECRET }}))
    }
  }
}
```

체크:
- [ ] `wrangler.toml [triggers]` 정의
- [ ] Cron 라우트 인증 패턴
- [ ] 로컬에서 `wrangler dev --scheduled` 로 테스트

---

### Phase 6 — 로컬 + Preview 테스트 (1~2일)

### 6.1 로컬 풀 테스트

```bash
# 빌드
npm run build:cf

# 로컬 워커 실행 (포트 8787)
npm run preview:cf

# 별도 터미널 — 일반 next dev 도 같이 (다른 포트)
PORT=3000 npm run dev
```

브라우저에서 `http://localhost:8787` 접속:

체크리스트:
- [ ] 홈 페이지 정상 표시
- [ ] 5개 랜딩 페이지 (홈/인터넷/CCTV/티오더/마케팅지원)
- [ ] 폼 제출 (utm 자동 캡쳐)
- [ ] 동적 OG 이미지 (`/opengraph-image`)
- [ ] 파비콘
- [ ] 어드민 로그인
- [ ] 어드민 24개 페이지 (특히 paid-media, product-sync, ad-sync)
- [ ] API 49개 라우트 (Supabase 호출)
- [ ] 시트 sync (실제 URL 로 dry_run)
- [ ] Slack 알림 (테스트 메시지)

### 6.2 Cloudflare Preview 배포

```bash
npm run deploy:cf -- --env preview
```

→ Preview URL (예: `ozlab-preview.workers.dev`) 에서 같은 검수 반복.

### 6.3 도메인 임시 연결 (검증용)

`staging.ozlabpay.kr` 같은 서브도메인 만들어서 Cloudflare 에 연결.

대시보드 → Workers → ozlab → Custom Domains → `staging.ozlabpay.kr` 추가.

→ Vercel 영향 없이 staging 환경에서 풀 검증 가능.

체크:
- [ ] 로컬 풀 검수 완료
- [ ] Preview 배포 + 검수
- [ ] staging 도메인으로 검수

---

### Phase 7 — DNS 컷오버 (0.5일 + 모니터링)

### 7.1 사전 — DNS TTL 낮추기

24시간 전:

```
Vercel 또는 도메인 등록자 → DNS 관리
www.ozlabpay.kr A/CNAME → TTL 300초 (5분)로 변경
```

### 7.2 컷오버 실행

**시점**: 트래픽 적은 시간 (예: 새벽 2시 KST)

```
1. Cloudflare 대시보드 → ozlab → Custom Domains
   - www.ozlabpay.kr 추가 (Cloudflare 가 자동으로 SSL 인증서 발급)
   - ozlabpay.kr 추가 (선택)

2. DNS 변경
   - www.ozlabpay.kr CNAME → ozlab.workers.dev
   - (Vercel 의 CNAME 제거 또는 백업으로 유지)

3. SSL 인증서 활성화 대기 (Cloudflare 자동, ~5분)

4. 검증
   - curl -I https://www.ozlabpay.kr
   - 응답 헤더에 'cf-ray' 있으면 Cloudflare 도달 OK
```

### 7.3 Vercel 백업 유지

- Vercel 프로젝트 삭제하지 말 것
- Vercel 도메인 alias 만 비활성화 (롤백용)
- 1주일 후 안정 확인되면 삭제

### 7.4 캐시 무효화

```bash
# Cloudflare 캐시 purge
wrangler --config wrangler.toml --env production secrets:purge
# 또는 대시보드에서 Cache → Purge Everything
```

체크:
- [ ] DNS TTL 낮춤 (24시간 전)
- [ ] Cloudflare Custom Domain 추가
- [ ] DNS 변경 + SSL 활성화 확인
- [ ] curl 응답 헤더에 cf-ray 확인
- [ ] Vercel 도메인 비활성화 (삭제 X)
- [ ] 캐시 purge

---

### Phase 8 — 모니터링 + 정리 (1~2일)

### 8.1 Cloudflare Analytics

대시보드 → Workers → ozlab → Analytics:
- 요청수 / 에러율 / 응답 시간
- 4xx / 5xx 에러 자세히

### 8.2 Workers Logs

```bash
# 실시간 로그 (Vercel runtime logs 대체)
wrangler tail
```

### 8.3 에러 알림 자동화 (Sentry 또는 Slack)

OpenNext 의 에러를 Slack 으로 자동 발사:

```ts
// open-next.config.ts 또는 별도 인터셉터
// 에러 발생 시 sendToSlackChannel('errors', { text: ... })
```

### 8.4 Vercel 정리 (1주 후)

- Vercel 프로젝트 삭제 (또는 일시중지)
- 도메인 alias 완전 제거
- 결제 정지

### 8.5 비용 모니터링

Cloudflare 대시보드:
- 요청수 (10M 이내 무료, 초과 시 $0.50/M)
- R2 저장량 (10GB 이내 무료)
- Workers Logs (별도 과금 가능)

체크:
- [ ] Analytics 활성화
- [ ] `wrangler tail` 동작 확인
- [ ] Slack 에러 알림 구성
- [ ] Vercel 정리 (1주 후)
- [ ] 비용 모니터링 첫 달 확인

---

## 4. 마이그레이션 후 운영 변화

| 항목 | Vercel (기존) | Cloudflare (이전 후) |
|---|---|---|
| 배포 | `git push main` 자동 | `git push` + GitHub 연동 또는 `wrangler deploy` |
| 빌드 로그 | Vercel 대시보드 | Cloudflare 대시보드 + `wrangler tail` |
| 환경변수 추가 | 대시보드 UI | `wrangler secret put` CLI |
| 도메인 추가 | 대시보드 UI | Custom Domain UI |
| 롤백 | 1클릭 (대시보드) | `wrangler rollback` 또는 이전 deployment 활성화 |
| Cron 추가 | `vercel.json` | `wrangler.toml [triggers]` |
| Image Optimization | 자동 | Cloudflare Images 별도 설정 (또는 unoptimized) |
| 한국 응답 속도 | iad1 (미국) | ICN (서울) 자동 — 더 빠름 |
| 모니터링 | Vercel Analytics | Cloudflare Analytics + Logs |

## 5. 위험 + 백업 플랜

### 5.1 컷오버 직후 문제 발생 시

1. **DNS 즉시 롤백** (Vercel 의 CNAME 다시 활성화)
2. TTL 300초라 5분 내 복원
3. 문제 원인 분석 → Cloudflare 다시 시도

### 5.2 부분 실패 시

- 어드민만 문제: 어드민 라우트만 Vercel 로 리다이렉트 (별도 Worker)
- 특정 API 만 문제: 해당 API path 만 Vercel 로 우회 (proxy)

### 5.3 데이터 손실 방지

- **Supabase 는 변경 없음** — 데이터 100% 안전
- 외부 fetch 도 변경 없음 (Sheets / Slack / GA4 / Meta)

## 6. 일정 표 (시니어 1명 풀타임 기준)

| Phase | 작업 | 일수 | 누적 |
|---|---|---|---|
| 0 | 사전 조사 + 백업 | 0.5 | 0.5 |
| 1 | OpenNext 설치 + 설정 | 0.5 | 1 |
| 2 | Cloudflare 프로젝트 생성 | 0.5 | 1.5 |
| 3 | 호환성 패치 | 2~3 | 3.5~4.5 |
| 4 | 환경변수 + Secrets | 0.5 | 4~5 |
| 5 | Cron Triggers | 0.5 | 4.5~5.5 |
| 6 | 로컬 + Preview 테스트 | 1~2 | 5.5~7.5 |
| 7 | DNS 컷오버 | 0.5 | 6~8 |
| 8 | 모니터링 + 정리 | 1~2 | 7~10 |

**총 7~10일**. 시니어 + 주니어 2명이면 병렬 진행으로 4~7일 가능.

## 7. 사전 결정 사항 체크리스트 (작업 시작 전)

- [ ] 컷오버 시점 (트래픽 적은 시간 — 새벽 권장)
- [ ] Vercel 정리 시점 (이전 후 1주? 2주?)
- [ ] 도메인 nameserver 변경 여부 (현재 어디 등록? Cloudflare 로 옮길지)
- [ ] Cloudflare 결제 카드 등록 (Workers Paid Plan $5/mo)
- [ ] R2 결제 (저장 10GB 이내 무료, 트래픽 EgressFree)
- [ ] Cloudflare Images 사용 여부 ($5/mo)
- [ ] CRON_SECRET 값 (랜덤 생성)
- [ ] 에러 알림 Slack 채널 결정

## 8. 참고 자료

- OpenNext for Cloudflare: https://opennext.js.org/cloudflare
- Cloudflare Workers + Next.js: https://developers.cloudflare.com/workers/frameworks/framework-guides/nextjs/
- Wrangler CLI: https://developers.cloudflare.com/workers/wrangler/
- Cloudflare Cron Triggers: https://developers.cloudflare.com/workers/configuration/cron-triggers/
- Supabase + Workers: https://supabase.com/docs/guides/getting-started/quickstarts/nextjs-cloudflare-workers

## 9. 다음 단계 (개발팀 작업)

1. 이 문서 + `04_ADMIN_UI.md` + `06_DATA_FLOWS.md` 읽기
2. Phase 0 실행 (사전 조사 + 인벤토리)
3. 결과를 대웅에게 보고 + 일정 협의
4. Phase 1~8 진행
5. 각 Phase 종료마다 대웅 검수

> 작업 중 의문은 `11_DECISIONS.md` 참조 또는 대웅에게 문의.
