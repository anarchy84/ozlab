-- =============================================================
-- Migration: 20260526060000_transactions_v2
-- Phase 0-3: 거래(Transaction) 중심 데이터 모델 v2
-- =============================================================
-- 관련 ADR: docs/ADR_014_TRANSACTIONS_DATA_MODEL.md
--
-- 신규 테이블 8종:
--   1) customers                — 고객 마스터 (CUS-YYYY-NNNN 자동 발급)
--   2) policies                 — 정책 헤더 (통신사/CCTV/키오스크/카톡프로모션)
--   3) policy_pricing           — 정책 단가 라인 (본수수료/추가인센/사은품 등)
--   4) policy_clawback_rules    — 환수룰 (사용일수별 환수율)
--   5) transactions             — 거래 1건 (한 번의 영업 성공)
--   6) revenue_streams          — 거래 1:N 매출 흐름 (5종)
--   7) revenue_events           — stream 1:N 실제 발생 매출 이벤트
--   8) installment_schedules    — 할부 스케줄 (60개월 등)
--   9) settlements_raw          — 본사 정산서 원본 (양식 그대로)
--   10) settlement_lines        — 정산서 파싱 결과
--   11) bank_records_raw        — 통장 거래내역 원본
--
-- 호환:
--   - 기존 revenue_records 보존 (점진 마이그레이션)
--   - v_revenue_legacy view로 신구 데이터 통합 조회 가능
-- =============================================================

-- ─────────────────────────────────────────────
-- 0) 사전 — set_updated_at 함수 존재 가정 (기존 마이그레이션에 정의됨)
-- ─────────────────────────────────────────────

-- ─────────────────────────────────────────────
-- 1) customers — 고객 마스터
-- ─────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS customer_seq START WITH 1;

CREATE OR REPLACE FUNCTION generate_customer_code() RETURNS text AS $$
DECLARE
  next_n int;
BEGIN
  next_n := nextval('customer_seq');
  RETURN 'CUS-' || to_char(now(), 'YYYY') || '-' || lpad(next_n::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS customers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text UNIQUE NOT NULL DEFAULT generate_customer_code(), -- CUS-2026-0001
  name            text NOT NULL,
  phone           text,
  store_name      text,
  region          text,                                        -- 시·도
  business_no     text,                                        -- 사업자등록번호 (선택)
  note            text,
  -- 가장 최근 거래 시 자동 업데이트되는 메타 (분석 용도)
  first_acquired_at timestamptz,
  last_acquired_at  timestamptz,
  total_transactions int NOT NULL DEFAULT 0,
  total_lifetime_value numeric(14,0) NOT NULL DEFAULT 0,       -- 누적 매출 (collected)
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid REFERENCES admin_users(user_id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_customers_name_phone ON customers(name, phone);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_business_no ON customers(business_no);

DROP TRIGGER IF EXISTS trg_customers_updated_at ON customers;
CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE customers IS '고객 마스터 — 한 사람이 인터넷·CCTV·키오스크 여러 거래 가져도 customer_id 1개로 묶임';
COMMENT ON COLUMN customers.code IS 'CUS-YYYY-NNNN (예: CUS-2026-0001) 자동 발급';

-- ─────────────────────────────────────────────
-- 2) policies — 정책 헤더
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS policies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text UNIQUE NOT NULL,                        -- 예: 2026-05-KT-S1
  category        text NOT NULL,                               -- 통신사/CCTV/키오스크/테이블오더/기타프로모션
  vendor          text NOT NULL,                               -- KT/LG/SKB/스카이/에스원/페이히어 등
  effective_from  date NOT NULL,
  effective_to    date,
  name            text NOT NULL,
  source_format   text NOT NULL CHECK (source_format IN ('xlsx','xls','xlsb','katalk','email','verbal')),
  source_url      text,                                        -- 원본 파일 위치
  note            text,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid REFERENCES admin_users(user_id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_policies_category_vendor ON policies(category, vendor);
CREATE INDEX IF NOT EXISTS idx_policies_effective ON policies(effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_policies_active ON policies(is_active);

DROP TRIGGER IF EXISTS trg_policies_updated_at ON policies;
CREATE TRIGGER trg_policies_updated_at
  BEFORE UPDATE ON policies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE policies IS '정책 헤더 — 통신사 정책서 + CCTV/키오스크/테오 + 카톡 구두 프로모션 통합';

-- ─────────────────────────────────────────────
-- 3) policy_pricing — 정책 단가 라인
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS policy_pricing (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id       uuid NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  line_type       text NOT NULL CHECK (line_type IN
                    ('base_fee','additional_incentive','bundle_incentive',
                     'voucher','cash_gift','deduction','clawback','promotion')),
  product_group   text,                                        -- 인터넷단독/번들/TPS/TV/CCTV 2회선 등
  speed_spec      text,                                        -- 1G/500M/100M/4채널 등
  tv_option       text,                                        -- OTV 베이직/라이트/에센스
  region          text,                                        -- 전국/수도권/중부권/서부권/동부권
  contract_period text,                                        -- 3년/2년/무약정
  amount          numeric(12,0) NOT NULL,                      -- 차감·환수는 음수
  vat_included    boolean NOT NULL DEFAULT true,
  condition_note  text,                                        -- "WIFI 미신청시 -10000" 등
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_policy_pricing_policy ON policy_pricing(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_pricing_lookup
  ON policy_pricing(policy_id, line_type, product_group, speed_spec);

ALTER TABLE policy_pricing ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE policy_pricing IS '정책 단가 라인 — 거래 등록 시 expected_amount 자동 계산 소스';

-- ─────────────────────────────────────────────
-- 4) policy_clawback_rules — 환수룰 (사용일수별)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS policy_clawback_rules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id       uuid NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  usage_days_min  int NOT NULL,
  usage_days_max  int NOT NULL,
  clawback_rate   numeric(4,3) NOT NULL CHECK (clawback_rate BETWEEN 0 AND 1),  -- 0.000 ~ 1.000
  note            text,
  CHECK (usage_days_max > usage_days_min)
);
CREATE INDEX IF NOT EXISTS idx_clawback_policy ON policy_clawback_rules(policy_id);

ALTER TABLE policy_clawback_rules ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE policy_clawback_rules IS '환수룰 — 9개월 내 해지시 100%, 91~150일 80% 등 사용일수별 환수율';

-- ─────────────────────────────────────────────
-- 5) transactions — 거래 1건
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id        uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  consultation_id    uuid REFERENCES consultations(id) ON DELETE SET NULL,  -- 리드 연결 (utm 추적)
  sales_person_id    uuid REFERENCES admin_users(user_id) ON DELETE SET NULL,

  -- 거래 타입·자연키
  service_category   text NOT NULL,                            -- 통신사/CCTV/키오스크/테오/기타
  vendor             text,                                     -- KT/LG/페이히어 등
  natural_key        text,                                     -- 가입번호 또는 시리얼번호 (정산서 매칭용)

  -- 거래 일자
  contract_date      date NOT NULL,                            -- 가입/접수 일자
  activation_date    date,                                     -- 개통/설치 완료일
  cancellation_date  date,                                     -- 해지일 (있는 경우)

  -- 약정·기기
  contract_months    int,                                      -- 약정 개월 (할부 거래만)

  -- 상태 라이프사이클
  -- pending      : 신규 등록 (TM 입력 직후)
  -- activated    : 개통 완료
  -- settled      : 정산서 매칭 완료 (settled_total 채워짐)
  -- collected    : 통장 입금 완료
  -- partial      : 일부 입금 (미수금 있음)
  -- cancelled    : 취소 (환수 발생 가능)
  status             text NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','activated','settled','collected','partial','cancelled')),

  -- 비고
  note               text,

  -- 메타
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  created_by         uuid REFERENCES admin_users(user_id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_transactions_customer ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_consultation ON transactions(consultation_id);
CREATE INDEX IF NOT EXISTS idx_transactions_sales_person ON transactions(sales_person_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_contract_date ON transactions(contract_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_natural_key ON transactions(vendor, natural_key);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(service_category);

DROP TRIGGER IF EXISTS trg_transactions_updated_at ON transactions;
CREATE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE transactions IS '거래 1건 — 한 번의 영업 성공. 한 거래에 매출 stream N개 (lump_sum + installment + variable + device_cost 동시 가능)';

-- ─────────────────────────────────────────────
-- 6) revenue_streams — 거래 1:N 매출 흐름
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS revenue_streams (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id      uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,

  -- 5종 stream 타입
  -- lump_sum         : 일시정산 (인터넷 정산, 본사 인센)
  -- installment      : 할부 매출 (키오스크 60개월)
  -- variable         : 변동 매출 (VAN 수수료 — 예측 불가)
  -- device_cost      : 선지급 기기원가 (음수)
  -- device_recovery  : 기기값 회수 매출 (60개월 회수)
  stream_type         text NOT NULL CHECK (stream_type IN
                        ('lump_sum','installment','variable','device_cost','device_recovery')),

  -- 참조 정보 (정책에서 자동 채움)
  policy_id           uuid REFERENCES policies(id) ON DELETE SET NULL,
  policy_pricing_id   uuid REFERENCES policy_pricing(id) ON DELETE SET NULL,
  product_id          uuid REFERENCES products(id) ON DELETE SET NULL,

  -- 표시 라벨 (snapshot — 정책 변경되어도 거래 시점 라벨 보존)
  label               text NOT NULL,                           -- "KT 인터넷 1G 본수수료" 등

  -- 3단계 매출 (셋 다 보존)
  expected_total      numeric(14,0),                           -- TM 입력 (variable는 NULL 가능)
  settled_total       numeric(14,0),                           -- 정산서 매칭 시
  collected_to_date   numeric(14,0) NOT NULL DEFAULT 0,        -- 통장 누적

  -- 할부·BEP 보조
  contract_total      numeric(14,0),                           -- 약정 총액 (installment·device_recovery)
  installment_count   int,                                     -- 회차 수 (60 등)
  bep_target_amount   numeric(14,0),                           -- BEP 목표 (device_cost 절대값과 짝)

  -- 메타
  status              text NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open','settled','collected','partial','cancelled')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_streams_transaction ON revenue_streams(transaction_id);
CREATE INDEX IF NOT EXISTS idx_streams_type ON revenue_streams(stream_type);
CREATE INDEX IF NOT EXISTS idx_streams_policy ON revenue_streams(policy_id);
CREATE INDEX IF NOT EXISTS idx_streams_status ON revenue_streams(status);

DROP TRIGGER IF EXISTS trg_streams_updated_at ON revenue_streams;
CREATE TRIGGER trg_streams_updated_at
  BEFORE UPDATE ON revenue_streams
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE revenue_streams ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE revenue_streams IS '매출 흐름 — 거래 1건의 매출이 stream 단위로 분리. 3단계 매출(expected/settled/collected) 동시 보존';

-- ─────────────────────────────────────────────
-- 7) revenue_events — 실제 발생 매출/입금 이벤트
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS revenue_events (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id           uuid NOT NULL REFERENCES revenue_streams(id) ON DELETE CASCADE,
  event_date          date NOT NULL,
  amount              numeric(14,0) NOT NULL,                  -- 입금은 +, 차감은 -
  event_type          text NOT NULL CHECK (event_type IN
                        ('settlement','bank_inflow','manual_adjustment','clawback','cancellation')),
  source_type         text CHECK (source_type IN
                        ('settlement_line','bank_record','manual',NULL)),
  source_ref_id       uuid,                                    -- settlement_lines.id or bank_records.id
  note                text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  created_by          uuid REFERENCES admin_users(user_id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_events_stream ON revenue_events(stream_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON revenue_events(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_events_source ON revenue_events(source_type, source_ref_id);

ALTER TABLE revenue_events ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE revenue_events IS '매출/입금 이벤트 — 정산서 매칭/통장 매칭/수동 조정마다 1행 추가';

-- ─────────────────────────────────────────────
-- 8) installment_schedules — 할부 스케줄
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS installment_schedules (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id           uuid NOT NULL REFERENCES revenue_streams(id) ON DELETE CASCADE,
  installment_no      int NOT NULL,                            -- 1~60
  due_date            date NOT NULL,
  due_amount          numeric(12,0) NOT NULL,
  collected_amount    numeric(12,0) NOT NULL DEFAULT 0,
  collected_at        timestamptz,
  matched_event_id    uuid REFERENCES revenue_events(id) ON DELETE SET NULL,
  status              text NOT NULL DEFAULT 'scheduled'
                        CHECK (status IN ('scheduled','collected','overdue','partial','cancelled')),
  UNIQUE (stream_id, installment_no)
);
CREATE INDEX IF NOT EXISTS idx_install_stream ON installment_schedules(stream_id);
CREATE INDEX IF NOT EXISTS idx_install_due ON installment_schedules(due_date);
CREATE INDEX IF NOT EXISTS idx_install_status ON installment_schedules(status);

ALTER TABLE installment_schedules ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE installment_schedules IS '할부 스케줄 — installment/device_recovery stream에서 60개월 등 회차별 예정·수령 추적';

-- ─────────────────────────────────────────────
-- 9) settlements_raw — 본사 정산서 원본 (양식 그대로 업로드)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settlements_raw (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor              text NOT NULL,                           -- KT/LG/SKB 등
  settlement_period   text NOT NULL,                           -- '2026-W21' 또는 '2026-05-W4'
  settlement_date     date NOT NULL,                           -- 정산서 헤더 일자
  source_filename     text NOT NULL,
  source_storage_url  text,                                    -- Supabase Storage URL
  total_supply        numeric(14,0),                           -- 정산서 상단 공급가
  total_vat           numeric(14,0),
  total_payment       numeric(14,0),                           -- 실지급액
  total_clawback      numeric(14,0),                           -- 환수 합계
  uploaded_at         timestamptz NOT NULL DEFAULT now(),
  uploaded_by         uuid REFERENCES admin_users(user_id) ON DELETE SET NULL,
  parse_status        text NOT NULL DEFAULT 'pending'
                        CHECK (parse_status IN ('pending','parsing','parsed','error')),
  parse_error         text,
  parsed_at           timestamptz
);
CREATE INDEX IF NOT EXISTS idx_settle_raw_vendor_period ON settlements_raw(vendor, settlement_period);
CREATE INDEX IF NOT EXISTS idx_settle_raw_date ON settlements_raw(settlement_date DESC);

ALTER TABLE settlements_raw ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE settlements_raw IS '본사 정산서 원본 — 양식 그대로 통째 저장 + 어드민이 자동 파싱';

-- ─────────────────────────────────────────────
-- 10) settlement_lines — 정산서 파싱 결과
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settlement_lines (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_raw_id        uuid NOT NULL REFERENCES settlements_raw(id) ON DELETE CASCADE,

  -- raw 파싱 데이터 (정산서 컬럼 그대로)
  receipt_date             date,                               -- 접수일자
  activation_date          date,                               -- 개통일
  cancellation_date        date,                               -- 해지일
  subscription_no          text,                               -- 가입번호
  customer_name_raw        text,                               -- 정산서 원본 고객명 (메모 포함)
  customer_name_clean      text,                               -- 메모 분리 후 이름만
  customer_name_memo       text,                               -- /CCTV /2채널 등
  vendor                   text,                               -- KT/LG
  product_category         text,                               -- CCTV/인터넷/TV/전화
  bundle_type              text,                               -- 인터넷+전화 등
  product_name             text,                               -- 에스원안심/OTV11 베이직
  contract_period          text,
  event_name               text,

  -- 금액 라인
  base_fee                 numeric(12,0),                      -- 수수료
  incentive                numeric(12,0),                      -- 인센티브
  voucher                  numeric(12,0),                      -- 본사상품권
  cash_gift                numeric(12,0),                      -- 현금사은품
  wifi_incentive           numeric(12,0),
  deduction                numeric(12,0),
  additional_incentive     numeric(12,0),
  actual_payment           numeric(12,0),                      -- 실지급액
  settlement_memo          text,

  -- 사은품 (정산서 3세트 반복 → JSONB로 압축)
  gifts                    jsonb,                              -- [{type, name, amount, given_at, given_by, status}]

  install_region           text,
  payment_method           text,

  -- 매칭 결과
  matched_transaction_id   uuid REFERENCES transactions(id) ON DELETE SET NULL,
  matched_stream_id        uuid REFERENCES revenue_streams(id) ON DELETE SET NULL,
  match_status             text NOT NULL DEFAULT 'unmatched'
                             CHECK (match_status IN ('unmatched','auto','manual','rejected')),
  match_confidence         numeric(3,2),                       -- 0.00 ~ 1.00
  matched_by               uuid REFERENCES admin_users(user_id) ON DELETE SET NULL,
  matched_at               timestamptz,

  created_at               timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_settle_lines_raw ON settlement_lines(settlement_raw_id);
CREATE INDEX IF NOT EXISTS idx_settle_lines_subscription ON settlement_lines(subscription_no);
CREATE INDEX IF NOT EXISTS idx_settle_lines_match ON settlement_lines(match_status);
CREATE INDEX IF NOT EXISTS idx_settle_lines_customer_name ON settlement_lines(customer_name_clean);

ALTER TABLE settlement_lines ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE settlement_lines IS '정산서 1줄 = 1행 — 자동 매칭 결과 + 미매칭 컨펌 워크플로우 지원';

-- ─────────────────────────────────────────────
-- 11) bank_records_raw — 통장 거래내역
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bank_records_raw (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_code                text NOT NULL DEFAULT 'IBK',        -- IBK/SHB/WRI/KB 등
  occurred_at              timestamptz NOT NULL,               -- 거래일시
  description              text NOT NULL,                      -- 적요/입금자명
  inflow_amount            numeric(14,0) NOT NULL DEFAULT 0,
  outflow_amount           numeric(14,0) NOT NULL DEFAULT 0,
  balance                  numeric(14,0),
  source_filename          text,
  note                     text,

  -- 매칭 결과
  matched_stream_id        uuid REFERENCES revenue_streams(id) ON DELETE SET NULL,
  matched_event_id         uuid REFERENCES revenue_events(id) ON DELETE SET NULL,
  matched_installment_id   uuid REFERENCES installment_schedules(id) ON DELETE SET NULL,
  match_status             text NOT NULL DEFAULT 'unmatched'
                             CHECK (match_status IN ('unmatched','auto','manual','rejected','expense')),
  match_confidence         numeric(3,2),
  matched_by               uuid REFERENCES admin_users(user_id) ON DELETE SET NULL,
  matched_at               timestamptz,

  uploaded_at              timestamptz NOT NULL DEFAULT now(),
  uploaded_by              uuid REFERENCES admin_users(user_id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_bank_raw_date ON bank_records_raw(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_bank_raw_match ON bank_records_raw(match_status);
CREATE INDEX IF NOT EXISTS idx_bank_raw_amount ON bank_records_raw(inflow_amount, outflow_amount);

ALTER TABLE bank_records_raw ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE bank_records_raw IS '통장 거래내역 — IBK 메인. 적요+금액+시점으로 stream 자동 매칭';

-- ─────────────────────────────────────────────
-- 12) RLS 정책 (5 role 기준)
-- ─────────────────────────────────────────────

-- helpers (이미 admin_role()/is_admin_role() 헬퍼 존재 가정 — 기존 마이그레이션)

-- customers
DROP POLICY IF EXISTS customers_select ON customers;
CREATE POLICY customers_select ON customers FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS customers_insert ON customers;
CREATE POLICY customers_insert ON customers FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS customers_update ON customers;
CREATE POLICY customers_update ON customers FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS customers_delete ON customers;
CREATE POLICY customers_delete ON customers FOR DELETE TO authenticated
  USING (admin_role() IN ('super_admin','admin'));

-- policies (RW: super_admin/admin/marketing, R: all)
DROP POLICY IF EXISTS policies_select ON policies;
CREATE POLICY policies_select ON policies FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS policies_modify ON policies;
CREATE POLICY policies_modify ON policies FOR ALL TO authenticated
  USING (admin_role() IN ('super_admin','admin','marketing'))
  WITH CHECK (admin_role() IN ('super_admin','admin','marketing'));

DROP POLICY IF EXISTS pricing_select ON policy_pricing;
CREATE POLICY pricing_select ON policy_pricing FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS pricing_modify ON policy_pricing;
CREATE POLICY pricing_modify ON policy_pricing FOR ALL TO authenticated
  USING (admin_role() IN ('super_admin','admin','marketing'))
  WITH CHECK (admin_role() IN ('super_admin','admin','marketing'));

DROP POLICY IF EXISTS clawback_select ON policy_clawback_rules;
CREATE POLICY clawback_select ON policy_clawback_rules FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS clawback_modify ON policy_clawback_rules;
CREATE POLICY clawback_modify ON policy_clawback_rules FOR ALL TO authenticated
  USING (admin_role() IN ('super_admin','admin','marketing'))
  WITH CHECK (admin_role() IN ('super_admin','admin','marketing'));

-- transactions (모든 어드민 SELECT, 영업자는 본인 거 RW)
DROP POLICY IF EXISTS transactions_select ON transactions;
CREATE POLICY transactions_select ON transactions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS transactions_insert ON transactions;
CREATE POLICY transactions_insert ON transactions FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS transactions_update ON transactions;
CREATE POLICY transactions_update ON transactions FOR UPDATE TO authenticated
  USING (
    admin_role() IN ('super_admin','admin','marketing')
    OR sales_person_id = auth.uid()
  );
DROP POLICY IF EXISTS transactions_delete ON transactions;
CREATE POLICY transactions_delete ON transactions FOR DELETE TO authenticated
  USING (admin_role() IN ('super_admin','admin'));

-- revenue_streams (transactions 권한 따라감)
DROP POLICY IF EXISTS streams_select ON revenue_streams;
CREATE POLICY streams_select ON revenue_streams FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS streams_modify ON revenue_streams;
CREATE POLICY streams_modify ON revenue_streams FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- revenue_events (insert만 영업자/TM, update/delete는 admin)
DROP POLICY IF EXISTS events_select ON revenue_events;
CREATE POLICY events_select ON revenue_events FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS events_insert ON revenue_events;
CREATE POLICY events_insert ON revenue_events FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS events_modify ON revenue_events;
CREATE POLICY events_modify ON revenue_events FOR UPDATE TO authenticated
  USING (admin_role() IN ('super_admin','admin'));
DROP POLICY IF EXISTS events_delete ON revenue_events;
CREATE POLICY events_delete ON revenue_events FOR DELETE TO authenticated
  USING (admin_role() IN ('super_admin','admin'));

-- installment_schedules
DROP POLICY IF EXISTS install_select ON installment_schedules;
CREATE POLICY install_select ON installment_schedules FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS install_modify ON installment_schedules;
CREATE POLICY install_modify ON installment_schedules FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- settlements_raw + lines (super_admin/admin/marketing)
DROP POLICY IF EXISTS settle_raw_all ON settlements_raw;
CREATE POLICY settle_raw_all ON settlements_raw FOR ALL TO authenticated
  USING (admin_role() IN ('super_admin','admin','marketing'))
  WITH CHECK (admin_role() IN ('super_admin','admin','marketing'));

DROP POLICY IF EXISTS settle_lines_all ON settlement_lines;
CREATE POLICY settle_lines_all ON settlement_lines FOR ALL TO authenticated
  USING (admin_role() IN ('super_admin','admin','marketing'))
  WITH CHECK (admin_role() IN ('super_admin','admin','marketing'));

-- bank_records_raw (super_admin/admin 만)
DROP POLICY IF EXISTS bank_raw_all ON bank_records_raw;
CREATE POLICY bank_raw_all ON bank_records_raw FOR ALL TO authenticated
  USING (admin_role() IN ('super_admin','admin'))
  WITH CHECK (admin_role() IN ('super_admin','admin'));

-- ─────────────────────────────────────────────
-- 13) 분석 view v2 (신규 모델 기반)
-- ─────────────────────────────────────────────

-- 거래 요약 (예상/정산/실수령 3단계 동시)
DROP VIEW IF EXISTS v_transaction_summary CASCADE;
CREATE VIEW v_transaction_summary
WITH (security_invoker=on) AS
SELECT
  t.id AS transaction_id,
  t.customer_id,
  c.code AS customer_code,
  c.name AS customer_name,
  t.service_category,
  t.vendor,
  t.contract_date,
  t.activation_date,
  t.status,
  t.sales_person_id,
  COUNT(s.id) AS stream_count,
  SUM(s.expected_total)                                        AS total_expected,
  SUM(s.settled_total)                                         AS total_settled,
  SUM(s.collected_to_date)                                     AS total_collected,
  -- 미수금 = settled - collected (정산은 됐지만 입금 안 됨)
  GREATEST(COALESCE(SUM(s.settled_total),0) - SUM(s.collected_to_date), 0) AS outstanding,
  -- 이연매출 = contract_total - collected (할부 잔여)
  GREATEST(COALESCE(SUM(s.contract_total),0) - SUM(s.collected_to_date), 0) AS deferred_revenue,
  -- 기기값 BEP 차액 (device_cost vs device_recovery+VAN 누적)
  SUM(CASE WHEN s.stream_type = 'device_cost' THEN s.collected_to_date ELSE 0 END) AS device_cost_total,
  SUM(CASE WHEN s.stream_type IN ('device_recovery','variable') THEN s.collected_to_date ELSE 0 END) AS device_recovery_total
FROM transactions t
LEFT JOIN customers c ON c.id = t.customer_id
LEFT JOIN revenue_streams s ON s.transaction_id = t.id
GROUP BY t.id, c.code, c.name;

-- 일별 매출 (매일 대시보드용 — expected 기준)
DROP VIEW IF EXISTS v_daily_revenue_expected CASCADE;
CREATE VIEW v_daily_revenue_expected
WITH (security_invoker=on) AS
SELECT
  t.contract_date AS date,
  t.service_category,
  cons.inferred_channel AS channel,
  COUNT(DISTINCT t.id) AS transaction_count,
  SUM(s.expected_total) AS expected_revenue,
  COUNT(DISTINCT t.sales_person_id) AS active_sales_count
FROM transactions t
LEFT JOIN consultations cons ON cons.id = t.consultation_id
LEFT JOIN revenue_streams s ON s.transaction_id = t.id
WHERE t.status != 'cancelled'
GROUP BY 1, 2, 3
ORDER BY 1 DESC;

-- 정산後 차이 분석 (정산팀 화면용)
DROP VIEW IF EXISTS v_settlement_variance CASCADE;
CREATE VIEW v_settlement_variance
WITH (security_invoker=on) AS
SELECT
  sr.settlement_period,
  sr.vendor,
  COUNT(sl.id)                                                 AS line_count,
  COUNT(sl.id) FILTER (WHERE sl.match_status = 'auto')         AS auto_matched,
  COUNT(sl.id) FILTER (WHERE sl.match_status = 'manual')       AS manual_matched,
  COUNT(sl.id) FILTER (WHERE sl.match_status = 'unmatched')    AS unmatched,
  SUM(sl.actual_payment)                                       AS settled_total,
  SUM(s.expected_total) FILTER (WHERE sl.matched_stream_id IS NOT NULL) AS expected_total_matched,
  SUM(sl.actual_payment) - SUM(s.expected_total) FILTER (WHERE sl.matched_stream_id IS NOT NULL) AS variance
FROM settlements_raw sr
LEFT JOIN settlement_lines sl ON sl.settlement_raw_id = sr.id
LEFT JOIN revenue_streams s ON s.id = sl.matched_stream_id
GROUP BY sr.id, sr.settlement_period, sr.vendor
ORDER BY sr.settlement_date DESC;

-- 월별 현금흐름 (월말 대시보드용)
DROP VIEW IF EXISTS v_monthly_cashflow CASCADE;
CREATE VIEW v_monthly_cashflow
WITH (security_invoker=on) AS
WITH events AS (
  SELECT
    date_trunc('month', re.event_date)::date AS month,
    SUM(re.amount) FILTER (WHERE re.event_type = 'bank_inflow')                              AS bank_inflow,
    SUM(re.amount) FILTER (WHERE re.event_type = 'settlement')                               AS settled,
    SUM(re.amount) FILTER (WHERE re.event_type = 'manual_adjustment' AND re.amount < 0)      AS adjustments_neg,
    SUM(re.amount) FILTER (WHERE re.event_type = 'clawback')                                 AS clawback
  FROM revenue_events re
  GROUP BY 1
)
SELECT
  month,
  COALESCE(bank_inflow, 0) AS bank_inflow,
  COALESCE(settled, 0) AS settled,
  COALESCE(adjustments_neg, 0) AS adjustments,
  COALESCE(clawback, 0) AS clawback,
  COALESCE(settled, 0) - COALESCE(bank_inflow, 0) AS outstanding_this_month
FROM events
ORDER BY month DESC;

-- ─────────────────────────────────────────────
-- 14) 호환 view — 기존 revenue_records와 통합
-- ─────────────────────────────────────────────
DROP VIEW IF EXISTS v_revenue_legacy CASCADE;
CREATE VIEW v_revenue_legacy
WITH (security_invoker=on) AS
-- 기존 revenue_records 데이터
SELECT
  rr.id,
  rr.consultation_id,
  rr.product_id,
  rr.product_label AS label,
  rr.amount AS expected_total,
  rr.amount AS settled_total,           -- 기존 데이터는 단일 매출 가정
  rr.amount AS collected_to_date,
  rr.revenue_date AS event_date,
  'legacy_revenue_records'::text AS source
FROM revenue_records rr
UNION ALL
-- 신규 transactions/streams
SELECT
  s.id,
  t.consultation_id,
  s.product_id,
  s.label,
  s.expected_total,
  s.settled_total,
  s.collected_to_date,
  t.contract_date AS event_date,
  'v2_transactions'::text AS source
FROM revenue_streams s
JOIN transactions t ON t.id = s.transaction_id;

-- ─────────────────────────────────────────────
-- 15) 트리거 — customer 누적 메타 자동 갱신
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_customer_meta_on_transaction() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE customers
       SET total_transactions = total_transactions + 1,
           first_acquired_at = COALESCE(first_acquired_at, NEW.created_at),
           last_acquired_at = NEW.created_at
     WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_transaction_customer_meta ON transactions;
CREATE TRIGGER trg_transaction_customer_meta
  AFTER INSERT ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_customer_meta_on_transaction();

-- collected_to_date 자동 누적 (revenue_events INSERT 시)
CREATE OR REPLACE FUNCTION update_stream_collected_on_event() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.event_type IN ('bank_inflow','settlement') THEN
    UPDATE revenue_streams
       SET collected_to_date = collected_to_date + NEW.amount
     WHERE id = NEW.stream_id;

    -- customer LTV 누적
    UPDATE customers c
       SET total_lifetime_value = total_lifetime_value + GREATEST(NEW.amount, 0)
      FROM transactions t, revenue_streams s
     WHERE s.id = NEW.stream_id
       AND t.id = s.transaction_id
       AND c.id = t.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_event_update_stream ON revenue_events;
CREATE TRIGGER trg_event_update_stream
  AFTER INSERT ON revenue_events
  FOR EACH ROW EXECUTE FUNCTION update_stream_collected_on_event();

-- ─────────────────────────────────────────────
-- 16) 시드 — 5종 product_category 정책 카테고리 보강
--    (product_categories는 기존, policies.category 와는 별개)
-- ─────────────────────────────────────────────
-- (정책 카테고리는 enum 아닌 free text. 시드 불필요)

-- ─────────────────────────────────────────────
-- 17) 코멘트 마무리
-- ─────────────────────────────────────────────
COMMENT ON VIEW v_transaction_summary IS '거래 요약 — 3단계 매출 + 미수금 + 이연매출 + BEP 한눈에';
COMMENT ON VIEW v_daily_revenue_expected IS '일별 expected 매출 by 매체 — 매일 대시보드용';
COMMENT ON VIEW v_settlement_variance IS '정산서 차이 분석 — 정산팀 화면용';
COMMENT ON VIEW v_monthly_cashflow IS '월별 현금흐름 — 월말 대시보드용';
COMMENT ON VIEW v_revenue_legacy IS '기존 revenue_records + 신규 streams 통합 호환 view';

-- END --
