-- =============================================================
-- Phase 1A: 상품 카탈로그 + 매출 기록 + 코호트 view
-- (이미 prod 적용됨 — 재현용 파일)
-- =============================================================

-- 1) product_categories — 카테고리 마스터 (추가/수정/삭제 가능)
CREATE TABLE IF NOT EXISTS product_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text UNIQUE NOT NULL,
  label       text NOT NULL,
  sort_order  int NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_categories_active_sort
  ON product_categories(is_active, sort_order);

DROP TRIGGER IF EXISTS trg_product_categories_updated_at ON product_categories;
CREATE TRIGGER trg_product_categories_updated_at
  BEFORE UPDATE ON product_categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- (RLS 정책: read public, write super_admin/admin/marketer, delete super_admin/admin)
-- 자세한 SQL 은 prod 적용분 참조

INSERT INTO product_categories (code, label, sort_order)
VALUES
  ('pos',         'Pos (카드단말기)', 10),
  ('internet',    '인터넷가입',       20),
  ('tableorder',  '테이블오더',       30),
  ('cctv',        'CCTV',           40),
  ('kiosk',       '키오스크',         50)
ON CONFLICT (code) DO NOTHING;

-- 2) products — 상품 카탈로그
CREATE TABLE IF NOT EXISTS products (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text UNIQUE NOT NULL,
  label           text NOT NULL,
  category        text NOT NULL,                  -- product_categories.code 참조 (FK 아님 — 라벨 변경 자유)
  default_amount  numeric(12,0),
  default_period  text,
  is_subscription boolean NOT NULL DEFAULT false,
  default_monthly numeric(10,0),
  sort_order      int NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid REFERENCES admin_users(user_id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_products_active_sort ON products(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- (RLS 정책: read public, write super_admin/admin/marketer, delete super_admin/admin)

INSERT INTO products (code, label, category, default_amount, default_period, is_subscription, sort_order, is_active)
VALUES ('npay-connect-terminal', 'Npay커넥트단말기', 'pos', 0, '24개월', false, 10, true)
ON CONFLICT (code) DO NOTHING;

-- 3) revenue_records — 매출 기록 (리드 1:N)
CREATE TABLE IF NOT EXISTS revenue_records (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id    uuid NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  product_id         uuid REFERENCES products(id) ON DELETE SET NULL,
  product_label      text,                         -- snapshot
  amount             numeric(12,0) NOT NULL,
  gift_amount        numeric(12,0) NOT NULL DEFAULT 0,
  net_amount         numeric(12,0) GENERATED ALWAYS AS (amount - COALESCE(gift_amount, 0)) STORED,
  monthly_amount     numeric(10,0),
  contract_period    text,
  revenue_date       date NOT NULL,
  recorded_by        uuid REFERENCES admin_users(user_id) ON DELETE SET NULL,
  recorded_at        timestamptz NOT NULL DEFAULT now(),
  note               text
);
CREATE INDEX IF NOT EXISTS idx_revenue_consultation ON revenue_records(consultation_id);
CREATE INDEX IF NOT EXISTS idx_revenue_date ON revenue_records(revenue_date DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_product ON revenue_records(product_id);

ALTER TABLE revenue_records ENABLE ROW LEVEL SECURITY;
-- (RLS 정책: read all admin, write counselor 이상, delete super_admin/admin)

-- 4) 코호트 view 3종
DROP VIEW IF EXISTS v_revenue_by_channel CASCADE;
CREATE VIEW v_revenue_by_channel AS
SELECT
  COALESCE(c.inferred_channel, 'direct') AS channel,
  COUNT(DISTINCT c.id)                   AS lead_count,
  COUNT(DISTINCT r.id)                   AS revenue_count,
  COUNT(DISTINCT r.consultation_id)      AS converting_lead_count,
  SUM(r.amount)                          AS total_amount,
  SUM(r.gift_amount)                     AS total_gift,
  SUM(r.net_amount)                      AS total_net,
  SUM(r.net_amount) FILTER (WHERE r.revenue_date <= c.created_at::date + interval '30 days') AS net_30d,
  SUM(r.net_amount) FILTER (WHERE r.revenue_date <= c.created_at::date + interval '60 days') AS net_60d,
  SUM(r.net_amount) FILTER (WHERE r.revenue_date <= c.created_at::date + interval '90 days') AS net_90d
FROM consultations c
LEFT JOIN revenue_records r ON r.consultation_id = c.id
WHERE COALESCE(c.is_blacklisted, false) = false
GROUP BY 1
ORDER BY total_net DESC NULLS LAST;

DROP VIEW IF EXISTS v_revenue_ltv_by_channel CASCADE;
CREATE VIEW v_revenue_ltv_by_channel AS
WITH lead_first_rev AS (
  SELECT
    c.id, COALESCE(c.inferred_channel, 'direct') AS channel,
    c.created_at::date AS lead_date,
    MIN(r.revenue_date) AS first_revenue_date,
    SUM(r.net_amount) AS lead_total_net
  FROM consultations c
  LEFT JOIN revenue_records r ON r.consultation_id = c.id
  WHERE COALESCE(c.is_blacklisted, false) = false
  GROUP BY 1, 2, 3
)
SELECT
  channel,
  COUNT(*) AS lead_count,
  COUNT(*) FILTER (WHERE first_revenue_date IS NOT NULL) AS converted_lead_count,
  ROUND(100.0 * COUNT(*) FILTER (WHERE first_revenue_date IS NOT NULL) / NULLIF(COUNT(*), 0), 2) AS conversion_rate_pct,
  AVG(lead_total_net) FILTER (WHERE lead_total_net IS NOT NULL) AS avg_ltv,
  SUM(lead_total_net) AS total_revenue,
  AVG(first_revenue_date - lead_date) FILTER (WHERE first_revenue_date IS NOT NULL) AS avg_days_to_first_revenue
FROM lead_first_rev
GROUP BY 1
ORDER BY total_revenue DESC NULLS LAST;

DROP VIEW IF EXISTS v_revenue_by_product CASCADE;
CREATE VIEW v_revenue_by_product AS
SELECT
  COALESCE(r.product_label, '직접입력') AS product_label,
  p.category AS category,
  COUNT(*) AS sale_count,
  SUM(r.amount) AS total_amount,
  SUM(r.gift_amount) AS total_gift,
  SUM(r.net_amount) AS total_net,
  AVG(r.amount) AS avg_amount,
  AVG(r.gift_amount) AS avg_gift
FROM revenue_records r
LEFT JOIN products p ON p.id = r.product_id
GROUP BY 1, 2
ORDER BY total_net DESC NULLS LAST;
