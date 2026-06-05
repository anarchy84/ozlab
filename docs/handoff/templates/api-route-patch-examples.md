# API 라우트 Cloudflare 패치 예시

> Phase 3 (호환성 패치) 작업 시 참조용 예시 모음.

## 1. Edge runtime 패치 (대부분의 어드민 API)

### Before (Vercel)
```ts
// app/api/admin/ad-sync/route.ts
import { createAdminClient } from '@/lib/supabase/admin'
import { guardApi } from '@/lib/admin/auth-helpers'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const guard = await guardApi(['super_admin', 'marketing'])
  ...
}
```

### After (Cloudflare Edge)
```ts
// app/api/admin/ad-sync/route.ts
import { createAdminClient } from '@/lib/supabase/admin'
import { guardApi } from '@/lib/admin/auth-helpers'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'           // ★ 추가
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const guard = await guardApi(['super_admin', 'marketing'])
  ...
}
```

→ 변경: `export const runtime = 'edge'` 한 줄 추가.

## 2. Node runtime 패치 (CSV export 등)

### Before
```ts
// app/api/admin/consultations/export/route.ts
import { Buffer } from 'buffer'  // Node-only?

export async function GET() {
  ...
  const csv = '...'
  return new Response(Buffer.from('﻿' + csv, 'utf-8'), { ... })
}
```

### After (Node runtime — Buffer 안전)
```ts
// app/api/admin/consultations/export/route.ts
import { Buffer } from 'buffer'

export const runtime = 'nodejs'         // ★ Node 명시
export const dynamic = 'force-dynamic'

export async function GET() {
  ...
}
```

### 또는 (Edge runtime — TextEncoder 로 우회)
```ts
export const runtime = 'edge'

export async function GET() {
  const csv = '﻿' + content        // BOM 직접 문자열
  return new Response(csv, {
    headers: { 'Content-Type': 'text/csv;charset=utf-8' }
  })
}
```

→ Edge 가 더 빠름. Buffer 대신 string 또는 Uint8Array 사용 권장.

## 3. Cron 라우트 — 인증 헤더

### Before (Vercel Cron)
```ts
// app/api/cron/sync-ads/route.ts
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-vercel-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  ...
}
```

### After (Cloudflare Cron — wrangler.toml scheduled handler 에서 헤더 추가)
```ts
// app/api/cron/sync-ads/route.ts
export const runtime = 'edge'

export async function GET(req: NextRequest) {
  // Cloudflare Cron 인증 — 모든 cron path 에 동일 헤더
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  ...
}
```

### wrangler 의 scheduled handler (OpenNext 가 자동으로 처리하지만 명시적 패턴):
```ts
// _worker.ts (OpenNext build output 에 hook)
export default {
  async fetch(req, env, ctx) {
    return handler(req, env, ctx)
  },
  async scheduled(event, env, ctx) {
    const cronToPath: Record<string, string> = {
      '0 18 * * *': '/api/cron/sync-ads',
      '0 19 * * *': '/api/cron/sync-products',
      '*/15 * * * *': '/api/cron/alerts',
    }
    const path = cronToPath[event.cron]
    if (!path) return

    ctx.waitUntil(
      fetch(`https://www.ozlabpay.kr${path}`, {
        headers: { 'x-cron-secret': env.CRON_SECRET },
      })
    )
  },
}
```

## 4. `next/image` 임시 패치

### Before
```tsx
import Image from 'next/image'

<Image src="/brand/oz-symbol.png" width={48} height={48} alt="OZ" />
```

### After 옵션 A: `unoptimized: true` (next.config.mjs)
```js
// next.config.mjs
const nextConfig = {
  images: {
    unoptimized: true,
  },
}
```

→ 변경: 이미지 사용 코드 그대로. `<Image>` 가 그냥 `<img>` 처럼 동작.

### After 옵션 B: Cloudflare Images 연결 (장기)
```js
// next.config.mjs
const nextConfig = {
  images: {
    loader: 'custom',
    loaderFile: './lib/image-loader.ts',
  },
}
```

```ts
// lib/image-loader.ts
export default function imageLoader({ src, width, quality }) {
  return `https://imagedelivery.net/<ACCOUNT_HASH>/${encodeURIComponent(src)}/w=${width},q=${quality || 80}`
}
```

→ 별도 $5/mo. 장기적으로 권장.

## 5. 동적 OG 이미지

### 이미 Edge 호환
```tsx
// app/opengraph-image.tsx
import { ImageResponse } from 'next/og'

export const runtime = 'edge'           // ★ 명시
export const alt = 'OZ labPay'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    <div style={{ background: 'linear-gradient(...)', ... }}>
      ...
    </div>,
    size
  )
}
```

→ OpenNext 자동 지원. 변경 없음.

## 6. Server Component cookie

### Before (Vercel + Next.js 14)
```ts
// app/admin/(shell)/layout.tsx
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'

export default async function AdminLayout({ children }) {
  const cookieStore = cookies()
  const supabase = createServerClient(/* ... */)
  ...
}
```

### After (Cloudflare — 동일)
변경 없음. OpenNext 가 `next/headers` 지원.

## 7. Streaming Response (이미 Edge 호환)

```ts
export const runtime = 'edge'

export async function GET() {
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue('chunk 1')
      // ...
      controller.close()
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' }
  })
}
```

→ 그대로 동작.

## 8. 외부 fetch (Supabase / Slack / GA4)

### 변경 없음
```ts
// Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const { data, error } = await supabase.from('table').select()

// Slack
await fetch('https://slack.com/api/chat.postMessage', {
  method: 'POST',
  headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
  body: JSON.stringify({ channel, text })
})

// GA4
await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${GA4_ID}&api_secret=${GA4_SECRET}`, {
  method: 'POST',
  body: JSON.stringify({ events: [...] })
})
```

→ Edge / Node 모두 동작.

## 9. 검증 패턴 — 라우트별 runtime 결정

| 라우트 | 권장 runtime | 이유 |
|---|---|---|
| `app/api/admin/ad-sync/route.ts` | `edge` | fetch + Supabase |
| `app/api/admin/products/bulk/route.ts` | `edge` 또는 `nodejs` | CSV 파싱 — string 으로 충분하면 edge |
| `app/api/admin/products/sync/route.ts` | `edge` | 내부 fetch |
| `app/api/admin/consultations/export/route.ts` | `edge` | string concatenation |
| `app/api/admin/revenue/export/route.ts` | `edge` | 동일 |
| `app/api/admin/media/route.ts` | `nodejs` | Supabase Storage 업로드 (Buffer/Blob) |
| `app/api/admin/content-blocks/upload/route.ts` | `nodejs` | 동일 |
| `app/api/consultations/route.ts` (public) | `edge` | fetch |
| `app/api/cron/*` | `edge` | fetch |
| `app/opengraph-image.tsx` | `edge` ★ 필수 | `next/og` 의존 |
| `app/icon.tsx` | `edge` ★ 필수 | 동일 |

## 10. 일괄 패치 헬퍼 스크립트 (Phase 3 용)

```bash
# 모든 어드민 API 에 runtime 'edge' 추가
find app/api/admin -name 'route.ts' -exec \
  sed -i '' 's|^export const dynamic|export const runtime = '\''edge'\''\nexport const dynamic|' {} \;

# 또는 awk
for f in $(find app/api/admin -name 'route.ts'); do
  if ! grep -q 'export const runtime' "$f"; then
    awk '/^export const dynamic/ && !x {print "export const runtime = \"edge\""; x=1} 1' "$f" > "$f.tmp"
    mv "$f.tmp" "$f"
  fi
done

# 검증
grep -l 'export const runtime' app/api/**/*.ts | wc -l
# → 49 (모든 라우트)

# 타입체크
npm run typecheck

# 빌드
npm run build:cf
```

> 자동 적용 후 반드시 `git diff` 로 변경 확인.
