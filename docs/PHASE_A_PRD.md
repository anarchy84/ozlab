# Phase A — 어드민 CRM 코어 토대 (PRD)

> 작성일: 2026-04-29
> 작성: Anarchy 콘텐츠 본부 (마스터 오케스트레이터 + 개발팀 PM + 마케팅팀 PM)
> 검수: 대웅 OK 필요

---

## 1. TL;DR

광고 트래픽 받기 전, 어드민이 신청 데이터를 제대로 처리할 수 있도록 **DB 스키마 토대 + RLS + 분석 뷰**를 한 번에 깐다. 후속 페이즈(알림톡/대시보드/약관/콘텐츠)는 모두 이 토대 위에 얹힘.

**산출물**:
- `supabase/migrations/20260429000001_admin_phase_a.sql` (스키마 토대)
- `supabase/migrations/20260429000002_admin_users_and_roles.sql` (권한 시스템) ★
- 본 PRD

**완료 정의**:
- staging Supabase에 마이그레이션 적용 성공
- 기존 consultations INSERT/SELECT 영향 없음 검증
- 8개 기본 상태가 db_statuses에 시딩됨
- 분석 뷰 3개에서 SELECT 가능

---

## 2. 배경 / Why

| 항목 | 현재 (변경 전) | 목표 (변경 후) |
|---|---|---|
| 상태 관리 | 하드코딩 4개 (new/contacted/done/rejected) | DB 테이블 동적 관리 (8개 시딩 + 어드민에서 추가) |
| 자동화 룰 | 코드 변경 필요 | 13개 플래그로 어드민에서 토글 |
| 상태 변경 이력 | 없음 | `consultation_status_history` 1:N |
| 알림톡 발송 이력 | 없음 | `consultation_messages` 1:N |
| 어뷰징 방어 | 없음 | `abuse_blocklist` 마스터 (광고 시작 전 필수) |
| 어트리뷰션 | UTM만 | UTM + GA4 Client/Session ID + gclid/fbclid |
| 상담사 배정 | 없음 | `counselor_id` + `assigned_at` |
| 분석 SQL | 직접 작성 | 뷰 3개로 한 줄 SELECT |

**왜 지금?** 대웅 사내 CRM PRO 18년 운영 노하우(38개 상태 + 13개 자동화 플래그)를 검증된 패턴으로 도입. 광고 시작 후 데이터 누적되면 마이그레이션 비용 폭증.

---

## 3. 범위 (In Scope)

### 3.1 신규 테이블 6개
| 테이블 | 용도 | 권한 |
|---|---|---|
| `db_statuses` | 상태 마스터 (어드민 동적 관리, 13개 자동화 플래그) | SELECT 모두 / 쓰기 **super_admin** |
| `consultation_status_history` | 상태 변경 이력 | admin 이상 |
| `consultation_messages` | 알림톡/SMS/이메일 발송 이력 | admin 이상 |
| `abuse_blocklist` | 어뷰징 차단 (phone/ip/email/UA 패턴) | SELECT anon / 쓰기 **admin 이상** |
| **`admin_users`** ★ | 어드민 사용자 + role (5개) | super_admin 만 관리 |
| **RLS 헬퍼 함수 5개** ★ | `is_super_admin()` 등 | - |

### 3.2 consultations 확장 컬럼 12개
- 운영: `status_id`, `db_group_label`, `internal_memo`, `counselor_id`, `assigned_at`, `callable_time`, `device_type`, `contract_period`
- 어트리뷰션: `ga_client_id`, `ga_session_id`, `landing_page_path`, `gclid`, `fbclid`
- 토글: `is_favorite`, `is_blacklisted`

### 3.3 분석 뷰 3개
| 뷰 | 용도 | 대시보드 활용 |
|---|---|---|
| `v_consultation_funnel` | 상태별 카운트 (오늘/7일/30일/전체) | KPI 카드 + 퍼널 차트 |
| `v_consultation_by_channel` | 매체·캠페인·일별 신청·전환·허수 | 매체별 ROI 표 + 매체별 효율 그래프 |
| `v_consultation_by_counselor` | 상담사별 배정·처리·개통률·허수율 | 상담사 KPI + 인센티브 산정 |

### 3.4 어드민 권한 (5개 role)
| role | 한글명 | 권한 요약 |
|---|---|---|
| `super_admin` ★ | 최고관리자 | 모든 권한. **db_statuses CRUD**, 사용자 관리, 약관 편집 |
| `admin` | 운영자 | 상담 데이터 read/write, 콘텐츠 발행, 블랙리스트 관리 |
| `counselor` | 상담사 | 본인 배정 상담만 (Phase A-2에서 RLS 분리), 본인 성과 조회 |
| `marketer` | 마케터 | 분석 read-only + 광고비 입력 (Phase F) + 매체 관리 |
| `viewer` | 뷰어 | read-only (보고용) |

**Phase A에서 적용되는 권한 분리** (지금):
- ✅ `db_statuses` 쓰기 = super_admin 만 (대웅 결정 반영)
- ✅ `abuse_blocklist` 쓰기 = admin 이상
- ✅ 모든 어드민 영역 진입 = `admin_users` 등록된 활성 사용자만 (`has_admin_access()`)
- ⏳ counselor 본인 배정 건만 보기 = **Phase A-2** (어드민 UI와 함께)

**기본 시딩**:
- `ourteam.kr@gmail.com` → 자동 super_admin 등록 (마이그레이션 시)

### 3.5 8개 기본 상태 시딩
| code | label | 색상 | 핵심 플래그 |
|---|---|---|---|
| `new` | 신규 | 파랑 | (기본값) |
| `contacted` | 연락중 | 주황 | in_progress |
| `consulting` | 상담중 | 노랑 | in_progress |
| `promising` | 가망 | 초록 | is_promising, in_progress |
| `no_answer` | 부재 | 옅은노랑 | force_recall |
| `recall` | 재통화 대기 | 진한주황 | is_promising, force_recall |
| `done` | 개통 완료 | 분홍 | **is_conversion, send_message** |
| `rejected` | 미승인/허수 | 회색 | is_unapproved |

→ 추가 상태(부재1~5 카운터, 진행불가, 상품안내 등)는 어드민 UI 만들고 운영자가 직접 추가.

---

## 4. 마케팅팀 KPI 매핑 — "루커에서 보던 모든 차트가 새 스키마로 뽑히나?" 검증

### 4.1 Page 1: [매출] 통합 성과 → 새 스키마 매핑

| 루커 차트 | 새 스키마로 추출 | 추가 필요 |
|---|---|---|
| 총매출액 | `revenue_records.amount` SUM | ⚠️ Phase F에서 `revenue_records` 테이블 추가 필요 |
| 총광고비 | `ad_spend.amount` SUM | ⚠️ Phase F에서 `ad_spend` 테이블 추가 필요 |
| 총개통건수 | `v_consultation_funnel WHERE is_conversion` | ✅ 즉시 가능 |
| ROAS | (총매출 / 총광고비) × 100 | ⚠️ Phase F |
| 매체별 일별 ROAS 표 | `v_consultation_by_channel` JOIN `ad_spend` | ⚠️ Phase F |
| 매체별 광고비 비중 (파이) | `ad_spend GROUP BY channel` | ⚠️ Phase F |
| 매체별 효율 콤보 (CPA + 전환율) | `v_consultation_by_channel` + `ad_spend` | ⚠️ Phase F |

### 4.2 Page 2: [페이드 미디어] 통합 성과 → 새 스키마 매핑

| 루커 차트 | 새 스키마로 추출 | 추가 필요 |
|---|---|---|
| 노출/클릭/CTR | `ad_spend.{impressions,clicks}` | ⚠️ Phase F |
| 전환수 | `v_consultation_funnel WHERE is_conversion` (또는 `v_consultation_by_channel.conversion_count`) | ✅ |
| CVR | (전환 / 클릭) | ⚠️ Phase F (클릭 데이터 필요) |
| CPA | (광고비 / 전환) | ⚠️ Phase F |
| 일별 광고비+전환수 추이 | `ad_spend` + `v_consultation_by_channel` | ⚠️ Phase F |
| 매체별 성과 표 (서비스 × 매체) | `v_consultation_by_channel` GROUP BY (channel, service) | ⚠️ `service` 차원 추가 필요 |
| 매체별 추이 (라인) | `v_consultation_by_channel` 시계열 | ✅ |
| 매체별 전환수 비율 (도넛) | `v_consultation_by_channel.conversion_count` | ✅ |
| 매체별 광고비 비율 (도넛) | `ad_spend GROUP BY channel` | ⚠️ Phase F |
| DB 유형별 개통 성과 | `v_consultation_funnel` GROUP BY `db_group_label` | ✅ |

### 4.3 Phase A로 즉시 가능한 KPI (✅ 표시)
- 상태별 신청 카운트 (오늘/주/월)
- 매체별 신청·전환·허수 카운트 + 비율
- 상담사별 배정·처리·개통률
- DB 유형별(db_group_label) 개통 성과

### 4.4 Phase F에서 추가 필요 (⚠️ 표시)
- `ad_spend` 테이블 (매체별 일별 광고비/노출/클릭)
- `revenue_records` 테이블 (개통 건당 실 매출)
- `service` 차원 (consultations에 추가 또는 products 매핑)

→ **Phase A 끝나면 "신청·전환·허수" 영역은 바로 대시보드 가능. 매출·광고비는 Phase F에서.**

### 4.5 매체별 측정 한계 (루커 분석 결과 반영)

```
구글 ads / 네이버 검색광고 / 카카오 모먼트 / 틱톡 ads : 노출·클릭·전환 풀
메타 비즈니스 (페이스북·인스타)                       : 노출·전환만 (리드폼 클릭 미측정)
당근ads                                               : 전환만 (오픈채팅 형식)
```
→ 대시보드에서 NULL은 "0%"가 아니라 **"측정불가"** 로 표시 (UI 가이드에서 명시).

---

## 5. UI/UX 와이어프레임 — 새 스키마를 활용하는 어드민 페이지

### 5.1 페이지 트리

```
/admin
├── /                           대시보드 (KPI 카드 + 매체별·상태별 요약)
├── /consultations              상담 목록 (필터/검색/EXCEL/페이지네이션)
├── /consultations/[id]         상담 상세 (메모/상태변경/이력/메시지)
├── /settings
│   ├── /statuses               db_statuses CRUD (Phase A 산출물 즉시 활용)
│   ├── /assignment             자동 배정 룰 (Phase E)
│   └── /blocklist              abuse_blocklist 관리
└── /analytics                  대시보드 (Phase F)
```

### 5.2 와이어 — `/admin/consultations` (목록)

```
┌─────────────────────────────────────────────────────────────────┐
│ [검색: 이름/전화 뒤4]  [상태▼] [매체▼] [기간▼]  [상세필터▼]   │
│                                          [EXCEL다운] [+신청추가] │
├─────────────────────────────────────────────────────────────────┤
│ 총 1,226건  ┃  필터: 상태=신규+상담중                           │
├──┬─────┬─────────┬──────┬───────┬──────┬──────┬─────────┬──────┤
│☐ │ No  │신청일시 │매체  │담당자 │상태  │고객명│연락처   │최종  │
│  │     │         │      │       │      │      │         │상담  │
├──┼─────┼─────────┼──────┼───────┼──────┼──────┼─────────┼──────┤
│☐ │8939 │1시간 전 │📱당근│김민수 │🟢가망│노연희│010-***-…│30분전│
│☐ │8938 │2시간 전 │📘메타│이영희 │🟠연락│박준호│010-***-…│ -    │
│  │     │         │      │       │      │      │         │      │
└──┴─────┴─────────┴──────┴───────┴──────┴──────┴─────────┴──────┘
                                           [< 1 2 3 ... 41 >]
```

핵심:
- **No 또는 이름 클릭 = 같은 상세 모달** (CRM PRO 패턴)
- 상태는 db_statuses.bg_color 로 색상 자동 렌더링
- 즐겨찾기·블랙리스트 토글 행에서 직접 가능
- 일괄 선택 (체크박스) → 상태 일괄 변경 / 상담사 일괄 배정

### 5.3 와이어 — 상담 상세 모달

```
┌─────────────────────────────────────────────────────────────────┐
│ ◀  ❤️즐겨찾기  🚫블랙리스트                              ✕ ▶ │
├─────────────────────────────────────────────────────────────────┤
│ ┌─DB 정보 (노연희)──────┐ ┌─고객 입력──────┐ ┌─상담후 기록──┐ │
│ │ DB그룹  : [드롭다운]  │ │ 이름: 노연희    │ │ 약정 종료일  │ │
│ │ 매체    : 디스플레이  │ │ 연락처: 010-... │ │ 통신사       │ │
│ │ 메모    : [내부메모]  │ │ 매장: ...       │ │ ...          │ │
│ │ 담당자  : 김민수      │ │ 업종: 피트니스  │ │              │ │
│ │ 상태    : 🟢 가망     │ │ 단말기: CAT     │ │              │ │
│ └───────────────────────┘ └─────────────────┘ └──────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ [개통 정보]  상품명 / 기간 / 처리일 / 담당 / [+개통등록]        │
├─────────────────────────────────────────────────────────────────┤
│ ┌─상태 이력────────────┐  ┌─메시지 이력──────────────┐         │
│ │ 04-29 11:32 가망     │  │ 04-29 11:33 가망 안내톡  │         │
│ │ 04-29 10:51 상담중   │  │ - 발송: 카카오 알림톡    │         │
│ │ ...                  │  │ - 결과: 성공             │         │
│ └──────────────────────┘  └──────────────────────────┘         │
├─────────────────────────────────────────────────────────────────┤
│ [메모]  ☑ 알림톡 발송  [상태선택▼]  [💾저장]  [📖상담가이드]   │
│ ┌────────────────────────────────────────────────────┐         │
│ │ (메모 입력)                                        │         │
│ └────────────────────────────────────────────────────┘         │
│                                          [닫기]                 │
└─────────────────────────────────────────────────────────────────┘
```

핵심 인터랙션:
- **▶ ◀** 모달 안 페이지네이션 (CRM PRO 패턴, 상담사 효율 핵심)
- **상태 변경 + 알림톡 체크 + 메모 저장** = 한 번에 (트랜잭션)
- **즐겨찾기 = 즉시 토글** (confirm 없음)
- **블랙리스트 = confirm 모달** (연락처 차단 / IP 차단 / 취소)

### 5.4 와이어 — `/admin/settings/statuses` (db_statuses CRUD)

```
┌─────────────────────────────────────────────────────────────────┐
│ DB 상태 관리                                    [+ 새 상태 추가]│
├──┬───┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬───────┤
│⠿ │순 │코드  │라벨  │색상  │알림톡│가망  │전환  │대시  │관리   │
├──┼───┼──────┼──────┼──────┼──────┼──────┼──────┼──────┼───────┤
│⠿ │10 │new   │신규  │🟦    │  -   │  -   │  -   │  ✓   │[수정] │
│⠿ │40 │promi…│가망  │🟩    │  -   │  ✓   │  -   │  ✓   │[수정] │
│⠿ │60 │done  │개통  │🟪    │  ✓   │  -   │  ✓   │  ✓   │[수정] │
└──┴───┴──────┴──────┴──────┴──────┴──────┴──────┴──────┴───────┘
        ⠿ = 드래그하여 순서 변경
```

상세 편집 화면:
- 상태명 / 코드(영문, unique) / 배경색 / 텍스트색
- 자동화 플래그 13개 토글
- 알림톡 템플릿 코드 매핑 (Phase B 활성화)

---

## 6. 검증 / 완료 조건 체크리스트

### 6.1 마이그레이션 적용 검증
- [ ] staging Supabase 프로젝트에 마이그레이션 2개 순서대로 적용 성공
- [ ] **6개 신규 테이블** 생성 확인 (`information_schema.tables`) — db_statuses, history, messages, blocklist, **admin_users**
- [ ] consultations 12개 컬럼 추가 확인
- [ ] db_statuses에 8개 row 시딩 확인
- [ ] **admin_users에 ourteam.kr@gmail.com → super_admin 자동 시딩 확인**
- [ ] **RLS 헬퍼 함수 5개 호출 가능** (`SELECT public.is_super_admin();`)
- [ ] 분석 뷰 3개 SELECT 성공

### 6.2 기존 기능 영향 없음 검증
- [ ] `/api/consultations` POST → consultations INSERT 성공 (status='new' 자동)
- [ ] 기존 consultations.status 값이 status_id로 백필됨
- [ ] `/admin/consultations` 목록에서 기존 데이터 정상 조회 (ourteam.kr@gmail.com 로 로그인)
- [ ] RLS: anon은 INSERT만 (consultations + consent_privacy=true), super_admin은 모든 동작 가능
- [ ] **권한 검증**: super_admin 로그인 → db_statuses INSERT 성공 / 비-어드민 로그인 → 거부

### 6.3 권한 분리 검증 (신규)
- [ ] super_admin 로그인 → `is_super_admin()` true 반환
- [ ] super_admin 로그인 → admin_users 테이블 SELECT/INSERT 가능
- [ ] super_admin 로그인 → db_statuses INSERT/UPDATE/DELETE 성공
- [ ] (테스트용 admin role 사용자 생성 후) admin 로그인 → db_statuses 쓰기 거부
- [ ] (테스트용 counselor role 사용자 생성 후) counselor 로그인 → consultations SELECT 가능 (Phase A-2에서 본인 것만 분리)
- [ ] admin_users 미등록 사용자 → consultations SELECT 거부 (`has_admin_access()` false)

### 6.4 회귀 테스트
- [ ] 인라인 편집 시스템 (content_blocks) 영향 없음
- [ ] 어드민 로그인 정상 (`/admin/login`)
- [ ] AdminGuardProvider — `get_my_admin_profile()` RPC 호출 성공
- [ ] 도메인 ozlabpay.kr 정상 응답

---

## 7. 적용 절차 (대웅 액션)

```
1. 본 PRD + SQL 검토 → OK 회신

2. Cursor 터미널에서 git 작업:
   $ git checkout -b feat/admin-phase-a
   $ git add supabase/migrations/20260429000001_admin_phase_a.sql
   $ git add supabase/migrations/20260429000002_admin_users_and_roles.sql
   $ git add docs/PHASE_A_PRD.md
   $ git commit -m "feat(admin): Phase A — DB 스키마 토대 + 권한 시스템 (5개 role)"

3. Supabase staging 적용:
   - 옵션 A: Supabase MCP로 내가 직접 staging 적용 (대웅 OK 시)
   - 옵션 B: 대웅이 Supabase 콘솔 SQL Editor에서 직접

4. 검증 (위 6번 체크리스트)

5. prod 적용:
   $ git push origin feat/admin-phase-a
   → PR 생성 → 검토 → main 머지 → Vercel 자동 배포 (마이그레이션은 별도)

6. lib/supabase 타입 재생성:
   $ npx supabase gen types typescript --project-id vbdoyambycopigfajcgk > lib/supabase/types.ts
```

---

## 8. 다음 페이즈 미리보기

| 페이즈 | 내용 | 의존성 |
|---|---|---|
| **A-2** | 어드민 UI: 상담 상세 페이지 풀 리뉴얼 + **db_statuses CRUD UI (super_admin 전용)** + **사용자 관리 UI (`/admin/users`)** | Phase A 완료 |
| **A-3** | 어뷰징 방어: `/api/consultations` POST에 abuse_blocklist 체크 추가 | Phase A 완료 |
| **A-4** | counselor RLS 본격 분리 (본인 배정 건만) + 자동 배정 룰 | A-2 완료 |
| **B** | 알림톡 — alimtalk_templates 테이블 + 발송 워커 + 슬랙 알림 채널 분리 | A-2 완료 |
| **C** | 약관 편집 (legal_documents) | (병렬 가능) |
| **F** | 분석 대시보드 — ad_spend + revenue_records + 차트 | B 완료 후 |

---

## 9. 위험 / 결정 필요 사항

### 9.1 결정 사항 (대웅 OK 완료, 2026-04-29)
- [x] **Supabase 결제** — Free 유지, 나중에 결정 (광고 시작 후 데이터 누적되면 재검토)
- [x] **기본 상태 8개** + 어드민에서 super_admin이 수정/삭제/추가 가능 (db_statuses 쓰기 권한 super_admin)
- [x] **메모 1개로 통일** — `internal_memo` 만 사용 (영업/사후 분리 안 함)
- [x] **상담사 권한 분리** — `admin_users` 테이블 + 5개 role (Phase A에 권한 시스템 통합)

### 9.2 알려진 위험
- 기존 `consultations.status` (text)와 `status_id` (FK) 이중 운영 — 코드에서 명확히 한쪽만 쓰도록 가이드 필요
- DELETE 정책 없음 — 상태 마스터 잘못 추가 시 SQL 콘솔에서 직접 삭제 (의도된 안전장치)
- 분석 뷰는 매번 풀스캔 — 데이터 1만건 넘어가면 materialized view 또는 사전 집계 테이블 검토

---

## 10. 운영 워크플로우 — 사용자 관리 (대웅 결정 2026-04-29)

### 10.1 사용자 입사 (이메일 초대 방식)

```
[super_admin]                                      [신규 직원]
     │                                                  │
1. /admin/users 접속                                    │
2. [+ 사용자 초대] 버튼                                 │
3. 이메일 + role 선택                                   │
   (admin / counselor / marketer / viewer)              │
4. [초대 보내기]                                        │
     │                                                  │
     ├── /api/admin/invite POST ────────────┐           │
     │   (super_admin 만 호출 가능,         │           │
     │    Supabase Admin API 호출)          │           │
     │                                      ▼           │
     │   Supabase 가 초대 메일 발송 ─────────────────▶ 5. 이메일 받음
     │                                                  │
     │                                              6. 초대 링크 클릭
     │                                              7. 비번 설정
     │                                              8. 자동 로그인
     │                                                  │
     └── admin_users INSERT (트리거 또는 수동) ─────────┘
         (role: 초대 시 선택한 값)
```

**구현 방식**:
- Supabase Auth Admin API `admin.inviteUserByEmail(email, { data: { role } })`
- 이메일 발송: Supabase 내장 (Free 플랜 4통/시간)
- 초대 링크 클릭 → Supabase가 자동 user 생성 → 비번 설정 페이지
- admin_users INSERT: 백엔드에서 invite 완료 후 또는 첫 로그인 시 자동

**대안 (B/C 안 채택 이유)**:
- 자율 sign-up + 승인: 누구나 가입 가능 → 봇·스팸 위험 → 채택 X
- 사전 등록(임시비번): 비번 평문 전달 보안 위험 → 채택 X

### 10.2 사용자 퇴사 (비활성화 → 30일 유예 → 영구삭제)

```
1. super_admin이 /admin/users → 해당 사용자 [퇴사 처리]
2. is_active = false 토글 (즉시)
   → has_admin_access() false → 어드민 진입 불가
   → 데이터·이력 다 보존
   
3. 배정된 상담건 처리 (3가지 옵션 UI 제공):
   (A) 자동 미배정     : counselor_id = NULL (재배정 큐로 이동)  ★ 기본
   (B) 일괄 인수인계   : 다른 1명에게 모두 재배정
   (C) 룰 기반 분배    : 자동배정 룰 활용 (Phase A-4)
   
4. 30일 후 super_admin 검토 → 영구 삭제 (auth.users DELETE)
   → admin_users 도 ON DELETE CASCADE로 같이 삭제
   → consultations.counselor_id 는 ON DELETE SET NULL 로 자동 NULL
```

### 10.3 권한 변경 (role 승격/강등)

```
1. super_admin이 /admin/users → 해당 사용자 행 클릭
2. [편집] → role 드롭다운 변경
3. 즉시 반영 (다음 RLS 호출부터 새 권한 적용)
4. (선택) 본인에게 슬랙/이메일 알림
```

### 10.4 super_admin 다중화

- 현재: ourteam.kr@gmail.com 1명
- 권장: super_admin 최소 2명 유지 (1명 휴가·사고 대비)
- 추가 방법: 첫 super_admin이 두번째 super_admin을 [+ 사용자 초대] → role: super_admin
- 위험: super_admin 끼리 서로 강등 가능 → UI에서 본인 강등 방지 + 마지막 1명 삭제 방지 가드 필요 (Phase A-2)

### 10.5 비밀번호 분실

- Supabase Auth 기본 "비밀번호 재설정" 흐름 활용
- `/admin/login` 페이지에 [비밀번호 잊으셨나요?] 링크 추가 필요
- super_admin은 사용자 대신 비번 재설정 불가 (Supabase 정책) → 본인이 직접

### 10.6 보안 점검 (광고 시작 전 필수)

#### 10.6.1 Supabase Sign-up 차단 (★ 최우선)

**현재 상태** (2026-04-29 점검):
- 등록 사용자: 1명 (`ourteam.kr@gmail.com`, 자체 가입, 2026-04-23)
- 무단 가입 흔적: 없음 ✅
- sign-up 정책 (대시보드 토글): **수동 점검 필요** (DB로는 직접 안 보임)

**차단 절차** (대웅 직접):
```
1. Supabase 콘솔 접속 → 프로젝트 woori-nconnect 선택
   URL: https://supabase.com/dashboard/project/vbdoyambycopigfajcgk

2. 좌측 메뉴 → Authentication → Sign In / Providers (또는 Sign In / Up)

3. Email 섹션에서 다음 토글 OFF:
   ☐ "Allow new users to sign up" (또는 "Enable Sign Ups")
   
4. (옵션) Confirm Email 토글 ON 유지 (어차피 invite 흐름에선 자동)

5. 저장
```

**검증** (차단 후):
- 시크릿 브라우저에서 `/admin/login` 접속 → sign-up 폼 사라졌는지
- 또는 Supabase Auth API로 sign-up 시도 → "Signups not allowed" 에러 응답

#### 10.6.2 그 외 보안 점검 체크리스트

- [ ] `/admin/login` 페이지 코드에 sign-up UI 컴포넌트 자체 제거 (혹시 남아있다면)
- [ ] super_admin 이메일은 회사 도메인 (개인 gmail 지양 → ourteam.kr@gmail.com 은 도메인 메일이지만 형식이 gmail)
- [ ] super_admin Google 계정 2단계 인증 활성화
- [ ] Supabase service_role key 절대 클라이언트에 노출 X (.env.local + Vercel env에만)
- [ ] `/api/admin/*` 라우트는 모두 super_admin 또는 admin role 체크 (Phase A-2)
- [ ] Vercel Deployment Protection 활성화 검토 (preview 배포는 비밀번호 보호)

---

## 11. 변경 이력

| 일자 | 버전 | 변경 | 작성 |
|---|---|---|---|
| 2026-04-29 | v0.1 | 초안 (Phase A 토대) | 본부 |
| 2026-04-29 | v0.2 | 권한 시스템(admin_users + 5 role) 통합 + Supabase Free 유지 결정 반영 | 본부 |
| 2026-04-29 | v0.3 | counselor_id ON DELETE SET NULL + 운영 워크플로우 섹션(§10) 추가 | 본부 |
