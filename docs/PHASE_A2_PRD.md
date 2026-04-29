# Phase A-2 — 어드민 사용자 관리 UI + 이메일 초대 API (PRD)

> 작성일: 2026-04-29
> 작성: Anarchy 콘텐츠 본부 (개발팀 PM + 디자인)
> 의존: Phase A 마이그레이션 적용 완료
> 검수: 대웅 OK 필요

---

## 1. TL;DR

Phase A에서 깐 `admin_users` + 5개 role + RLS 헬퍼를 실제로 운영하기 위한 **사용자 관리 UI**를 만든다. 이메일 초대 방식으로 신규 멤버 추가 / 비활성화로 퇴사 처리 / 배정 인수인계 흐름까지 한 페이지에서.

**산출물**:
- `app/admin/(shell)/users/page.tsx` — 사용자 목록
- `app/admin/(shell)/users/invite/page.tsx` (또는 모달) — 초대
- `app/admin/(shell)/users/[id]/page.tsx` (또는 모달) — 편집·퇴사
- `app/api/admin/users/invite/route.ts` — 초대 메일 발송
- `app/api/admin/users/[id]/route.ts` — 권한 변경·비활성화·삭제
- `app/api/admin/users/[id]/transfer/route.ts` — 배정 인수인계
- `components/admin/users/*` — 재사용 컴포넌트

**완료 정의**:
- super_admin이 신규 상담사를 초대 → 본인이 비번 설정 → admin_users에 자동 등록 → 어드민 진입 가능
- super_admin이 퇴사 처리 → 비활성화 + 배정 자동 미배정/인수인계 선택
- super_admin 본인 강등 / 마지막 super_admin 삭제 차단

---

## 2. 사용자 관점 흐름 (UX)

### 2.1 신규 입사자 초대

```
[super_admin]
1. /admin/users 접속
2. 우상단 [+ 사용자 초대] 클릭
3. 모달:
   ┌──────────────────────────────────┐
   │ 새 사용자 초대                    │
   ├──────────────────────────────────┤
   │ 이메일 *                          │
   │ [김상담@ozlabpay.kr      ]        │
   │                                   │
   │ 역할 *                            │
   │ ○ 운영자 (admin)                  │
   │ ● 상담사 (counselor)              │
   │ ○ 마케터 (marketer)               │
   │ ○ 뷰어 (viewer)                   │
   │ (super_admin은 별도 워크플로우)   │
   │                                   │
   │ 표시 이름                         │
   │ [김상담               ]           │
   │                                   │
   │ 부서 (선택)                       │
   │ [영업1팀              ]           │
   │                                   │
   │ 메모 (선택)                       │
   │ [                     ]           │
   │                                   │
   │              [취소] [초대 보내기] │
   └──────────────────────────────────┘
4. [초대 보내기] → /api/admin/users/invite POST
5. 토스트: "✅ 김상담@ozlabpay.kr 로 초대 메일을 보냈어요"

[신규 상담사]
6. 이메일 받음:
   "오즈랩페이 어드민에 초대받으셨습니다 [확인하기]"
7. [확인하기] → Supabase 비번 설정 페이지
8. 비번 설정 → /admin 자동 진입
9. 어드민 헤더에 본인 이름·역할 표시
```

### 2.2 퇴사 처리

```
[super_admin]
1. /admin/users → 해당 사용자 행 클릭
2. 우상단 [퇴사 처리] 버튼
3. 모달 (3단계 워크플로우):

   STEP 1 — 비활성화 확인
   ┌────────────────────────────────────────┐
   │ ⚠️  김상담 (counselor) 퇴사 처리       │
   ├────────────────────────────────────────┤
   │ 이 사용자를 비활성화합니다.            │
   │ - 어드민 진입 즉시 차단                │
   │ - 데이터·이력 보존                     │
   │ - 30일 후 영구 삭제 검토               │
   │                                        │
   │ 현재 배정된 상담: 23건                 │
   │                                        │
   │              [취소] [다음 →]           │
   └────────────────────────────────────────┘

   STEP 2 — 배정 인수인계 정책
   ┌────────────────────────────────────────┐
   │ 배정된 23건을 어떻게 할까요?           │
   ├────────────────────────────────────────┤
   │ ● 자동 미배정 (기본)                   │
   │   재배정 큐로 이동, 다음 배정 룰 적용  │
   │                                        │
   │ ○ 일괄 인수인계                        │
   │   → 인수자: [드롭다운 ▼]               │
   │                                        │
   │ ○ 룰 기반 분배 (Phase A-4 활성화)      │
   │                                        │
   │              [← 이전] [다음 →]         │
   └────────────────────────────────────────┘

   STEP 3 — 최종 확인
   ┌────────────────────────────────────────┐
   │ 다음 작업이 즉시 실행됩니다:           │
   │   ✓ 김상담 비활성화                    │
   │   ✓ 23건 자동 미배정                   │
   │   ✓ 슬랙 #ops 채널에 알림              │
   │                                        │
   │ 되돌리려면 /admin/users 에서           │
   │ 다시 활성화 가능합니다.                │
   │                                        │
   │              [취소] [퇴사 처리 실행]   │
   └────────────────────────────────────────┘
```

### 2.3 권한 변경

```
1. /admin/users → 해당 사용자 [편집]
2. role 드롭다운 변경 (admin → counselor 등)
3. [저장] → 즉시 반영
4. (선택) 본인에게 슬랙 DM 알림
```

---

## 3. 페이지 와이어프레임

### 3.1 `/admin/users` (목록)

```
┌────────────────────────────────────────────────────────────────┐
│ 사용자 관리                              [+ 사용자 초대]       │
├────────────────────────────────────────────────────────────────┤
│ [검색: 이름/이메일]  [역할▼]  [활성여부▼]                     │
├──┬──────────────┬─────────────┬────────┬──────┬──────┬───────┤
│  │이름          │이메일       │역할    │부서  │최근  │상태   │
│  │              │             │        │      │로그인│       │
├──┼──────────────┼─────────────┼────────┼──────┼──────┼───────┤
│👤│대웅 (마스터) │ourteam.kr@..│👑super │경영  │5분전 │🟢활성 │
│👤│김상담        │kimsd@..      │👤상담사│영업1 │1시간 │🟢활성 │
│👤│이마케터      │leemkt@..     │📊마케터│마케팅│어제  │🟢활성 │
│👤│박퇴사        │parkex@..     │👤상담사│-     │-     │⚫비활성│
└──┴──────────────┴─────────────┴────────┴──────┴──────┴───────┘
                                              [< 1 2 3 >]
```

행 클릭 → 우측 슬라이드 패널 또는 `/admin/users/[id]` 진입.

### 3.2 사용자 상세/편집

```
┌────────────────────────────────────────────────────────────────┐
│ ◀ 사용자 관리             김상담 (counselor)    [퇴사 처리]    │
├────────────────────────────────────────────────────────────────┤
│ ┌─기본 정보──────────┐  ┌─활동 요약──────────┐                │
│ │ 이메일: kimsd@..   │  │ 총 배정: 87건      │                │
│ │ 가입일: 2026-04-29 │  │ 처리중: 23건       │                │
│ │ 최근 로그인: 1h    │  │ 개통: 12건         │                │
│ └────────────────────┘  └────────────────────┘                │
│                                                                │
│ ┌─편집──────────────────────────────────────┐                 │
│ │ 표시 이름: [김상담            ]            │                 │
│ │ 역할     : [상담사 ▼]                      │                 │
│ │ 부서     : [영업1팀           ]            │                 │
│ │ 메모     : [                  ]            │                 │
│ │ 활성     : ☑ 활성 / ☐ 비활성               │                 │
│ │                          [취소] [저장]     │                 │
│ └───────────────────────────────────────────┘                 │
│                                                                │
│ ┌─로그인 이력 (최근 10건)──────────────────┐                  │
│ │ 2026-04-29 14:32 ・ Chrome/Mac           │                  │
│ │ 2026-04-29 09:15 ・ Chrome/Mac           │                  │
│ │ ...                                      │                  │
│ └──────────────────────────────────────────┘                  │
└────────────────────────────────────────────────────────────────┘
```

---

## 4. API 명세

### 4.1 `POST /api/admin/users/invite`

**권한**: super_admin 만

**Request**:
```json
{
  "email": "kimsd@ozlabpay.kr",
  "role": "counselor",
  "display_name": "김상담",
  "department": "영업1팀",
  "note": null
}
```

**Server 처리**:
```typescript
// 의사코드
1. 호출자 권한 체크 (is_super_admin())
2. 이메일 형식·중복 검증
3. role IN ('admin','counselor','marketer','viewer') 검증 (super_admin은 별도)
4. Supabase Admin API 호출:
   const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
     data: { role, display_name, department }  // user_metadata
   });
5. 성공 시 admin_users INSERT (트리거 또는 첫 로그인 시 자동)
   → 일단 invite 단계에서는 admin_users 안 만들고, 첫 로그인 시 트리거로 생성
   → 이유: 초대 후 가입 안 한 사용자가 admin_users에 떠있는 거 방지
6. 슬랙 #ops 알림 (옵션)
```

**Response (성공)**:
```json
{
  "success": true,
  "invited_email": "kimsd@ozlabpay.kr",
  "expires_at": "2026-05-06T..."  // Supabase invite 7일 만료
}
```

**Response (실패)**:
- 401: 권한 없음
- 409: 이미 가입된 이메일
- 429: invite 한도 초과 (Free 4통/시간)

### 4.2 `PATCH /api/admin/users/[id]`

**권한**: super_admin 만

**Request**:
```json
{
  "role": "admin",          // 옵션
  "display_name": "...",    // 옵션
  "department": "...",      // 옵션
  "note": "...",            // 옵션
  "is_active": false        // 옵션
}
```

**Server 처리**:
- super_admin 권한 체크
- **본인 강등 차단**: id === auth.uid() && role !== 'super_admin' → 400
- **마지막 super_admin 삭제 차단**: is_active=false 이고 본인이 마지막 활성 super_admin이면 → 400
- admin_users UPDATE
- (옵션) 본인에게 슬랙 DM

### 4.3 `POST /api/admin/users/[id]/transfer`

**권한**: super_admin 또는 admin

**Request**:
```json
{
  "policy": "auto_unassign" | "bulk_transfer" | "rule_based",
  "transfer_to_user_id": "uuid"  // policy=bulk_transfer 일 때만
}
```

**Server 처리**:
```typescript
switch (policy) {
  case 'auto_unassign':
    UPDATE consultations 
    SET counselor_id = NULL, assigned_at = NULL 
    WHERE counselor_id = $1 AND status_id NOT IN (개통완료, 미승인);
    break;
  case 'bulk_transfer':
    UPDATE consultations 
    SET counselor_id = $2, assigned_at = now() 
    WHERE counselor_id = $1 AND status_id NOT IN (개통완료, 미승인);
    break;
  case 'rule_based':
    // Phase A-4 자동배정 룰 호출
    break;
}
```

### 4.4 `DELETE /api/admin/users/[id]` (영구삭제)

**권한**: super_admin 만 + 본인 아닐 때만

**Server 처리**:
- 30일 비활성화 경과 확인 (강제 X, 경고만)
- 마지막 super_admin 삭제 차단
- supabaseAdmin.auth.admin.deleteUser(id)
- → CASCADE로 admin_users 삭제
- → consultations.counselor_id 는 ON DELETE SET NULL 로 자동 NULL

---

## 5. 컴포넌트 트리

```
app/admin/(shell)/users/
├── page.tsx                       # 목록
├── invite/
│   └── page.tsx                   # 초대 페이지 (또는 모달로 통합)
└── [id]/
    └── page.tsx                   # 상세·편집·퇴사

components/admin/users/
├── UsersTable.tsx                 # 목록 테이블
├── UsersFilters.tsx               # 검색·역할·활성 필터
├── InviteUserModal.tsx            # 초대 모달
├── EditUserForm.tsx               # 편집 폼
├── OffboardWizard.tsx             # 3단계 퇴사 위저드
├── TransferAssignmentStep.tsx     # 인수인계 단계
├── RoleSelect.tsx                 # role 드롭다운 (한글 라벨 매핑)
├── UserRoleBadge.tsx              # 역할 뱃지 (색상)
└── UserActivitySummary.tsx        # 배정·처리·개통 요약

lib/admin/
├── users.ts                       # 클라 측 fetch 함수
├── permissions.ts                 # role 별 권한 체크 (UI에서 버튼 disable 등)
└── invite.ts                      # 초대 흐름 헬퍼

app/api/admin/users/
├── invite/route.ts                # POST 초대
├── [id]/
│   ├── route.ts                   # PATCH 편집 / DELETE 영구삭제
│   └── transfer/route.ts          # POST 인수인계
```

---

## 6. RLS 활용 방식 (재확인)

Phase A에서 깐 헬퍼 함수가 클라이언트·서버 양쪽에서 활용됨:

```typescript
// 서버 사이드 — supabaseAdmin (service_role) 으로 우회
// 또는 supabase (anon) 로 RLS 검증 통과 확인

// 클라이언트 사이드 — useEffect에서 권한 체크
const { data: profile } = await supabase.rpc('get_my_admin_profile');
if (!profile || profile.role !== 'super_admin') {
  return <NotAuthorized />;
}
```

**API Route 가드 패턴 (모든 /api/admin/* 라우트 공통)**:
```typescript
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  
  const { data: profile } = await supabase
    .from('admin_users')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();
    
  if (!profile?.is_active || profile.role !== 'super_admin') {
    return new Response('Forbidden', { status: 403 });
  }
  
  // ... 본 로직
}
```

---

## 7. 이메일 템플릿 초안 (Supabase 콘솔에서 설정)

**제목**: `[오즈랩페이] 어드민 초대 — 비밀번호를 설정해주세요`

**본문** (Supabase 변수 활용):
```
안녕하세요,

오즈랩페이 어드민에 초대받으셨습니다.

▶ 초대자: 대웅 (super_admin)
▶ 부여된 역할: {{ .Data.role }}
▶ 표시 이름: {{ .Data.display_name }}

아래 버튼을 눌러 비밀번호를 설정하시면 어드민에 진입할 수 있습니다.
이 링크는 7일간 유효합니다.

[비밀번호 설정하기]({{ .ConfirmationURL }})

문의: ourteam.kr@gmail.com

— 오즈랩페이
```

설정 위치: Supabase 콘솔 → Authentication → Email Templates → Invite user

---

## 8. 검증 / 완료 조건

### 8.1 기능 검증
- [ ] super_admin 로그인 → /admin/users 접근 가능
- [ ] 비-super_admin 로그인 → /admin/users 진입 차단 (403)
- [ ] 신규 이메일 초대 → 메일 발송 성공
- [ ] 초대 메일 링크 클릭 → 비번 설정 → 자동 로그인
- [ ] 첫 로그인 시 admin_users 자동 생성 (트리거 또는 콜백)
- [ ] role 변경 → 즉시 RLS에 반영
- [ ] 비활성화 → 어드민 진입 차단
- [ ] 퇴사 처리 위저드 3단계 정상 동작
- [ ] 자동 미배정 → consultations.counselor_id = NULL
- [ ] 일괄 인수인계 → counselor_id = 새 사용자 ID
- [ ] 영구 삭제 → auth.users + admin_users 동시 삭제, consultations.counselor_id NULL

### 8.2 가드 검증 (Edge cases)
- [ ] super_admin이 본인을 admin으로 강등 시도 → 차단
- [ ] super_admin이 본인 비활성화 시도 → 차단
- [ ] 마지막 활성 super_admin 비활성화 시도 → 차단
- [ ] 마지막 super_admin 삭제 시도 → 차단
- [ ] 이미 가입된 이메일 재초대 → 409
- [ ] invite 한도 초과 (4/시간) → 429 + 친절한 안내

### 8.3 보안 검증
- [ ] /api/admin/users/* 모든 라우트에 권한 체크
- [ ] service_role key는 .env.local + Vercel env 에만 (코드 grep으로 확인)
- [ ] CSRF 보호 (Supabase Auth가 처리)
- [ ] role 변경 시 audit log 남기기 (consultation_status_history 같은 패턴)

---

## 9. 추가 고려사항

### 9.1 Supabase 트리거로 admin_users 자동 생성
초대 후 가입 시 admin_users 자동 INSERT 하려면:

```sql
CREATE OR REPLACE FUNCTION public.handle_invited_user()
RETURNS TRIGGER AS $$
DECLARE
  invited_role text;
BEGIN
  invited_role := COALESCE(NEW.raw_user_meta_data->>'role', 'viewer');
  
  INSERT INTO public.admin_users (user_id, role, display_name, department)
  VALUES (
    NEW.id,
    invited_role,
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'department'
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_invited_user();
```

**위험**: 자율 sign-up 차단 안 되어있으면 누가 가입해도 admin_users 들어감.
**해결**: 트리거 안에서 raw_user_meta_data->>'invited_by' 같은 마커 체크. invite API에서만 이 마커 세팅.

→ Phase A-2 마이그레이션으로 별도 추가.

### 9.2 감사 로그 (audit_logs)
누가 누구의 role 바꿨는지·퇴사시켰는지 추적용. 별도 테이블 추가 검토:

```sql
CREATE TABLE admin_audit_logs (
  id bigserial PRIMARY KEY,
  actor_id uuid REFERENCES auth.users(id),
  action text NOT NULL,         -- 'invite' / 'role_change' / 'deactivate' / 'delete' / 'transfer'
  target_user_id uuid,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

→ Phase A-2 또는 Phase A-3 추가.

### 9.3 슬랙 알림 통합
Phase B에서 슬랙 채널 분리 운영 결정됨. 사용자 관리 이벤트도 #ops 채널에 알림:
- 신규 초대 발송
- 첫 로그인 (가입 완료)
- 퇴사 처리

---

## 10. 적용 절차

```
1. 본 PRD 검토 → OK 회신

2. 구현 (개발팀):
   - Phase A 마이그레이션 적용 + 검증 완료 후 시작
   - Supabase Sign-up 차단 (대웅 콘솔에서 토글) 선행
   - Supabase 콘솔에서 Invite 이메일 템플릿 한국어로 수정
   - 컴포넌트·API 라우트 작성
   - E2E 테스트 (super_admin 시나리오 풀세트)

3. staging 배포 → 검증

4. prod 배포

5. (검증 후) 대웅이 첫 상담사 1명 초대해서 풀 흐름 검증
```

---

## 11. 변경 이력

| 일자 | 버전 | 변경 | 작성 |
|---|---|---|---|
| 2026-04-29 | v0.1 | 초안 (사용자 관리 UI + 이메일 초대) | 본부 |
