-- =============================================================
-- Migration: 20260526070000_products_device_type_cost_tiers
-- products 테이블에 단말기 종류 + 수량별 원가 7단계 컬럼 추가
-- (NIT 단말기 출고정책 통합)
-- =============================================================
-- 신규 컬럼 :
--   - device_type  : 단말기 종류 (범용/특수). 단말기가 아니면 NULL
--   - cost_5plus   : 원가 (5대 이상)
--   - cost_10plus  : 원가 (10대 이상)
--   - cost_20plus  : 원가 (20대 이상)
--   - cost_30plus  : 원가 (30대 이상)
--   - cost_50plus  : 원가 (50대 이상)
--   - cost_100plus : 원가 (100대 이상)
--
-- 의미 변경 :
--   - device_cost 컬럼 의미를 "기기 매입가" → "원가 (1대 기준)" 으로 재정의
--   - 수량 늘어나면 NIT 등 공급사가 단가 깎아줌. 그 단가표를 7단계로 보존.
--   - 우리는 원가 + α 마진으로 고객에게 판매.
--
-- 호환 :
--   - 단말기 외 상품(인터넷·CCTV 등)은 device_type + cost_*plus 다 NULL.
-- =============================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS device_type   text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_5plus    numeric(12,0);
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_10plus   numeric(12,0);
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_20plus   numeric(12,0);
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_30plus   numeric(12,0);
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_50plus   numeric(12,0);
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_100plus  numeric(12,0);

CREATE INDEX IF NOT EXISTS idx_products_device_type ON products(device_type) WHERE device_type IS NOT NULL;

COMMENT ON COLUMN products.device_type IS '단말기 종류 (범용/특수). 단말기 아니면 NULL';
COMMENT ON COLUMN products.device_cost IS '원가 (1대 기준, 원). 공급사 매입 단가';
COMMENT ON COLUMN products.cost_5plus IS '원가 (5대 이상 매입 시 단가)';
COMMENT ON COLUMN products.cost_10plus IS '원가 (10대 이상)';
COMMENT ON COLUMN products.cost_20plus IS '원가 (20대 이상)';
COMMENT ON COLUMN products.cost_30plus IS '원가 (30대 이상)';
COMMENT ON COLUMN products.cost_50plus IS '원가 (50대 이상)';
COMMENT ON COLUMN products.cost_100plus IS '원가 (100대 이상)';

-- END --
