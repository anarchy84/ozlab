-- =============================================================
-- Migration: 20260527030000_ad_sync_config_paid
-- ad_sync_config 에 페이드 미디어 시트 컬럼 추가
-- =============================================================
-- 배경 :
--   DB 매입 시트(토스) + 페이드 미디어 시트(네이버/메타/구글) 별도 운영.
--   현재 sheet_csv_url 컬럼은 DB 매입 시트 (BC 위해 컬럼명 유지).
--   페이드 미디어용 컬럼을 별도 추가.
-- =============================================================

ALTER TABLE public.ad_sync_config
  ADD COLUMN IF NOT EXISTS sheet_csv_url_paid    text,
  ADD COLUMN IF NOT EXISTS last_synced_at_paid   timestamptz,
  ADD COLUMN IF NOT EXISTS last_status_paid      text,
  ADD COLUMN IF NOT EXISTS last_message_paid     text;

COMMENT ON COLUMN public.ad_sync_config.sheet_csv_url IS
  'DB 매입 시트 URL (날짜·출처·매입수량·단가·총매입비) — source=db_purchase';
COMMENT ON COLUMN public.ad_sync_config.sheet_csv_url_paid IS
  '페이드 미디어 시트 URL (날짜·출처·노출·클릭·광고비) — source=paid_media';

-- END --
