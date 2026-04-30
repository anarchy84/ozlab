-- =============================================================
-- Phase 2~6 토대 (이미 prod 적용됨 — 재현용)
-- =============================================================
--   2. 권한 재설계 (5 role + 동적 매트릭스)
--   3. DB 자동배분 (라운드로빈)
--   5. ad_metrics + 시트 sync 설정
--   6. 통합 대시보드는 SQL 변경 없음 (view 재활용)
-- =============================================================

-- Phase 2 — 권한
ALTER TABLE admin_users
  DROP CONSTRAINT IF EXISTS admin_users_role_check;
ALTER TABLE admin_users
  ADD CONSTRAINT admin_users_role_check
  CHECK (role = ANY (ARRAY[
    'super_admin', 'admin', 'counselor', 'marketer', 'viewer',
    'marketing', 'tm_lead', 'it_ops'
  ]));

CREATE TABLE IF NOT EXISTS app_roles (
  code text PRIMARY KEY,
  label text NOT NULL,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  is_legacy boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_permissions (
  code text PRIMARY KEY,
  group_label text NOT NULL,
  label text NOT NULL,
  description text,
  sort_order int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_code text REFERENCES app_roles(code) ON DELETE CASCADE,
  permission_code text REFERENCES app_permissions(code) ON DELETE CASCADE,
  PRIMARY KEY (role_code, permission_code)
);

ALTER TABLE app_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION has_permission(p_role text, p_perm text)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM role_permissions
    WHERE role_code = p_role AND permission_code = p_perm
  )
$$;

-- Phase 3 — DB 분배
CREATE TABLE IF NOT EXISTS distribution_rules (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  is_enabled boolean NOT NULL DEFAULT false,
  mode text NOT NULL DEFAULT 'round_robin' CHECK (mode IN ('round_robin', 'manual_only')),
  eligible_roles text[] NOT NULL DEFAULT ARRAY['counselor']::text[],
  last_assigned uuid REFERENCES admin_users(user_id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES admin_users(user_id) ON DELETE SET NULL
);

ALTER TABLE distribution_rules ENABLE ROW LEVEL SECURITY;

-- pick_next_counselor / auto_assign_counselor / redistribute_consultations
-- (실제 함수 본문은 prod 마이그레이션 참조)

-- Phase 5 — ad_metrics + sync config
CREATE TABLE IF NOT EXISTS ad_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  channel text NOT NULL,
  service text,
  impressions bigint DEFAULT 0,
  clicks bigint DEFAULT 0,
  conversions bigint DEFAULT 0,
  spend numeric(12,0) DEFAULT 0,
  source text,
  synced_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_ad_metrics_date_channel_service
  ON ad_metrics (date, channel, COALESCE(service, ''));

CREATE TABLE IF NOT EXISTS ad_sync_config (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  sheet_csv_url text,
  last_synced_at timestamptz,
  last_status text,
  last_message text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ad_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_sync_config ENABLE ROW LEVEL SECURITY;
