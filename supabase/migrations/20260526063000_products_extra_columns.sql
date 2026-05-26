-- =============================================================
-- Migration: 20260526063000_products_extra_columns
-- products 테이블에 4컬럼 추가 (실무 운영 + 엑셀 일괄 등록용)
-- =============================================================
-- 추가 컬럼 :
--   - vendor              : 본사/공급사 (KT/LG/SKB/스카이/에스원/페이히어/토스 등)
--   - default_commission  : 우리편이 받는 기본 수당 (정책 등록 전 임시 기본값)
--   - customer_price      : 고객 가격 (월요금 또는 일시불)
--   - device_cost         : 기기 매입가 (없으면 NULL, 있으면 VAN/할부 거래의 BEP 기준)
--
-- 호환 :
--   - 기존 default_amount 컬럼은 그대로 유지 (BC)
--   - default_amount 는 "기본 매출액" 으로 의미가 모호했음 → 신규 컬럼들로 의미 명확화
--   - 추후 default_amount 는 점진적으로 customer_price 로 마이그레이션
-- =============================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS vendor              text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS default_commission  numeric(12,0);
ALTER TABLE products ADD COLUMN IF NOT EXISTS customer_price      numeric(12,0);
ALTER TABLE products ADD COLUMN IF NOT EXISTS device_cost         numeric(12,0);

CREATE INDEX IF NOT EXISTS idx_products_vendor ON products(vendor);

COMMENT ON COLUMN products.vendor IS '본사/공급사 (KT, LG, SKB, 스카이, 에스원, 페이히어, 토스 등) — 정책 lookup·정산서 매칭 키';
COMMENT ON COLUMN products.default_commission IS '우리편이 받는 기본 수당 (원) — 정책(policies) 등록 전 임시 기준값. 정책 단가가 우선';
COMMENT ON COLUMN products.customer_price IS '고객 가격 (원) — 월요금 또는 일시불';
COMMENT ON COLUMN products.device_cost IS '기기 매입가 (원) — 우리편이 즉시 지출하는 원가. 단말기/키오스크 등 기기 거래만 NOT NULL';

-- END --
