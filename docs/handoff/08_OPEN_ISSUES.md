# 08. 알려진 이슈 + 데이터 품질 + 운영 함정

## 1. 데이터 품질 이슈 (시트 분석에서 발견, 2026-05-27)

### 1.1 우리편 시트 8가지 이슈

| # | 이슈 | 영향 | 권장 액션 |
|---|---|---|---|
| 1 | 인센티브_일별집계 시트 비어있음 | 대시보드의 인센티브 컬럼 항상 0 | DB 이관 시 view 로 자동 계산 |
| 2 | 인터넷가입 ROAS 1,492% (전환율 209%) | 매입DB 매출이 페이드 광고에 묻어옴 | utm 어트리뷰션 분리 |
| 3 | 손익_요약 매출 442건 vs TM 개통 230건 (4월) | 상품 라인아이템 vs 트랜잭션 단위 혼재 | ADR_014 로 분리 (진행 중) |
| 4 | 5월 토스 스프레드 개통 0건 (매입 268건) | 입력 누락 or lag 효과 | 직접 확인 필요 |
| 5 | 5월 페이드 광고비 0.29M (4월 22.96M) | 의도된 일시중지인지 확인 | 의사결정 기록 필요 |
| 6 | 임승현 5월 인센티브 데이터 미입력 | 5월 인센 계산 불완전 | 직원에게 입력 요청 |
| 7 | TM 지출 세부 컬럼 구조 비정형 (항목1~5 페어) | 정규화 어려움 | expenses 테이블로 row 단위 분해 |
| 8 | 캠페인 명명 규칙 통일성 부족 (메타 일부) | _서비스분류 자동화 어려움 | UTM_NAMING_GUIDE.md 적용 강제 |

> 분석 상세: `docs/wooripen_sheet_analysis.md`.

### 1.2 우리편 4-5월 실 손익 (참고)

| 지표 | 4월 | 5월(~26일) |
|---|---:|---:|
| 매출 | 83.5M | 47.96M |
| 광고비 (페이드+DB매입) | 38.5M | 8.4M |
| 인건비 | 23.48M | 27.29M |
| 인터넷사은품 | **33.29M** | 16.81M |
| **순손익** | **-13.7M** | **-6.6M** |

→ 인터넷사은품(고객 유치 비용)이 광고비보다 큰 비중. 페이드 효율 자체는 양호하나 고정비가 매출을 압도.

## 2. 광고 분석 이슈 (paid-media 페이지)

### 2.1 우리편 데이터의 CRM 리드 0

| 매체 | 광고비 | 광고 리드 | CRM 리드 |
|---|---:|---:|---:|
| 당근 광고 | 14.05M | 269 | **0** |
| 메타 광고 | 7.45M | 254 | **0** |
| 구글 광고 | 2.29M | 26 | **0** |
| 네이버 검색 | 0.90M | 11 | **0** |

→ ozlab consultations 에는 우리편 시점 utm 행이 거의 없음 (site=cta 1건, none 1건). 광고측 vs CRM측 분리 컬럼으로 시각적으로 해소했지만, **CRM 리드 컬럼은 우리편 데이터 한 0으로 표시되는 게 정상**.

> 오즈랩 본격 운영 시작 후 CRM 리드도 채워질 예정.

### 2.2 sheet_channel_alias 매핑 누락 가능성

ad-sync 시 시트에서 새로운 매체값이 들어오면 `unmappedSet` 에 모이지만, **어드민 편집 페이지가 아직 없음**. SQL 직접 추가해야:

```sql
INSERT INTO sheet_channel_alias (sheet_value, channel_code, notes)
VALUES ('새 매체 한글명', '대응-channel-code', '메모')
ON CONFLICT (lower(sheet_value)) DO NOTHING;
```

→ Phase G/H 에서 어드민 페이지 추가 권장. `09_NEXT_STEPS.md` 참조.

### 2.3 channel_mapping 도 동일

utm_source+utm_medium → channel_code 매핑. 마찬가지로 어드민 편집 페이지 없음. 미매핑 utm 은 paid-media 페이지 하단 "⚠️ 매핑 안 된 UTM 조합" 박스에 표시됨.

## 3. 인프라 / 운영 이슈

### 3.1 Cursor + cowork git lock 충돌

Cursor 가 백그라운드 git maintenance 프로세스를 돌려서 `.git/HEAD.lock`, `.git/index.lock`, `.git/objects/maintenance.lock` 를 잡고 있음. cowork sandbox 는 권한 없어 해제 못 함.

**증상**:
```
fatal: Unable to create '/.../HEAD.lock': File exists.
```

**해결**:
```bash
rm -f .git/HEAD.lock .git/index.lock .git/objects/maintenance.lock
```

→ 자동화하려면 pre-commit hook 또는 Husky 추가 검토.

### 3.2 Supabase 프로젝트명 혼동

- 실제 사용: `woori-nconnect` (`vbdoyambycopigfajcgk`)
- 같은 org 에 있는 다른 프로젝트: `wooripen` (`llnzuczikgvbxxujztao`) — **다른 거**

`wooripen` 에는 `consultations` 만 있고 ad_metrics 없음. **새 마이그레이션 / SQL 실행 시 project_id 절대 헷갈리지 말 것**.

### 3.3 service_role 키 노출 위험

`SUPABASE_SERVICE_ROLE_KEY` 는 RLS 우회 가능. 절대 클라이언트 코드에 노출 금지:
- ❌ `NEXT_PUBLIC_` 접두어 붙이지 말 것
- ❌ Client Component 에서 사용 금지
- ✅ Server Route (`app/api/**/route.ts`) 에서만

### 3.4 Vercel 환경변수 동기화 누락 가능성

`.env.local` 에 추가한 변수를 Vercel 에 등록 안 하면 prod 에서 동작 안 함.

→ 새 변수 추가 시 Vercel 대시보드 → Project → Settings → Environment Variables 에도 추가 필수.

## 4. 시트 sync 운영 함정

### 4.1 시트 공유 권한 설정 안 함

증상: sync 시 "시트 공유 권한 미설정 가능성. ..." 에러.

원인: 구글 시트가 "제한됨" 으로 되어 있음.

해결: 시트 우상단 "공유" → "링크가 있는 모든 사용자" → "뷰어".

### 4.2 시트 탭 (gid) 자동 감지 없음

`sheet_csv_url` 에 `#gid=0` 또는 별도 gid 없으면 첫 번째 탭을 가져옴. 여러 탭이 있는 시트(우리편 통합데이터처럼)에서 다른 탭을 sync 하려면 URL 끝에 `#gid=숫자` 추가.

→ 시트의 해당 탭 클릭 후 브라우저 주소창 URL 끝 `gid=` 번호 복사.

### 4.3 인증 컬럼 자동 무시

`여신협회인증여부`, `인증일`, `인증만료일`, `NO` 4개 컬럼은 product-sync 시 **삭제 후 bulk 로 전달**. NIT 양식을 그대로 가져다 써도 됨.

→ 다른 무시할 컬럼 추가하려면 `app/api/admin/products/sync/route.ts` 의 `cleanRows` 부분 수정.

### 4.4 인터넷 정책서는 표준 양식 아님

해피 SKT 정책서 같은 양식은 **행 헤더 × 컬럼 시점별 가격 매트릭스** 라서 표준 양식에 맞지 않음. 담당자가 수동 변환 필요.

→ 변환 가이드: `docs/PRODUCT_SYNC_GUIDE.md` § 인터넷 정책서 변환 가이드.

→ 향후 인터넷 전용 시트 양식 또는 자동 파싱 신설 검토 (`09_NEXT_STEPS.md`).

## 5. 어드민 UX 부족한 부분

| 페이지 | 부족한 점 | 우선순위 |
|---|---|---|
| 모든 페이지 | 빠른 검색 (Cmd+K) 없음 | 중 |
| 모든 페이지 | 라이트 모드 없음 (다크 only) | 낮 |
| `paid-media` | 모바일에서 14컬럼 표 어려움 | 중 |
| `consultations` | 키보드 단축키 (j/k 행 이동) 없음 | 낮 |
| `product-sync` | 시트 미리보기 (sync 전 데이터 표시) 없음 | 낮 |
| `ad-sync` | sync 진행률 표시 없음 | 낮 |
| `users` | 초대 후 사용자 첫 로그인 UX 안내 부족 | 낮 |
| 전체 | audit log 없음 (누가 언제 무엇을 변경했는지) | 중 |

## 6. 데이터 모델 불일치

### 6.1 products 의 가격 컬럼 4종 혼재

- `default_amount` (옛, 사용 빈도 낮음)
- `device_cost` (원가 1대)
- `cost_5plus ~ cost_100plus` (정찰제 7단가)
- `customer_price` (판매가)
- `default_commission` (우리 수당)
- `default_monthly` (월 정기 결제)

→ 신규 sync 는 `device_cost` + `customer_price` + `default_commission` 만 활용. `default_amount` 는 (사용 안 함). 정찰제 7단가는 NIT 양식 호환용.

→ 향후 마이그레이션으로 `default_amount` 삭제 + 정찰제 별도 테이블 분리 검토.

### 6.2 consultations vs transactions v2 (ADR_014)

`20260526060000_transactions_v2.sql` 으로 거래 객체 신규 테이블들이 prod 적용됐지만, 어드민 페이지 사용 미시작:
- `customers`, `policies`, `policy_pricing`, `policy_clawback_rules`
- `transactions`, `revenue_streams`, `revenue_events`
- `installment_schedules`, `settlements_raw`, `settlement_lines`
- `bank_records_raw`

→ ADR_014 진행 중. 매출 자동화 흐름 완성 후 `revenue_records` 대체 예정.

## 7. 미구현 시스템

| 시스템 | 상태 | 우선순위 |
|---|---|---|
| 인센티브 (incentive_rates + entries + view) | 미시작 | **P1** |
| 지출 (expenses 테이블) | 미시작 | P2 |
| 손익 통합 페이지 | 미시작 | P2 |
| 매출 4차원 분해 페이지 | 미시작 | **P1** |
| Vercel Cron (시트 자동 sync) | 미시작 | P2 |
| product-sync 슬랙 알림 | 미연결 | P3 |
| audit log | 미시작 | 중 |
| 인터넷 정책서 자동 파싱 | 미시작 | P3 |

> 상세 → `09_NEXT_STEPS.md`.

## 8. 보안 / 컴플라이언스

| 항목 | 상태 |
|---|---|
| Sign-up 차단 | ✅ 완료 (admin_users 만 운영) |
| RLS 활성 | ✅ 대부분 테이블 |
| service_role key 환경변수만 | ✅ |
| HTTPS | ✅ (Vercel 자동) |
| 개인정보 수집 동의 | ✅ (사이트 폼) |
| GA4 / Meta 트래킹 동의 (GDPR) | 부분 (한국 시장이라 우선순위 낮음) |
| Audit log | ❌ 미구현 |
| 비밀번호 정책 | (Supabase 기본) |
| 2FA | ❌ 미설정 |

## 9. 성능 / 한계

| 항목 | 한계 / 비고 |
|---|---|
| bulk upload 행수 | MAX_ROWS = 1000 (한 번에) |
| paid-media 페이지 fetch | 4개 테이블 병렬 + JS 조인. 6개월 이상 데이터에서 느려질 수 있음 |
| 매체 wildcard | channel_mapping `(naver, '')` 와일드카드 없음 — 매체별로 명시 |
| CSV 파서 | RFC 4180 호환. 인코딩은 UTF-8 (BOM 자동 처리) |
| 시트 fetch 타임아웃 | 기본 (Node fetch) — 큰 시트는 timeout 가능 |

## 10. 다음 문서로

- 다음 단계 로드맵 → `09_NEXT_STEPS.md`
- 파일 맵 → `10_FILES_MAP.md`
