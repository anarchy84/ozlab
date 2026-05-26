# ADR-014 — 거래(Transaction) + 다중 매출 흐름 데이터 모델

- 작성일: 2026-05-26
- 상태: **제안 (대웅 검수 대기)**
- 결정자: 대웅
- 관련 마이그레이션: `20260526060000_transactions_v2.sql`

---

## 1. 컨텍스트

현재 마케팅팀은 구글 시트 **「우리편_광고 성과 파이프라인 v2.0」** (25+ 탭)에서
광고성과·매출성과·인센티브성과를 운영 중. 이 시트를 폐기하고 ozlab 어드민에
**거래 객체 중심의 자동 집계 시스템**을 구축하는 것이 목표.

기존 `revenue_records` 테이블은 "매출 1건 = 1행" 단순 구조라
다음 3가지 비즈니스 요구를 충족할 수 없음:

1. **시점별 3개 매출 보존** — 예상(TM 입력) → 정산(본사 정산서) → 실수령(통장)
   세 값이 동시에 살아있어야 매일/정산後/월말 의사결정이 가능.
2. **거래 1건의 다중 매출 흐름** — 결합상품(인터넷+CCTV+키오스크 등)은
   거래 1건에 매출 유형이 4~5개 동시 존재.
3. **매출 유형별 회계 처리 차이** — 일시정산 / 분할(할부) / 변동(VAN수수료) /
   선지급원가(기기값) / 회수 매출(기기 할부) 각각 추적 방식 다름.

---

## 2. 결정 사항

### 2-1. 4계층 데이터 모델

```
customers (고객 마스터)
   │ 1:N
   ▼
transactions (거래 1건 = 한 번의 영업 성공)
   │ 1:N
   ▼
revenue_streams (이 거래에서 발생할 매출 흐름들 — 5종)
   │ 1:N
   ▼
revenue_events (실제 발생한 매출/입금 이벤트 — settlement/bank 매칭 결과)
```

### 2-2. 매출 흐름 5종 (`stream_type`)

| 코드 | 의미 | 예측 가능? | 추적 방식 | 예시 |
|---|---|---|---|---|
| `lump_sum` | 일시정산 매출 | ✅ 정책에서 확정 | 1회 매출 인식 | 인터넷 정산, 단말기 본사 인센 |
| `installment` | 할부 매출 (월별 균등) | ✅ 약정총액 확정 | 매월 인식 + 잔여 이연매출 | 키오스크/테오 60개월 할부 |
| `variable` | 변동 매출 (예측 불가) | ❌ 결제량 따라 | 항목만 + 통장 들어올 때 가산 | 토스단말기 VAN 수수료 |
| `device_cost` | 선지급 기기원가 | ✅ 즉시 확정 (음수) | 거래 시점 1회 차감 | 단말기 매입비 |
| `device_recovery` | 기기값 회수 매출 | ✅ 약정총액 확정 | 매월 인식 + BEP 추적 | 단말기 60개월 할부 회수금 |

### 2-3. 시점별 3개 매출 (한 stream에 동시 보존)

| 컬럼 | 채우는 사람 | 채우는 시점 | 보는 화면 |
|---|---|---|---|
| `expected_total` | TM 상담원 | 거래 등록 즉시 | 매일 — 광고 의사결정 |
| `settled_total` | 정산팀 | 본사 정산서 매칭 시 | 정산後 — 손익 정교화 |
| `collected_to_date` | 회계 (자동) | 통장 거래 매칭 시 (누적) | 월말 — 현금흐름/미수 |

**원칙**: 정산서 들어와도 `expected_total` 안 지움. 통장 들어와도 `settled_total` 안 지움.
**셋 다 보존**해야 시점별 의사결정 가능.

### 2-4. customer_id 정책

- 형식: `CUS-YYYY-NNNN` (예: `CUS-2026-0001`)
- 자동 발급 (시퀀스 + 트리거)
- TM 거래 등록 시 "기존 고객 검색 → 없으면 신규 발급"
- 같은 고객의 인터넷·CCTV·키오스크 가입은 **거래 N건, customer_id 1개**

### 2-5. 정책(policies) 분리 — 본사 정책서·구두 프로모션 통합

`policies` → 정책 헤더 (통신사/CCTV/키오스크/테오/카톡프로모션)
`policy_pricing` → 정책 단가 라인 (본수수료/추가인센/결합인센/사은품/차감/환수/프로모션)
`policy_clawback_rules` → 환수룰 (사용일수별 환수율)

거래 생성 시 `policy_pricing.id` 참조하면 단가 자동 입력 (예상 매출 자동 계산).

### 2-6. 정산서·통장 원본 보존

본사 정산서는 **양식 그대로 업로드** → `settlements_raw` 에 통째 저장
어드민이 자동으로 `settlement_lines` 로 파싱 → 거래에 매칭

통장(IBK)도 동일: `bank_records_raw` → 매칭 룰로 거래에 자동 연결.

---

## 3. 핵심 시나리오 4개 — 데이터 모델 동작 검증

### 시나리오 A — 인터넷 가입 (일시정산형)

```
[2026-05-07] TM 등록
  └─ customers: CUS-2026-0001 강은비
  └─ transactions: trx_001, status='expected'
       └─ revenue_streams: 
            - stream_type='lump_sum', expected_total=304,545
            
[2026-05-11] TM 개통 표시 → transactions.status='activated'
[2026-05-22] 정산서 업로드 → settlement_lines 매칭
  └─ revenue_streams.settled_total=304,545
  └─ transactions.status='settled'
  
[2026-05-23] IBK 통장 입금 매칭
  └─ revenue_events: trx_001/lump_sum +304,545 from bank
  └─ revenue_streams.collected_to_date=304,545
  └─ transactions.status='collected', outstanding=0
```

### 시나리오 B — 키오스크 할부 (분할매출형)

```
[2026-05-15] TM 등록
  └─ transactions: trx_002, contract_months=60
       └─ revenue_streams:
            - stream_type='installment', expected_total=600,000, 
              schedule: 60회 × 10,000 (매월 25일)
            - stream_type='device_cost', expected_total=-500,000 (즉시)
            
[2026-05-15] 즉시 device_cost 인식
  └─ revenue_events: trx_002/device_cost -500,000 from manual
  
[2026-06-25] 1회차 입금 매칭
  └─ revenue_events: trx_002/installment +10,000 from bank
  └─ outstanding_remaining = 590,000
  
[... 60회 반복 ...]
```

### 시나리오 C — 토스단말기 (VAN수수료형 + 본사인센 + 기기원가)

```
[2026-05-15] TM 등록
  └─ transactions: trx_003
       └─ revenue_streams:
            - stream_type='lump_sum',  expected_total=300,000 (본사인센)
            - stream_type='device_cost', expected_total=-500,000 (매입비)
            - stream_type='variable',  expected_total=NULL (VAN, 예측불가)
            
[2026-05-22] 본사 정산서 + 매입비 출금 동시
  └─ lump_sum.settled=300,000, lump_sum.collected=300,000
  └─ device_cost.collected=-500,000
  └─ 거래 누적 손익: -200,000 (BEP까지 거리)
  
[2026-06-25] IBK 입금 47,300 (VAN 5월분)
  └─ revenue_events: trx_003/variable +47,300 from bank
  └─ variable.collected_to_date=47,300
  └─ BEP 진행률: (300K - 500K + 47.3K) / 500K = -30.5% (회수 중)
```

### 시나리오 D — 결합상품 (인터넷 + 키오스크 + 추가인센)

```
[2026-05-20] TM 등록
  └─ transactions: trx_004 (결합 거래)
       └─ revenue_streams (4개 동시):
            - stream_type='lump_sum',  expected=304,545 (인터넷 본수수료)
            - stream_type='lump_sum',  expected=170,000 (결합 추가인센)
            - stream_type='installment', expected=600,000 (키오스크 60개월)
            - stream_type='device_cost', expected=-500,000 (키오스크 매입)
            
[정산·통장 처리는 각 stream 독립적으로 진행]
[60개월 누적 손익: 304,545 + 170,000 + 600,000 - 500,000 = 574,545]
```

---

## 4. 정산서/통장 매칭 룰

### 4-1. 정산서 매칭

매칭 키 우선순위:
1. **가입번호 + 통신사** (1순위, 자연키)
2. 가입번호 미일치 시 → **고객명 + 통신사 + 접수일자 ±7일** (2순위)
3. 둘 다 실패 → `/admin/settlements/unmatched` 에서 사람 컨펌

매칭 성공 시:
- `settlement_lines.matched_transaction_id` 채움
- `revenue_streams.settled_total` 업데이트
- 차이 (`settled - expected`) 자동 계산 → 분석 화면 표시

### 4-2. 통장 매칭

매칭 키 우선순위:
1. **적요 가입번호 끝 4자리** (본사 정산금 케이스)
2. **고객명 fuzzy + 금액 ±5%** (고객 직접 입금)
3. **금액 단독 (≥10만원)** + 시점 ±1일 (대량 정산금)
4. 실패 → `/admin/bank/unmatched`

---

## 5. 호환성 — 기존 revenue_records

- `revenue_records` 테이블은 **삭제 안 함** (기존 데이터 보존)
- 신규 매출 입력은 `transactions + revenue_streams` 로만
- 호환 view `v_revenue_legacy` 생성 — 기존 코드가 revenue_records 조회하는 곳을 점진적으로 신규 모델로 마이그레이션
- 기존 분석 view 3종 (`v_revenue_by_channel`, `v_revenue_ltv_by_channel`, `v_revenue_by_product`)은
  신규 모델 기반으로 **v2 view** 추가 작성 (기존 view 병행 유지)

---

## 6. RLS 정책 (5 role 기준)

| 테이블 | super_admin | admin | marketing | counselor (영업자) | tm |
|---|---|---|---|---|---|
| customers | RW | RW | R | R (본인 담당만) | R |
| transactions | RW | RW | R | RW (본인 영업건만) | RW (담당건) |
| revenue_streams | RW | RW | R | R (본인 영업건만) | RW (담당건) |
| revenue_events | RW | RW | R | R (본인 영업건만) | R |
| settlements_raw | RW | RW | R | - | - |
| bank_records_raw | RW | RW | - | - | - |
| policies | RW | RW | RW | R | R |

---

## 7. 화면 3종 — 데이터 모델이 지원하는 의사결정

| 화면 | URL | 누가 | 보는 KPI | 데이터 소스 |
|---|---|---|---|---|
| 매일 대시보드 | `/admin/dashboard/daily` | 대웅 + 마케터 | 매체별 CPL/CPA/ROAS/부재율, 영업자별 예상인센 | `transactions.expected` + ad_metrics |
| 정산後 대시보드 | `/admin/dashboard/settlement` | 정산팀 + 영업관리 | 예상 vs 실제 차이, 매체별 실매출, 인센 재계산 | `revenue_streams.settled - expected` |
| 월말 대시보드 | `/admin/dashboard/cashflow` | 회계 | 누적 미수금, 이연매출, 기기 BEP 진행률, VAN 누적 | `revenue_streams.collected + outstanding` |

---

## 8. 마이그레이션 순서 (적용 권장 순서)

1. `20260526060000_transactions_v2.sql` — 본 마이그레이션 (8개 신규 테이블)
2. 어드민 정책 CRUD UI (`/admin/settings/policies`)
3. 어드민 거래 CRUD UI (`/admin/transactions`)
4. 정산서 업로드 + 매칭 UI (`/admin/settlements`)
5. 통장 업로드 + 매칭 UI (`/admin/bank`)
6. 대시보드 3종 (`/admin/dashboard/*`)

---

## 9. 향후 보완 항목 (v0.1 → v1.0)

대웅 멘트: "일단 이대로 만들고 실무에서 사용하면서 수정·보완"

실무 사용 중 발견 가능성 높은 보완 포인트:
- 환수 자동 차감 (`policy_clawback_rules` 발동 시 stream 음수 이벤트 추가)
- 영업자별 인센 정산 사이클 (월 단위 자동 묶음)
- 분할매출 인식 정책 — 현재는 (A) 입금 기준만. 추후 (C) 발생주의 옵션 추가 가능
- 결합 인센 자동 산출 (정책에 결합 룰 명시)
- 기기 모델별 BEP 알림 (예: "토스단말기 6개월 지났는데 회수율 30% 미만")

---

## 10. 결정 근거 — 왜 이 구조인가

- **시트 폐기 가능**: 한 거래의 매 시점별 매출이 다 보존 → 매일/정산/월말 대시보드 모두 자동 생성
- **SaaS 확장 대비** ([[ozlab_saas_potential]] 메모리): 멀티테넌트·다른 업종도 같은 5종 stream으로 표현 가능
- **3개월 신입 친화** ([[ux-3]] 메모리): 정책 한번 등록 → 거래 입력 시 단가 자동, TM은 최소 입력
- **회계 정합성**: 발생주의·현금주의 둘 다 지원 가능한 구조 (`expected` vs `collected` 별도 보존)
