# Admin Dashboard Revenue Summary Handoff

Date: 2026-05-26

## Scope

`/admin` 대시보드의 `상태별 신청` 카드 위에 역할별 매출 요약 UI와 기간 필터, 상담사별/상품별 선그래프를 추가했습니다.
CTA별 성과 표는 대시보드에서 제거했습니다.

## Changed File

- `app/admin/(shell)/page.tsx`

## UI Behavior

`RoleRevenueOverview` 컴포넌트가 로그인한 어드민 role에 따라 다른 카드 구성을 보여줍니다.

### 조직 지표 노출 role

- `super_admin`
- `marketing`
- `tm_lead`
- `admin`
- `marketer`

노출 항목:

- 전체 매출액: `revenue_records.amount` 기간 합계
- 광고비 소진액: `ad_metrics.spend` 기간 합계
- 미수금: 아직 데이터 연결 대기
- 미수금 내역

### 상담사 지표 노출 role

- `counselor`

노출 항목:

- 내 매출액: 로그인 상담사의 `consultations.counselor_id` 기준 기간 매출 합계
- 내 인센티브 포인트: 아직 데이터 연결 대기
- 내 미수금: 아직 데이터 연결 대기
- 내 미수금 내역

그 외 role은 현재 요약 UI가 노출되지 않습니다.

## Period / Graph Behavior

- 대시보드 상단에 시작일, 종료일, 정렬, 이전기간 비교 필터를 추가했습니다.
- 기간을 지정하지 않으면 KST 오늘 날짜로 조회합니다.
- 시작일이 종료일보다 뒤면 내부에서 자동 정렬해 조회합니다.
- `compare=1`이면 같은 길이의 직전 기간과 매출/광고비를 비교합니다.
- 상담사별 실적 그래프는 `revenue_records` → `consultations.counselor_id` → `admin_users.display_name` 순서로 묶습니다.
- 상품별 실적 그래프는 `revenue_records.product_label` 기준으로 묶습니다.
- 정렬은 `revenue`, `count`, `name`을 지원하며 각 그래프 상위 5개 라인만 표시합니다.

## Data Integration TODO

현재 미수금과 인센티브 포인트는 `연동 대기` 문구와 빈 미수금 상태로 렌더링됩니다.
클로드 작업 시 아래 중 하나로 연결하면 됩니다.

### 권장 데이터 형태

```ts
type AdminRevenueSummary = {
  unpaidAmount?: number
  myIncentivePointAmount?: number
  myUnpaidAmount?: number
  unpaidItems: Array<{
    id: string
    customerName: string
    counselorName?: string | null
    statusLabel: string
    amount: number
    dueDate?: string | null
  }>
}
```

### Suggested Sources

- 전체 매출액: 현재 `revenue_records.amount` 기간 합계로 연결됨
- 광고비 소진액: 현재 `ad_metrics.spend` 기간 합계로 연결됨
- 미수금: 매출/거래 테이블에서 미입금 또는 부분입금 상태의 잔액
- 상담사별 매출: 현재 `consultations.counselor_id` 기준으로 연결됨
- 상품별 매출: 현재 `revenue_records.product_label` 기준으로 연결됨
- 인센티브 포인트: 별도 정책 테이블 또는 매출 레코드 기반 계산 view

## Notes

- 이번 작업에서 `revenue_records`, `consultations`, `admin_users`, `ad_metrics` 조회를 추가했습니다.
- 미수금/인센티브 실제 데이터 연결 시 서버 컴포넌트인 `AdminDashboardPage`에서 병렬 쿼리에 summary query를 추가하고, `RoleRevenueOverview`에 값을 props로 넘기는 방식이 가장 단순합니다.
- 상담사 개인 지표는 반드시 현재 로그인 profile의 `user_id` 기준으로 필터링해야 합니다.
