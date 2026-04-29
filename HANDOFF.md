# 오즈랩페이 — 신규 Cowork 프로젝트 인수인계

> 작성일: 2026-04-29
> 분리 이유: 우리편(wooripen-web)과 오즈랩페이(ozlab)가 다른 사이트라서 컨텍스트 혼동 방지.

---

## 1. 프로젝트 정체

**오즈랩페이 (Ozlabpay)** — 자영업자 대상 POS · 카드단말기 제휴 가맹 프로모션 랜딩 사이트.

- 핵심 가치: **결제 + 리뷰 자동화 + 마케팅 + 홍보를 단말기 한 대로**
- 타겟: 음식점·카페·소매점 사장님 (중소사업자)
- 비즈 모델: POS 신규 가입 시 단말기 0원 + 네이버 플레이스 광고 무료 프로모션
- 현재 단계: 1차 랜딩 완성 (P0~P6 완료), 슬랙 알림(P6 D)만 환경변수 미설정

---

## 2. 기술 스택 / IDs

| 항목 | 값 |
|---|---|
| **로컬 폴더** | `/Users/anarchy/Claud_Projects/ozlab` |
| **GitHub** | `anarchy84/ozlab` (public, main 브랜치) |
| **프레임워크** | Next.js 14 App Router + TypeScript + Tailwind 3.4 |
| **DB** | Supabase 프로젝트 `vbdoyambycopigfajcgk` (woori-nconnect, 서울 리전) |
| **호스팅** | Vercel 프로젝트 `prj_azs67RpEaQCxtY3JwIp56Q5qQ1BS` (team_RLvSNvCKFPar1hqGQ6GF1e9I) |
| **메인 도메인** | `https://ozlabpay.kr` (호스팅케이알 구매, 2026-04-28 연결 완료) |
| **임시 도메인** | `https://ozlab-iota.vercel.app` |
| **어드민 계정** | `ourteam.kr@gmail.com` (Supabase Auth) |
| **편집 엔진** | wooripen-web에서 이식한 동일 패턴 (EditableText/Image/Link + MediaSlot) |

> 시크릿 (anon key 등)은 `.env.local` 및 Vercel Settings → Environment Variables 에 보관. 이 문서엔 적지 않음.

---

## 3. 현재 진행 상황

### 완료된 페이즈

- **P0** 편집 엔진 이식 파일 감사
- **P1** Next.js 14 레포 초기화
- **P2** 편집 엔진 이식 (EditableText/Image/Link, MediaSlot, AdminGuardProvider, EditorProvider/Modal)
- **P3** Supabase + Vercel 프로젝트 생성
- **P4** 디자인 토큰 → Tailwind config (네이버 그린, ink-* 11단, clamp 폰트사이즈, py-section)
- **P5** 홈 섹션 17개 Next.js 포팅 + 다크 섹션 4종 레이아웃 버그 수정
- **P6 B** 상담 신청 DB 파이프라인
  - Supabase `consultations` 테이블 (이름·연락처·매장·업종·지역·메시지·상태·UTM·IP, RLS 적용)
  - `/api/consultations` POST (validation + honeypot + 슬랙 알림 fire-and-forget)
  - `ApplyForm.tsx` controlled state + fetch 호출 + UTM 자동 전송
- **P6 C** 어드민 대시보드
  - `/admin/login` Supabase Auth
  - `/admin/(shell)/page.tsx` — KPI 카드 4개 + 최근 신청 5건
  - `/admin/(shell)/consultations` — 검색·필터·페이지네이션 (PAGE_SIZE 30)
  - 상태 변경 PATCH API (`new` → `contacted` → `done` / `rejected`)
- **도메인 연결** — ozlabpay.kr DNS 전파 완료 + Vercel SSL 자동 발급

### 남은 작업

- **P6 D 슬랙 알림** — 코드는 완성, 환경변수만 설정하면 동작
  - Vercel Settings → Environment Variables → `SLACK_WEBHOOK_URL_CONSULTATIONS` 추가
  - Slack incoming webhook URL 발급 후 입력
- **P7 (예정)** SEO 보강
  - sitemap.xml / robots.txt
  - 동적 OG 이미지
  - JSON-LD 구조화 데이터
- **P8 (예정)** 추가 페이지
  - /about, /privacy, /terms
  - 미디어 / 보도자료 (선택)

---

## 4. 폴더 구조 (핵심)

```
ozlab/
├── app/
│   ├── layout.tsx                 # root layout (EditorProvider + AdminGuardProvider)
│   ├── page.tsx                   # 홈 (서버 컴포넌트, blocks 조회)
│   ├── (home)/HomeClient.tsx      # 홈 16개 섹션 조립 (클라이언트)
│   ├── globals.css                # 토큰 + 컴포넌트 클래스 (.btn, .container-oz, .feature-bullets 등)
│   ├── admin/
│   │   ├── layout.tsx             # 메타데이터만
│   │   ├── login/page.tsx         # 어드민 로그인
│   │   └── (shell)/
│   │       ├── layout.tsx         # 인증 게이트 + 어드민 헤더
│   │       ├── page.tsx           # 대시보드
│   │       └── consultations/page.tsx  # 상담 목록
│   └── api/
│       ├── consultations/route.ts # 폼 제출 (POST, anon)
│       └── admin/
│           ├── content-blocks/    # 인라인 편집 (PATCH/GET)
│           └── consultations/[id] # 상태 변경 (PATCH)
├── components/
│   ├── sections/                  # 홈 17개 섹션 (Hero, Features, Pricing, ApplyForm 등)
│   ├── editable/                  # 편집 엔진 (Provider/Overlay/Modal)
│   ├── admin/                     # 어드민 컴포넌트 (SignOut, StatusActions)
│   ├── ui/MediaSlot.tsx           # 이미지 편집 슬롯
│   └── icons.tsx
├── lib/
│   ├── content-blocks.ts          # blocks 헬퍼 + pickText/Image/Link 함수
│   ├── content-blocks-server.ts   # SSR 시 blocks 조회
│   └── supabase/
│       ├── client.ts              # 클라 측 Supabase
│       └── server.ts              # SSR 측 Supabase
├── supabase/
│   └── migrations/
│       ├── 20260421000001_content_blocks.sql
│       └── 20260428000001_consultations.sql
├── _design_reference/             # 원본 디자인 참고용 (빌드 제외)
├── tailwind.config.ts             # 디자인 토큰
└── next.config.mjs                # 이미지 remotePatterns
```

---

## 5. 인라인 편집 시스템 (가장 중요한 자산)

### 작동 원리
어드민이 `/admin/login`에서 로그인 → 메인 사이트로 돌아오면 모든 텍스트·이미지·링크에 hover 시 ✏️ 아이콘이 떠. 클릭하면 모달 → 수정 → 저장 → 즉시 반영.

### 사용 패턴
```tsx
// 텍스트
<EditableText
  as="span"
  blockKey="home.hero.headline"
  fallback="기본 텍스트"
  value={pickTextOrUndef(blocks, 'home.hero.headline')}
  pagePath="/"
/>

// 이미지
<MediaSlot
  blockKey="home.hero.device"
  value={pickImageOrUndef(blocks, 'home.hero.device')}
  aspect="4/3"
  label="단말기 이미지"
  hint="assets/device.png"
  pagePath="/"
/>

// 링크
<EditableLink
  blockKey="home.cta"
  fallback={{ label: '신청하기', href: '#apply', target: '_self' }}
  value={pickLinkOrUndef(blocks, 'home.cta')}
  pagePath="/"
  className="btn btn-primary"
/>
```

### 블록 키 네이밍 컨벤션
`{페이지}.{섹션}.{필드}` — 예: `home.features.card1.headline.mark`
헤드라인의 `<mark>` 강조는 pre / mark / post 3조각으로 분리해서 각각 편집 가능.

---

## 6. 어드민 사용법

| 경로 | 역할 |
|---|---|
| `/admin/login` | Supabase Auth 로그인 (`ourteam.kr@gmail.com`) |
| `/admin` | 대시보드 — KPI 4카드 + 최근 신청 5건 |
| `/admin/consultations` | 상담 목록 — 검색·상태 필터·페이지네이션 + 상태 변경 |

### 어드민 인증 패턴
- `AdminGuardProvider`가 앱 전체에서 `supabase.auth.getUser()` 1회 호출
- `isAdmin = !!user` (Supabase Auth 로그인 = 어드민)
- 강한 보안 필요 시 `admin_users` 테이블 화이트리스트 추가 (현재 미적용)

---

## 7. 상담 파이프라인

### 흐름
1. 사용자가 홈 `#apply` 폼 작성 → 제출
2. `POST /api/consultations` (honeypot + consent 체크)
3. Supabase `consultations` 테이블 INSERT (RLS: anon은 INSERT만)
4. (옵션) Slack webhook 알림 fire-and-forget
5. 어드민이 `/admin/consultations`에서 확인 → 상태 변경

### consultations 테이블 컬럼
- 사용자 입력: `name`, `phone`, `store_name`, `industry`, `region`, `message`, `consent_privacy`
- 상태: `status` (new/contacted/done/rejected), `assignee_note`, `contacted_at`, `done_at`
- 어트리뷰션: `ip_address`, `user_agent`, `referer`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`

---

## 8. 절대 원칙

- ✅ **다단계 작업: 큰 단위는 계획 → 대웅 OK → 진행** (작은 단위 자동 진행 OK)
- ✅ **불확실하면 추측 X, 물어볼 것**
- ✅ **Python 코드는 한국어 주석 + 실행 가이드 필수**
- ✅ **Cursor와 동시 작업 시 git lock 충돌 주의** — 코드 작업 중엔 한쪽만 사용
- ✅ **main 직접 push 자제** → PR 권장 (빠른 핫픽스·Cowork이 진행하는 자동 적용은 예외)
- ✅ **프로덕션 DB 마이그레이션은 idempotent + 데이터 파괴 없을 때 자동 적용 OK** (2026-04-29 결정, advisor 검증 필수)
- ✅ **RLS 정책은 USING + WITH CHECK 둘 다 명시**
- ⚙️ **자동 배포·자동 마이그레이션 OK** — 필요시 Cowork이 직접 진행 (대웅이 별도로 "내가 할게" 한 작업만 보류)

---

## 9. 신규 Cowork 프로젝트 Instructions (복붙용)

새 프로젝트 만들 때 Project Instructions 칸에 아래 내용을 통째로 복붙:

```markdown
# 오즈랩페이 (Ozlabpay) 사이트 개발

## 정체
자영업자 대상 POS·카드단말기 제휴 가맹 프로모션 랜딩 사이트.
"결제 + 리뷰 자동화 + 마케팅 + 홍보를 단말기 한 대로" 컨셉.
Anarchy(대웅)가 직접 개발.

## 스택
- Next.js 14 (App Router) + TypeScript + Tailwind CSS 3.4
- Supabase (DB + Auth + Storage)
- Vercel 배포
- 도메인: https://ozlabpay.kr (호스팅케이알)
- GitHub: anarchy84/ozlab (main 브랜치)

## 작업 폴더
/Users/anarchy/Claud_Projects/ozlab

## 환경 자격증명 (참고용 — 시크릿 X)
- Supabase 프로젝트 ID: vbdoyambycopigfajcgk (woori-nconnect, 서울 리전)
- Vercel 프로젝트 ID: prj_azs67RpEaQCxtY3JwIp56Q5qQ1BS
- Vercel 팀 ID: team_RLvSNvCKFPar1hqGQ6GF1e9I
- 어드민 계정: ourteam.kr@gmail.com

## 핵심 시스템
- 인라인 편집 엔진: 어드민 로그인 시 hover ✏️ 클릭으로 모든 텍스트·이미지·링크 편집 (wooripen-web 동일 패턴)
- content_blocks 테이블: SEO 보호된 블록 단위 저장 (semantic_tag로 H1/H2 강제 유지)
- 상담 신청: /#apply → /api/consultations → consultations 테이블 → 어드민 /admin/consultations
- 슬랙 알림: SLACK_WEBHOOK_URL_CONSULTATIONS 환경변수로 활성화

## 절대 원칙
- main 직접 push 자제 → PR 권장 (Cowork 자동 적용은 예외)
- 프로덕션 DB 마이그레이션은 idempotent + advisor 검증 후 자동 적용 OK
- RLS 정책은 USING + WITH CHECK 둘 다 명시
- Cursor와 동시 작업 시 git 락 충돌 주의
- 큰 작업은 계획 → 대웅 OK → 진행 / 작은 단위는 자동 진행 OK

## 자동 발동 권장 스킬
- anarchy-content-team:anarchy-dev-team (개발팀 페르소나)
- engineering:system-design, engineering:code-review, engineering:deploy-checklist
- design:ux-copy, design:design-system

## 작업 흐름
1. 요구사항 듣기
2. PRD/스펙 → product-management:write-spec
3. DB 설계 → engineering:system-design
4. 구현
5. 코드 리뷰 → engineering:code-review
6. 배포 전 체크 → engineering:deploy-checklist
7. Vercel 배포 → 검증

## 개발 워크플로우
- 파일 작성/수정: Cowork (Claude)
- git add / commit / push: 대웅이 Cursor 터미널에서 직접
- 환경변수: Vercel 대시보드에서 대웅 직접
- DB 마이그레이션: Cowork가 Supabase MCP로 실행 (신규는 staging 검토 후 prod)

## 다음 단계 (P7 ~ )
- 슬랙 webhook URL 환경변수 추가 (P6 D 마무리)
- SEO 보강: sitemap.xml, robots.txt, 동적 OG 이미지
- 추가 페이지: /about, /privacy, /terms
- 콘텐츠 블록 초기 데이터 시딩
```

---

## 10. 새 프로젝트 만드는 절차

### Cowork 데스크톱 앱에서

1. 좌상단 햄버거 → **New Project** 또는 **+ 새 프로젝트**
2. 프로젝트 이름: **오즈랩페이** (또는 ozlab)
3. **폴더 연결**: `/Users/anarchy/Claud_Projects/ozlab` 선택
4. **Project Instructions** 칸에 위 9번 항목 markdown 통째로 복붙
5. 저장

### 첫 메시지로 컨텍스트 부여

새 프로젝트 첫 채팅에서 이렇게 시작하면 좋아:

> "이 폴더는 오즈랩페이 사이트야. HANDOFF.md 먼저 읽고 현재 상태 파악해줘."

→ 그러면 Cowork가 이 문서를 읽고 P6 D만 남은 상태를 인지함.

---

## 11. 우리편 프로젝트와의 관계

| 항목 | wooripen-web (우리편) | ozlab (오즈랩페이) |
|---|---|---|
| Cowork 프로젝트 | 기존 AnarchyContentTeam 프로젝트 그대로 | 신규 분리 |
| GitHub | anarchy84/wooripen-web | anarchy84/ozlab |
| Supabase | llnzuczikgvbxxujztao | vbdoyambycopigfajcgk |
| Vercel | prj_pdrd6xEaTq3ajr9PQvd2hBnhVhfe | prj_azs67RpEaQCxtY3JwIp56Q5qQ1BS |
| 도메인 | wooripen.co.kr / beta.ourteam.kr | ozlabpay.kr |
| 인라인 편집 엔진 | 동일 패턴 (자산 공유) | 동일 패턴 (자산 공유) |
| 분리 시점 | 2026-04-29 | 2026-04-29 |

> 두 사이트는 **편집 엔진**과 **MediaSlot 패턴**을 공유하지만 별개 프로젝트.
> 한쪽 수정이 다른 쪽에 자동 반영되지 않음. 필요하면 각자 수동 적용.

---

## 12. 빠른 검수 체크리스트 (다음 세션 시작 시)

```
[ ] https://ozlabpay.kr 접속 → 정상 노출
[ ] /admin/login → ourteam.kr@gmail.com 로그인
[ ] /admin → KPI 카드 4개 표시
[ ] /admin/consultations → 신청 목록 표시
[ ] 홈 hover → ✏️ 아이콘 → 텍스트 1개 편집 → 저장 → 반영
[ ] /#apply 폼 → 테스트 데이터 → 어드민에 도착
[ ] (P6 D 후) Slack 채널 알림 도착
```

---

## 13. 알려진 이슈 / 다듬을 것

- **빈 디렉토리** `app/admin/consultations` (옛 위치) — sandbox 권한 때문에 못 지움. Cursor 터미널에서 `rm -rf` 한 번 필요. (이미 제거됐을 수도)
- **TTL 180초** DNS 빠르게 전파됐지만 운영 안정 후 3600~86400초로 늘리는 게 권장
- **어드민 권한 강화 필요** — 현재 "Supabase Auth 로그인 = admin". 다중 사용자 환경에선 admin_users 테이블 화이트리스트 추가 필요
- **상담 상세 페이지 없음** — 목록 인라인 액션만 있음. 메시지가 길면 `line-clamp-3` 처리됨. 필요시 `/admin/consultations/[id]` 추가
- **OG 이미지 미생성** — `/og-image.png` 자리. P7에서 동적 생성 또는 정적 업로드

---

이 문서를 새 Cowork 프로젝트에서 가장 먼저 읽으면 컨텍스트 100% 복원됨.
질문 있으면 언제든.

— Anarchy + Cowork
