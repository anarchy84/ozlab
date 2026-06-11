# 13. 상용화(SaaS) 프로젝트 인수인계 문서

> 작성: 2026-06-11 · 대상: 상용화 신규 프로젝트 담당자 (PM/개발)
> 이 문서 하나로 "오즈랩페이 시스템을 외부 업체에 납품하는 사업"의 배경·자산·선행과제를 파악할 수 있게 작성됨.
> 시스템 자체의 상세 명세는 기존 핸드오프 문서(00~12)를 참조. 본 문서는 **사업화 관점**만 다룬다.

---

## 1. 확정 컨셉 (2026-06-11, 대표 확정)

**포지셔닝: "디비 영업의 운영 OS"**
카페24/메이크샵이 이커머스(장바구니 전환)의 운영 OS라면, 우리는 **상담 신청이 전환인 업종**(렌탈·통신·시술·학원·인테리어·보험 등)의 운영 OS다. 이 시장은 홈페이지 제작사 / 디비 CRM(crmpro류) / 광고 대행사가 따로 놀고 있으며, 셋을 통합한 표준 인프라가 없다.

### 상품 구성 5요소

| # | 요소 | 비고 |
|---|---|---|
| 1 | 웹사이트 프론트 셀프 수정 | 제한적 편집 (윅스 아님). 셀링포인트는 "망가뜨릴 수 없는 편집" — 뭘 만져도 SEO/디자인이 안 깨짐. 인라인 편집(Phase 2D)이 데모 무기 |
| 2 | SEO 최적화 내장 웹사이트 | 기술 SEO(메타·구조화데이터·사이트맵·속도)는 시스템 내장. **순위는 콘텐츠 운영의 영역** — 언어를 반드시 분리해서 팔 것 ("SEO 준비된 그릇" vs "그릇을 채우는 운영") |
| 3 | 광고 데이터 추적 | 광고비 스프레드시트 전달 + UTM 매뉴얼 제공 → 디비 효율(CPL/ROAS) 추적 |
| 4 | 외부 매입 디비 성과 추적 | 매입처별 CPL·전환율·매출 기여 비교. **업계 유일 차별화** — "디비 업체들끼리 경쟁시켜 드립니다" |
| 5 | 토탈 솔루션 | 마케팅 성과분석 + CRM + SEO 결합 |

### 과금 모델

- **기본**: 구축비 + 시스템 월정액 (웹사이트+CRM+분석)
- **LTV 엔진**: SEO 콘텐츠 운영 구독 (블로그 n건/월 + 키워드 관리)
- **옵션**: 필요 시 우리가 외부업체처럼 리드를 공급하고 건당 과금
- **기각된 안**: CPL 기본 과금 — 우리가 리드 생산 책임을 지지 않으므로 기각 (대표 결정). 카페24식 결제수수료 모델도 GMV가 없어 불가

### 전개 전략

구축형 납품(고객사별 Vercel+Supabase 프로젝트 복제)으로 시작 → 3~5개사로 가격·온보딩 검증 → 멀티테넌트 SaaS 전환. 개인정보(전화번호 디비)를 다루는 업종 특성상 **테넌트별 DB 물리 분리가 오히려 영업 포인트** ("당신 디비는 당신 전용 DB에만 있다").

---

## 2. 납품 가능한 시스템 자산 (현재 보유)

오즈랩페이(ozlabpay.kr)에서 실제 운영 중인 기능. 상세는 04_ADMIN_UI / 05_API_ROUTES 참조.

- **공개 사이트**: 랜딩 + 상품 페이지(인터넷/POS/CCTV/테이블오더) + 블로그(SEO 콘텐츠) + 상담 신청 폼 + RSS
- **랜딩 빌더 + 인라인 편집**: 섹션 단위 노출/순서/내용 어드민 편집 (Phase 2D — 오즈랩 6/6 페이지 완료)
- **SEO 인프라**: 페이지별 메타/OG 어드민 편집, generateMetadata 통합, 구조화 마크업, RSS
- **CRM**: 상담 디비 접수 → 상담사 자동 배분 → 상태 관리(db_statuses 커스텀) → 상태 이력 → 매출 기록 연결
- **어트리뷰션**: UTM/gclid/fbclid/referer 자동 분류 (`classify_channel` — channel_mapping 마스터 1순위 조회, 2026-06-10 단일화 완료). 매체별 라벨·분류를 어드민 데이터로만 관리 (하드코딩 제거됨)
- **광고 성과 분석**: ad_metrics(시트 sync) × consultations × revenue 3-조인, 매체별 CPL/ROAS, 캠페인 드릴다운
- **외부 디비 매입 추적**: DB 매입 시트 sync (날짜·출처·매입수량·단가), db_group_label 기반 출처 관리
- **방문 추적**: site_visits (자체 GA 대체, 2026-06-10 신규 — prod 마이그레이션 적용 확인 필요)
- **알림**: 슬랙 신규 디비 알림 + 이상 시그널 룰(알림 빌더), 일일 다이제스트 cron
- **외부 CRM 연동**: crmpro.kr로 디비 자동 전달 (lib/integrations/crmpro.ts)
- **권한**: super_admin / admin / marketing / tm_lead / counselor 롤 분리

---

## 3. 인프라 사실 (중요 — 혼동 주의)

| 항목 | 값 |
|---|---|
| 리포 | github.com/anarchy84/ozlab (main, 총 96 커밋 @2026-06-11) |
| 호스팅 | Vercel `ozlab` (team anarchy84s-projects) → www.ozlabpay.kr |
| **오즈랩 prod DB** | Supabase **woori-nconnect** (ref: `vbdoyambycopigfajcgk`) — 프로젝트 이름만 옛날 것. 이름 변경 권장 |
| 주의 | Supabase `wooripen`(llnzuczikgvbxxujztao)은 우리편 사이트용 — **별개 프로젝트, 혼동 금지** |
| 주요 env | `CRM_PRO_API_KEY/GROUP_NO`, Supabase service_role, 슬랙 토큰 — `.env.local` + Vercel env |
| 플랫폼 이전 | Vercel → Cloudflare Workers(OpenNext) 이전 결정됨 (12_CLOUDFLARE_MIGRATION.md). **복제(납품) 시작 전 플랫폼 확정 필수** — n개 리포 만든 뒤 이전하면 비용 n배 |

---

## 4. 커밋 히스토리 (사업화 관점 마일스톤)

### 타임라인 요약

- **04월**: 프로젝트 생성, 상담 접수/어드민 기반, 어트리뷰션 5컬럼+자동분류(`20260430000002`)
- **05/21**: 페이지 SEO·OG 어드민(Phase 7-C), generateMetadata 통합 → **상품요소 ② 기반**
- **05/26**: 리브랜드(OZ labPay), 랜딩 섹션 빌더, 상담 옵션 DB화, products 4종 통합 양식 → **상품요소 ① 기반**
- **05/27**: 광고 퍼포먼스 풀패키지(UTM 매핑+3조인+CPL/ROAS), DB 매입 모델, 2개 시트 sync → **상품요소 ③④ 기반**
- **05/28**: 상품 시트 sync 60대 친화 템플릿 ("3개월 초짜 친화" UX 표준 적용 사례)
- **06/02**: 핸드오프 문서 12종 완성 → **납품 운영 매뉴얼의 뼈대**
- **06/05**: crmpro 디비 전달 연동, 상담사 배분 수리, Cloudflare 이전 문서
- **06/10**: 채널 분류 단일화(`cd44ab1`) — 분류·라벨의 단일 진실원을 channel_mapping 테이블로 통합. **테넌트별 매체 커스터마이징의 기술 기반** (코드 수정 없이 DB 행으로 매체 추가). 트래픽 중심 광고 대시보드, RSS, 방문 추적

### 최근 커밋 로그 (06/01~06/10)

```
9d672f8 06-10 fix(admin): 광고비 sync 문구 정리
28fccb5 06-10 fix(admin): 토스 DB 매입 소스 제거
d56fc57 06-10 feat(admin): 트래픽 중심 광고 대시보드로 전환
cd44ab1 06-10 feat(attribution): 채널 분류 단일화 — channel_mapping 마스터 1순위
18953f3 06-10 fix(footer)+feat(rss): 푸터 hover 버그 + RSS 피드
f0b7e70 06-10 fix: show DB purchase spend in media performance
8d5b155 06-10 fix: split DB purchase spend in paid media daily trend
f751901 06-10 fix: preserve homepage Open Graph site name
980a6f4 06-10 fix: map paid media UTM aliases
d96fbde 06-05 fix: ensure CRMPro lead submit runs before response
ae89be2 06-05 docs: add Cloudflare migration handoff
599055a 06-05 feat: send consultation leads to CRMPro
00e1204 06-05 fix: repair consultation assignment flow
ca6cd6f 06-02 docs: add handoff decision log
76166cb 06-02 chore: add handoff docs and latest admin fixes
95645c2 06-01 Add privacy policy PDF link
```

전체 이력은 `git log --oneline` (96 커밋). 5월 중순 이전 상세는 01_PROJECT_OVERVIEW.md 참조.

---

## 5. 상용화 선행 과제 (기술)

우선순위 순. 견적 산정 시 이 4개가 "템플릿화" 공수의 본체다.

1. **하드코딩 전수 제거** — 브랜드명·도메인·전화번호·슬랙 워크스페이스·상품군을 site_settings/env로 분리. 사례: `classify_channel` 내 `ozlabpay.kr` 도메인 분기(internal 판정), OG 사이트명, 푸터 사업자 정보. `grep -rn "ozlabpay\|오즈랩"` 으로 전수조사부터
2. **프로비저닝 자동화** — Supabase 프로젝트 생성 → 마이그레이션 전체 적용 → 시드(channel_mapping·db_statuses·상담옵션) → Vercel/CF 프로젝트 생성 → 도메인 연결. 스크립트 한 벌이면 신규 고객사 셋업 1시간 목표
3. **운영 매뉴얼 재가공** — docs/handoff 00~12를 "고객사 운영자용"으로 톤 변환 (내부 개발 문서 → 납품 매뉴얼). "3개월 초짜 친화" UX 표준(11_DECISIONS 참조)이 이미 기준
4. **플랫폼 확정** — Cloudflare 이전(12번 문서)을 복제 시작 전에 완료할지, Vercel로 갈지 결정

## 6. 영업·법무 체크리스트

- **기대치 관리**: 셀프 편집 범위를 계약서/매뉴얼에 명시 ("텍스트·이미지·섹션은 직접, 구조 변경은 별도 견적"). "윅스가 아님"을 약점이 아닌 안전성으로 포지셔닝
- **SEO 언어 분리**: "기술 SEO 내장"과 "순위 보장"을 절대 섞지 말 것 — CS 리스크 1순위
- **개인정보 처리위탁 계약**: 고객사 디비(전화번호)를 우리 인프라에서 수집·보관하므로 필수. 표준 위탁계약서 변호사 검토 1회
- **crmpro 관계**: 현재 오즈랩이 crmpro에 디비를 전달하는 고객이면서, 상용화 시 crmpro의 경쟁자가 됨. 벤치마크 기록은 ozlab_crm_benchmark(메모리)·11_DECISIONS 참조

## 7. 열린 이슈 (인수 시점 기준)

- crmpro 전달 실패 시 **재시도/알림/성공기록 없음** — 2026-06-10 장애 때 하루치 5건이 조용히 미전달됨 (전건 수동 복구 완료). `crmpro_sent_at` 컬럼 + 슬랙 알림 + 어드민 재전송 버튼 제안 상태
- `/api/track/visit` 500 — site_visits 마이그레이션(`20260610044332`) prod 미적용 상태였음. 적용 여부 확인 필요
- 슬랙 알림 룰이 `inferred_channel` 문자열 필터를 쓰는 경우 06-10 채널 코드 변경(naver-ads → naver-search 분리 등)의 영향 확인

---

*관련 문서: [00_INDEX](./00_INDEX.md) · [01_PROJECT_OVERVIEW](./01_PROJECT_OVERVIEW.md) · [08_OPEN_ISSUES](./08_OPEN_ISSUES.md) · [12_CLOUDFLARE_MIGRATION](./12_CLOUDFLARE_MIGRATION.md)*
