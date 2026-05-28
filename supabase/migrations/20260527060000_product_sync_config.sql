-- =============================================================
-- Migration: 20260527060000_product_sync_config
-- 상품표 시트 sync 설정 (단일 row 테이블)
-- =============================================================
-- 배경 :
--   공급사가 보내는 상품표(네이버 렌탈표, NIT 출고정책 등)를
--   담당자가 표준 헤더로 정리한 구글 시트 → URL 입력만으로
--   /admin/settings/product-sync 에서 sync.
--
--   ad_sync_config 패턴 그대로. 단일 row (id=1).
-- =============================================================

CREATE TABLE IF NOT EXISTS public.product_sync_config (
  id              integer PRIMARY KEY DEFAULT 1,
  sheet_csv_url   text,                    -- 구글 시트 (CSV export URL 또는 edit URL — sync 시 자동 변환)
  last_synced_at  timestamptz,
  last_status     text,                    -- 'success' | 'error'
  last_message    text,
  rows_processed  integer DEFAULT 0,
  rows_inserted   integer DEFAULT 0,
  rows_updated    integer DEFAULT 0,
  rows_error      integer DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  CONSTRAINT product_sync_config_singleton CHECK (id = 1)
);

-- 시드 — 빈 row (URL 비어있는 상태)
INSERT INTO public.product_sync_config (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- RLS — 어드민만 read/write
ALTER TABLE public.product_sync_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_sync_config_admin_all" ON public.product_sync_config;
CREATE POLICY "product_sync_config_admin_all"
  ON public.product_sync_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin', 'marketer', 'marketing')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin', 'marketer', 'marketing')
    )
  );

COMMENT ON TABLE public.product_sync_config IS
  '상품표 시트 sync 설정 (단일 row). 담당자가 표준 헤더 구글 시트 URL 등록 → 어드민에서 동기화 버튼 클릭 시 products 테이블에 upsert.';
COMMENT ON COLUMN public.product_sync_config.sheet_csv_url IS
  '구글 시트 URL. CSV export 형식 또는 edit URL 모두 인식 (sync 시 자동 변환).';

-- END --
