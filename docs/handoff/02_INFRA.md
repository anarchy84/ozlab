# 02. 인프라 + 배포 + 환경변수

## 1. 서비스 구성

```
[GitHub] anarchy84/ozlab (main 브랜치)
   │  push 시 자동
   ▼
[Vercel] prj_azs67RpEaQCxtY3JwIp56Q5qQ1BS
   │  - Next.js 빌드 + Lambda 배포
   │  - 도메인: www.ozlabpay.kr (+ alias)
   ▼
[Supabase] vbdoyambycopigfajcgk (woori-nconnect)
   - Postgres 17.6.1 / ap-northeast-2 / ACTIVE_HEALTHY
   - Auth + RLS + Storage
```

## 2. Vercel

| 항목 | 값 |
|---|---|
| **Project ID** | `prj_azs67RpEaQCxtY3JwIp56Q5qQ1BS` |
| **Team** | `team_RLvSNvCKFPar1hqGQ6GF1e9I` (anarchy84's projects) |
| **Project name** | `ozlab` |
| **Framework** | Next.js (App Router) |
| **Runtime** | Node.js (lambda) |
| **Region** | `iad1` (Vercel 자동 선택) |
| **Main domain** | `www.ozlabpay.kr` |
| **Alias** | `ozlabpay.kr`, `ozlab-iota.vercel.app`, `ozlab-anarchy84s-projects.vercel.app` |
| **Branch alias** | `ozlab-git-main-anarchy84s-projects.vercel.app` |

### 배포 흐름

```
1. 로컬에서 git commit + push (main 브랜치)
2. GitHub → Vercel webhook 자동 트리거
3. Vercel build (next build) ~45초
4. Lambda 배포 + 도메인 alias 자동 갱신
5. state: READY → www.ozlabpay.kr 갱신
```

### 배포 상태 확인

- Vercel 대시보드: https://vercel.com/anarchy84s-projects/ozlab
- MCP로: `mcp__vercel__list_deployments`
- 마지막 5개 commit 모두 READY 상태 (2026-06-02 기준)

## 3. Supabase

| 항목 | 값 |
|---|---|
| **Project ID** | `vbdoyambycopigfajcgk` |
| **Project name** | `woori-nconnect` ⚠️ (이름이 ozlab 아님 — woori 시절 그대로 사용 중) |
| **Database host** | `db.vbdoyambycopigfajcgk.supabase.co` |
| **Postgres version** | 17.6.1.105 |
| **Region** | `ap-northeast-2` (서울) |
| **Status** | ACTIVE_HEALTHY |
| **Plan** | Pro (메모리: 결제 중) |
| **Sign-up** | **차단** 완료 (admin_users 만 운영) |

### 다른 프로젝트들 (참고)

같은 organization (`nvbjoftktnyviptcthjw`) 에 있는 다른 프로젝트:

| Project | ID | 용도 |
|---|---|---|
| `carepick-mvp` | `btglfxkbsfpugcnfrsrv` | (별도 서비스) |
| `wooripen` | `llnzuczikgvbxxujztao` | (구) 우리편 사이트 — consultations 만 있음 |
| `wrpmkt` | `gohkmgeovhnxwjnvtxta` | (별도) |
| `grit-app` | `lqotquxmmrshikevqnsg` | (별도) |
| **`woori-nconnect`** | **`vbdoyambycopigfajcgk`** | **← 오즈랩페이 사용** |

> ⚠️ **`wooripen` 프로젝트와 헷갈리지 말 것.** 오즈랩 어드민은 `woori-nconnect`(`vbdoyambycopigfajcgk`) 에 들어있다.

### Supabase 접근 방법

| 방법 | 비고 |
|---|---|
| Supabase Studio | https://supabase.com/dashboard/project/vbdoyambycopigfajcgk |
| SQL 직접 실행 | MCP `mcp__supabase__execute_sql` (안전: 변경 시 `apply_migration` 사용) |
| psql | `db.vbdoyambycopigfajcgk.supabase.co` (대웅 패스워드 보유) |

## 4. 환경변수 (.env.local + Vercel env)

`.env.example` 에 템플릿 있음. 실제 값은 `.env.local` (gitignore) + Vercel 환경변수에 동기화.

### 필수 변수

| 변수 | 용도 | 비고 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL | `https://vbdoyambycopigfajcgk.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (RLS 보호) | Supabase Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (RLS 무시) | **서버 라우트 전용**. 어드민 API 에서 사용 |

### 트래킹 변수

| 변수 | 용도 |
|---|---|
| `NEXT_PUBLIC_GTM_ID` | GTM 컨테이너 (현재 `GTM-N3HSNZPJ`, fallback 있음) |
| `NEXT_PUBLIC_LEAD_DEFAULT_VALUE` | GA4 generate_lead 추정값 (fallback 30000) |
| `GA4_MEASUREMENT_ID` | GA4 Measurement Protocol — 매출 시 서버에서 net 보정 |
| `GA4_API_SECRET` | GA4 API secret |
| `META_PIXEL_ID` | 메타 픽셀 ID |
| `META_CAPI_TOKEN` | 메타 Conversions API 액세스 토큰 |
| `META_CAPI_TEST_CODE` | (선택) 메타 검증 단계만 |

> 미설정 시 트래킹 헬퍼는 **no-op** (안전). 자세한 흐름은 `lib/seo.ts` 와 `app/api/admin/revenue/` 의 보정 로직.

### Slack 변수 (알림용)

`/admin/settings/slack` 에서 어드민이 관리 (DB 테이블 `slack_channels`). 환경변수는 봇 토큰만:

| 변수 | 용도 |
|---|---|
| `SLACK_BOT_TOKEN` | Slack Bot OAuth Token (`xoxb-...`) |

> 채널 ID·이름은 DB 로 관리. `lib/slack.ts` 의 `sendToSlackChannel(channelKey, ...)` 호출.

## 5. 로컬 개발 환경

### 요구사항

- **Node.js** v18+ (Next.js 14 요구. v20 권장)
- **npm** 또는 **pnpm**
- **Cursor** 또는 VSCode (사용자가 Cursor 사용 중)

### 시작

```bash
cd /Users/anarchy/Claud_Projects/ozlab

# 의존성 설치
npm install

# 환경변수 복사
cp .env.example .env.local
# → .env.local 에 실제 키 값 입력 (대웅에게 받기)

# 개발 서버
npm run dev
# → http://localhost:3000

# 타입 체크 (커밋 전 필수)
npm run typecheck

# 빌드 (배포 전 검증)
npm run build
```

### 어드민 진입

```
http://localhost:3000/admin/login
# → admin_users 테이블의 user_id 로 로그인 (Supabase Auth)
```

## 6. Supabase 마이그레이션 적용

### Supabase CLI 방식 (정석)

```bash
# Supabase CLI 설치
npm install -g supabase

# 로그인
supabase login

# 프로젝트 연결
supabase link --project-ref vbdoyambycopigfajcgk

# 새 마이그레이션 생성
supabase migration new my_migration_name

# 마이그레이션 적용 (prod)
supabase db push
```

### MCP 방식 (사용자가 했던 방식)

cowork/Claude 가 마이그레이션 작성 후 MCP 도구로 즉시 apply:

```
mcp__supabase__apply_migration({
  project_id: 'vbdoyambycopigfajcgk',
  name: 'my_migration_name',
  query: '<SQL>'
})
```

→ 마이그레이션 파일은 `supabase/migrations/` 에 저장. 파일명 규칙: `YYYYMMDDhhmmss_name.sql`.

> 자세한 마이그레이션 작성 규칙: `03_DB_SCHEMA.md`.

## 7. Git 흐름

### 일반 commit

```bash
git add <files>
git commit -m "feat(scope): 설명

상세:
- 변경 1
- 변경 2"
git push
```

### 알려진 이슈: Cursor + cowork git lock 충돌

Cursor 가 백그라운드 maintenance 프로세스를 돌려서 `.git/HEAD.lock`, `.git/index.lock`, `.git/objects/maintenance.lock` 을 잡고 있을 수 있음. cowork sandbox 에서 해제 못 함 (권한 문제).

→ 사용자가 직접 다음 명령으로 해제:
```bash
rm -f .git/HEAD.lock .git/index.lock .git/objects/maintenance.lock
```

> `08_OPEN_ISSUES.md` 에 상세.

## 8. 보안 / RLS

### Service Role Key 사용 규칙

- ❌ **클라이언트 코드에 절대 노출 금지** (브라우저 번들에 포함되면 RLS 우회 가능)
- ✅ 서버 라우트 (`app/api/**/route.ts`) 에서만 사용
- ✅ `lib/supabase/admin.ts` 의 `createAdminClient()` 헬퍼 사용 (env 검증)

### 어드민 인증 흐름

```
1. /admin/login → Supabase Auth (이메일/비밀번호)
2. 로그인 성공 시 admin_users 테이블 조회
   - user_id 일치 + is_active=true 인지 확인
   - role 확인 → 페이지/API 권한
3. 모든 어드민 API 라우트는 guardApi(allowedRoles) 호출 (lib/admin/auth-helpers.ts)
4. 어드민 페이지는 requireAdminProfile() 호출 후 role 체크
```

### RLS 정책 패턴

대부분 테이블은 다음 패턴:

```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- 읽기: anon 또는 어드민
CREATE POLICY "table_name_read" ON table_name FOR SELECT USING (true);

-- 쓰기: admin_users + role 체크
CREATE POLICY "table_name_admin_write" ON table_name FOR ALL
  USING (EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin', ...)
  ));
```

> 자세한 RLS 정책 목록: `03_DB_SCHEMA.md`.

## 9. 배포 트러블슈팅

| 증상 | 원인 / 해결 |
|---|---|
| Vercel build fail "Type error" | `npm run typecheck` 로 미리 확인. 마지막 5분 변경 확인 |
| Build pass but page 500 | Vercel 함수 로그 확인 (`mcp__vercel__get_runtime_logs`) |
| Supabase connection error | env 변수 (특히 SERVICE_ROLE_KEY) Vercel 에 동기화됐는지 확인 |
| Vercel 도메인 alias 갱신 안 됨 | Vercel 대시보드 → Domains 에서 수동 갱신 |
| GitHub push 후 Vercel 자동 빌드 안 됨 | webhook 끊김. Vercel → Settings → Git → 재연결 |

## 10. 모니터링 / 로그

| 종류 | 어디 |
|---|---|
| Vercel build logs | `mcp__vercel__get_deployment_build_logs(idOrUrl, teamId)` |
| Vercel runtime logs (lambda) | `mcp__vercel__get_runtime_logs(idOrUrl, teamId)` |
| Supabase query logs | Supabase Dashboard → Logs (Postgres / API / Auth) |
| Slack 알림 (광고 sync 결과 등) | `alerts_warning` 채널 |
| 어드민 활동 로그 | 현재 미구현. 추후 audit log 시스템 추가 검토 |

## 11. 다음 문서로

- 전체 DB 스키마 → `03_DB_SCHEMA.md`
- 어드민 페이지 명세 → `04_ADMIN_UI.md`
