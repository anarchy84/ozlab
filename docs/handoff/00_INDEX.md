# 오즈랩페이 어드민 시스템 — 개발팀 인수인계 (마스터 인덱스)

> **작성일**: 2026-06-02
> **작성 범위**: 어드민 + 데이터 파이프라인 + 시트 sync + 광고/매출 분석
> **인계 대상**: 신규 합류하는 개발팀
> **저장 위치**: `docs/handoff/` 폴더

---

## 1. 빠른 시작 (Day 1)

처음 합류했다면 **위에서 아래 순서**로 읽으세요:

| # | 문서 | 읽는 이유 | 소요 |
|---|---|---|---|
| **1** | `01_PROJECT_OVERVIEW.md` | 비즈니스 모델 — 4종 상품 / 3대 CRM 채널 / 광고 매체 | 15분 |
| **2** | `02_INFRA.md` | 어디서 돌고 있나 — Vercel + Supabase 프로젝트 ID + 환경변수 | 10분 |
| **3** | `10_FILES_MAP.md` | 디렉토리 어디에 뭐 있나 | 10분 |
| **4** | `03_DB_SCHEMA.md` | 핵심 테이블 + 관계 | 30분 |
| **5** | `04_ADMIN_UI.md` | **가장 중요** — 어드민 24개 페이지 전수 명세 | 1시간 |
| **6** | `05_API_ROUTES.md` | 49개 API 라우트 명세 | 40분 |
| **7** | `06_DATA_FLOWS.md` | 시트 sync / 광고 분석 / 매출 계산 흐름 | 30분 |
| **8** | `07_DESIGN_SYSTEM.md` | 디자인 토큰 / 색상 룰 / 컴포넌트 패턴 | 15분 |
| **9** | `08_OPEN_ISSUES.md` | 알려진 이슈 + 데이터 품질 | 15분 |
| **10** | `09_NEXT_STEPS.md` | 다음 작업 로드맵 (Phase F~H) | 20분 |
| **11** | `11_DECISIONS.md` | 주요 의사결정 + 이유 (왜 이렇게 만들어졌나) | 20분 |
| **12** | `12_CLOUDFLARE_MIGRATION.md` ★ | **Vercel → Cloudflare 전면 이전 마스터 플랜** | 30분 |

**총 약 4.5시간** 이면 시스템 전체 그림 + Cloudflare 이전 계획까지 파악 가능.

> 12번은 Cloudflare 이전 작업 시작 전 필독. 템플릿 파일 3종은 `docs/handoff/templates/` 폴더:
> - `wrangler.toml.example`
> - `open-next.config.ts.example`
> - `api-route-patch-examples.md`

## 2. 자주 묻는 질문 — 어디 봐야 하나?

| 궁금한 것 | 보세요 |
|---|---|
| 새 어드민 페이지를 추가하려면? | `04_ADMIN_UI.md` § 페이지 추가 패턴 |
| 새 API 라우트를 추가하려면? | `05_API_ROUTES.md` § 라우트 추가 패턴 |
| 새 마이그레이션 작성하려면? | `03_DB_SCHEMA.md` § 마이그레이션 작성 규칙 |
| 시트 sync 가 어떻게 돌아가나? | `06_DATA_FLOWS.md` § ad-sync / product-sync |
| 광고비 / 리드 / 매출 어떻게 매칭되나? | `06_DATA_FLOWS.md` § paid-media 페이지 데이터 흐름 |
| Supabase URL/Key 어디 있나? | `02_INFRA.md` § 환경변수 |
| 우리편 vs 오즈랩 데이터 분리 어떻게? | `11_DECISIONS.md` § site 컬럼 결정 |
| `광고 리드` vs `CRM 리드` 차이? | `04_ADMIN_UI.md` § paid-media 페이지 |
| 어드민 권한 (role) 구조? | `03_DB_SCHEMA.md` § admin_users + `04_ADMIN_UI.md` § 권한 |

## 3. 시스템 상태 (2026-06-02 기준)

### 현재 데이터 행수
- `ad_metrics`: 566행 (우리편 wooripen 4-5월 import 됨)
- `consultations`: 17행 (테스트 데이터)
- `revenue_records`: 0행 (실 매출 미시작)
- `products`: 1행 (테스트)
- `channel_mapping`: 24행 (시드 — 한국 디지털마케팅 표준)
- `sheet_channel_alias`: 26행 (시드 — 시트 매체값 정규화)
- `product_categories`: 5행
- `admin_users`: 5명

### 인프라
- **Supabase 프로젝트**: `woori-nconnect` (project_id: `vbdoyambycopigfajcgk`, region: `ap-northeast-2`)
- **Vercel 프로젝트**: `ozlab` (team: `anarchy84s-projects`) — **Cloudflare 이전 예정** (12번 문서 참조)
- **도메인**: `www.ozlabpay.kr`
- **GitHub**: `github.com/anarchy84/ozlab`

### 운영 상태
- ✅ paid-media 분석 대시보드 (광고/CRM 리드 분리, 매체별 효율)
- ✅ 상품 시트 sync (한글 헤더, 4종 분류, 60대 친화 가이드)
- ✅ ad-sync (DB매입 + 페이드미디어 2종 시트)
- ✅ 우리편 4-5월 데이터 import (site='wooripen' 분리)
- 🔄 매출 시스템 (transactions v2 ADR_014 진행 중)
- ⏳ 인센티브 시스템 (미시작)
- ⏳ 매출 4차원 분해 페이지 (광고×상담사×상품×일자, 미시작)
- ⏳ 인터넷 정책서 통합 (수동 변환 안내만 함)

## 4. 우선순위 — 다음 개발 작업

`09_NEXT_STEPS.md` 에 상세. 요약:

1. **P0** — 우리편 데이터 정리 (오즈랩 운영 시작 후 `DELETE WHERE site='wooripen'`)
2. **P1** — 매출 4차원 분해 페이지 (대웅 핵심 비전)
3. **P1** — Phase F 인센티브 시스템 (incentive_rates + entries + view)
4. **P2** — Phase G 지출 시스템 (expenses + 손익 통합)
5. **P2** — Vercel Cron (시트 자동 sync 새벽 3시)
6. **P3** — SaaS 멀티테넌트 확장 (tenant_id 컬럼)

## 5. 중요한 의사결정 (절대 잊지 말 것)

`11_DECISIONS.md` 에 전체. 핵심 3가지:

1. **4종 상품 통합 마스터 시트 1개** — 인터넷/POS/CCTV/테이블오더(키오스크) 모두 한 시트. 절대 분리하지 말 것. (대웅 2026-05-27 명시)
2. **매출 4차원 분해** — 광고매체 × 상담사 × 상품 × 일자. 모든 매출 트래킹은 이 4축 보존.
3. **인센티브 단일 시트** — 직원별 정책도 하나의 시트.

## 6. 관련 외부 문서

| 문서 | 위치 | 비고 |
|---|---|---|
| 인터넷 정책서 변환 가이드 | `docs/PRODUCT_SYNC_GUIDE.md` | 담당자용 |
| 60대 친화 체크리스트 | `docs/templates/상품_마스터_시트_사용법_체크리스트.md` | 담당자용 |
| 표준 양식 xlsx | `docs/templates/오즈랩_상품_마스터_시트_v1.xlsx` | 31행 예시 + 3탭 + 드롭다운 |
| 우리편 시트 분석 | `docs/wooripen_sheet_analysis.md` | 우리편 4-5월 진단 |
| Phase E PRD | `docs/PHASE_E_PRD.md` | 시트 sync 멀티사이트 |
| ADR_014 거래 객체 | `docs/ADR_014_TRANSACTIONS_DATA_MODEL.md` | 매출 자동화 |
| UTM 가이드 | `docs/UTM_NAMING_GUIDE.md` | 광고대행사 핸드오프 |
| 마케팅 감사 | `docs/MARKETING_AUDIT.md` | 마케팅 시스템 감사 |

## 7. 외부 메모리 (대웅의 누적 의사결정)

대웅이 별도로 관리하는 메모리 시스템에 비전·결정 기록됨. 핵심 메모:

- `ozlab_product_vision` — **절대 잊지 말 것**. 4종 통합 + 4차원 분해 + 인센티브 단일 시트
- `ozlab_paid_media_analytics` — 광고 분석 시스템 전체 그림
- `ozlab_admin_analytics` — 분석/대시보드 요구사항
- `ozlab_admin_roadmap` — 어드민 기능 큰 그림
- `revenue_automation_status` — 매출 자동화 진행
- `next_steps_queue` — 다음 단계 큐
- `ozlab_saas_potential` — SaaS 확장 비전 (멀티테넌트 염두)

## 8. 연락 / 질문

| 분야 | 누구에게 |
|---|---|
| 비즈니스 의사결정 / 신규 기능 우선순위 | 대웅 (대표) |
| Supabase 권한 / 인프라 결제 | 대웅 |
| GitHub repo 권한 / Vercel 배포 권한 | 대웅 |
| 시트 sync 운영 (담당자가 모를 때) | 상품 마스터 담당자 |
| 디자인 / UX 결정 | 디자인 담당자 (지정 시) |
