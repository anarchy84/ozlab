# 01. 프로젝트 개요 — 비즈니스 모델 + 도메인

## 1. 한 줄 설명

오즈랩페이는 **소상공인 대상 4종 상품(인터넷·POS단말기·CCTV·키오스크/테이블오더) 가입을 영업하는 TM(텔레마케팅) 비즈니스**다. 어드민은 **광고비 → 리드 → 상담 → 개통/매출 → 인센티브** 전체 파이프라인을 데이터로 분해한다.

## 2. 4종 핵심 상품

| 분류 | 내부 코드 | 가격 모델 | 비고 |
|---|---|---|---|
| **인터넷** | `internet` | 지원금 모델 (원가=0, 우리수당=지원금=매출, 고객가=0) | SKT/KT/LG 광랜·500M·1기가. 약정 12~48개월 |
| **POS 단말기** | `pos` | 단가 모델 (원가/마진/판매가) | NIT·네이버 양식. NC-6000, JT-2000 등. 정찰제 7단가(1/5/10/20/30/50/100대) |
| **CCTV** | `cctv` | 단가 모델 | 4채널/8채널/팩 단위 |
| **키오스크 + 테이블오더** | `kiosk` / `tableorder` | 단가 모델 | NAK-10/20, 티오더, 주방용 등 |

### 부속 분류

- `internet_option` — 추가셋탑, WIFI 7, 애플셋탑, OSS 인센티브
- `internet_usim` — 유심결합 정책 (33/43/69/79 요금제 별 지원금)
- `pos_accessory` — 커넥트, 유선프린터, 금전함, 듀얼모니터 등

> 분류 매핑은 `app/api/admin/products/bulk/route.ts` 의 `KO_CATEGORY` 객체.

### 가격 모델 비교

```
[POS 단말기]   원가 18만 ─┐
                          ├─ 우리 마진 4만 ─┐
                          │                ├─ 고객 판매가 22만
                          └────────────────┘
                          (단가 모델)

[인터넷 광랜]  원가 0  ─┐
                        ├─ 우리 수당(지원금) 28만 ─── 우리 매출 = 28만
                        ├─ 고객 부담 0
                        └─ (사은품/패널티 별도)
                        (지원금 모델)
```

## 3. 3대 CRM 채널 (영업 채널)

광고에서 들어온 리드(consultation)는 다음 3개 채널 중 하나로 분류된다:

| CRM 채널 | 의미 | 데이터 출처 |
|---|---|---|
| **자체** | 우리 사이트(`ozlabpay.kr`) 유입 → utm 어트리뷰션 가능 | `consultations.utm_source` |
| **토스 프리미엄** | 토스 측 우선 채널 (할증 매입) | `ad_metrics.channel='토스 프리미엄'` (source=db_purchase) |
| **토스 스프레드** | 토스 측 일반 채널 (대량 매입, 30,000원/건 균일가) | `ad_metrics.channel='토스 스프레드'` |

> 자체 채널은 광고 사이드(매체×캠페인) 정보가 있고, 토스는 utm 없이 시트로 일괄 매입된다.

## 4. 광고 매체 (페이드 미디어)

현재 활용 중인 매체 4종 + 정규화 코드:

| 매체 (시트 표기) | `channel_code` |
|---|---|
| 구글ads | `google-ads` |
| 메타 비즈니스 (페이스북/인스타) | `meta-ads` |
| 당근 비즈니스 | `daangn-ads` |
| 네이버 검색광고 | `naver-search` |

> 시트 한글 → channel_code 매핑은 `sheet_channel_alias` 테이블 (현재 26개 시드). 자세한 건 `03_DB_SCHEMA.md`.

## 5. 인센티브 룰 (현재 시트 운영, 미DB화)

직원별 평일/주말 입력 → 월별 인센 산정:

| 구분 | 조건 | 수식 |
|---|---|---|
| 평일 | 월 누적 40P 이상부터 | (합계P − 40) × 30,000원 |
| 주말 | 조건 없음 | 합계P × 50,000원 |

### 상품별 P 단가 + 귀속일

| 상품 | 평일 P | 주말 P | 귀속일 (인센티브 인정월 결정) |
|---|---:|---:|---|
| 인 (인터넷) | 1.5 | 1.5 | 인터넷 설치일 |
| 티 (전화) | 0.5 | 0.5 | 접수일 |
| 전 (TV/CCTV 등) | 0.1 | 0.1 | 접수일 |
| CCTV | 0.2 | 0.2 | 접수일 |
| 테이블오더 | 0.2 | 0.2 | 테이블오더 설치일 |
| 정수기 | 0.2 | 0.2 | 정수기 설치일 |
| VAN | 0.5 | **0.3** | 토스 설치일 |
| 토스 | 0.2 | 0.2 | 토스 설치일 |
| 키오스크 | 1.0 | 1.0 | 접수일 |
| 배달연동 | 1.0 | 1.0 | 접수일 |
| 학원연동 | 0.5 | 0.5 | 접수일 |

> 이 룰은 **Phase F에서 DB화 예정**. 현재는 우리편 시트 (`인센티브_단가` / `인센티브_박영철` / `인센티브_임승현`)에 있음. `09_NEXT_STEPS.md` 참조.

## 6. 매출 4차원 분해 (대웅의 핵심 비전 — 절대 잊지 말 것)

매출이 발생하면 다음 4축 으로 분해해서 봐야 한다:

```
매출
 ├── 어떤 광고에서 들어왔는지     → consultations.utm_source/medium/campaign
 ├── 어떤 상담사가 상담했는지    → consultations.assigned_to / closed_by
 ├── 어떤 상품인지              → revenue_records.product_id (또는 line items)
 └── 언제 인식됐는지            → revenue_records.recognized_at
```

현재 상태:
- ✅ 매체별 분해: `/admin/dashboard/paid-media` (페이지)
- ✅ utm 캠페인 드릴다운: 같은 페이지
- ⏳ **상담사별 분해**: 미구현
- ⏳ **상품별 분해**: 부분 구현 (ADR_014 진행 중)

→ Phase G (또는 별도 페이지) 에서 `상담사 × 상품 × 일자 × 매체` 매트릭스 페이지가 필요. `09_NEXT_STEPS.md` 참조.

## 7. 멀티 사이트 (`site` 컬럼)

`ad_metrics.site` 컬럼으로 다른 사이트 데이터를 한 테이블에 보관:

| `site` 값 | 의미 |
|---|---|
| `ozlab` (기본) | 오즈랩페이 본격 운영 데이터 |
| `wooripen` | 2026-04~05 우리편 시트 일괄 import 데이터. 오즈랩 본격 운영 시작 후 `DELETE WHERE site='wooripen'` 한 줄로 정리. |

> SaaS 멀티테넌트로 확장될 가능성 있음. `09_NEXT_STEPS.md` § SaaS 확장 참조.

## 8. 시트 sync 패턴 (운영 자동화 패턴)

세 개의 시트 sync 가 동일한 패턴으로 동작:

| sync 종류 | 어드민 페이지 | DB 테이블 | 결과 |
|---|---|---|---|
| **광고비 sync** (DB매입) | `/admin/settings/ad-sync` | `ad_metrics` (source='db_purchase') | 시트 → ad_metrics 일별 |
| **광고비 sync** (페이드미디어) | 같은 페이지 | `ad_metrics` (source='paid_media') | 시트 → ad_metrics 일별 |
| **상품 sync** | `/admin/settings/product-sync` | `products` | 시트 → products upsert |

공통 패턴:
1. 어드민에서 구글 시트 URL 등록 (edit URL 자동으로 CSV export URL로 변환)
2. **🧪 미리보기** (dry_run) — DB 변경 없이 검증
3. **🚀 동기화 실행** (POST) — 실제 upsert
4. 결과를 sync_config 테이블에 기록 (last_synced_at, last_status, last_message)
5. (광고 sync 만) Slack 알림 `alerts_warning` 채널로 broadcast

> 자세한 흐름은 `06_DATA_FLOWS.md`.

## 9. 사용자 정의 권한 (role)

| role | 의미 | 주요 권한 |
|---|---|---|
| `super_admin` | 대표 / 시스템 관리자 | 모든 메뉴 |
| `admin` | 일반 관리자 | 상담 + 매출 + 광고 + 일부 설정 |
| `marketing` | 마케팅 | 광고 sync + paid-media 대시보드 |
| `marketer` | 마케터 (마케팅과 유사) | 광고 + 상품 sync |
| `tm_lead` | TM 팀장 | 상담 분배 + DB 정책 |
| `tm` | TM 일반 | 자신의 상담만 |

> RLS 정책은 마이그레이션 별로 분산. `03_DB_SCHEMA.md` § admin_users + RLS 패턴.

## 10. 도메인 / 외부 의존성

| 외부 서비스 | 용도 | 인증 |
|---|---|---|
| Google Sheets | 시트 sync 입력 | 공유 권한 "링크가 있는 모든 사용자 — 뷰어" |
| Vercel | 호스팅 + 자동 배포 | GitHub 연동 (main push 시 자동) |
| Supabase | DB + Auth + Storage | Service Role Key (환경변수) |
| Slack | 알림 (`alerts_warning` 채널) | Bot Token (환경변수) |
| Google Analytics 4 / GTM | 사이트 트래킹 | (`/admin/settings/head` 에서 관리) |

> 환경변수 상세는 `02_INFRA.md` § 환경변수.

## 11. 비즈니스 KPI (paid-media 페이지 기준)

| KPI | 의미 | 계산 |
|---|---|---|
| **광고 리드** | 광고 플랫폼이 보고한 결과수 | `ad_metrics.conversions` SUM |
| **CRM 리드** | 우리 사이트에 utm 매칭으로 도착한 리드 | `consultations` count (utm 정규화 후) |
| **광고 CPL** | 광고비 / 광고 리드 | spend / ad_leads |
| **CRM CPL** | 광고비 / CRM 리드 | spend / leads |
| **개통** | 실제 매출 발생 (revenue_records) | revenue_records count |
| **CPA** | 광고비 / 개통 | spend / conversions |
| **ROAS** | 매출 / 광고비 | revenue / spend × 100% |
| **개통률** | 개통 / CRM 리드 | conversions / leads × 100% |

> 광고 측 vs CRM 측 어트리뷰션 갭이 한눈에 보이게 분리. `04_ADMIN_UI.md` § paid-media 페이지 참조.

## 12. 우리편 4-5월 데이터 (참고)

`ad_metrics` 에 `site='wooripen'` 으로 임시 보관 중. 시트 합계와 100% 일치 검증 완료:

| 기간 | 페이드 광고비 | 페이드 전환 | DB매입 수량 | DB매입 비용 |
|---|---:|---:|---:|---:|
| 2026-04 | 22,963,780원 | 513건 | 517건 | 15,510,000원 |
| 2026-05 (~26일) | 285,991원 | 7건 | 272건 | 8,160,000원 |

> 분석 상세: `docs/wooripen_sheet_analysis.md`.

## 13. 다음 문서로

- 인프라/배포 환경 → `02_INFRA.md`
- DB 스키마 전체 → `03_DB_SCHEMA.md`
- 어드민 24개 페이지 명세 → `04_ADMIN_UI.md` (가장 두꺼움)
