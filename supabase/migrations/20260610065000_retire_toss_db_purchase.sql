-- =============================================================
-- Retire Toss / DB-purchase lead source
-- 2026-06: 오즈랩페이는 토스 단말기/외부 DB 매입 모델을 운영하지 않는다.
--
-- 원칙:
--   - 운영 분석 화면에서는 paid media + organic traffic 만 사용
--   - 과거 db_purchase raw 는 ad_metrics 에서 제거해 예전 UI/쿼리에도 노출되지 않게 함
--   - 삭제 전 archive table 에 보관해 필요 시 복구 가능하게 함
-- =============================================================

CREATE TABLE IF NOT EXISTS public.ad_metrics_retired_archive AS
SELECT
  *,
  now()::timestamptz AS archived_at,
  ''::text AS archive_reason
FROM public.ad_metrics
WHERE false;

INSERT INTO public.ad_metrics_retired_archive
SELECT
  *,
  now()::timestamptz AS archived_at,
  'retired_toss_db_purchase_20260610'::text AS archive_reason
FROM public.ad_metrics
WHERE source = 'db_purchase'
   OR source = 'retired_db_purchase'
   OR channel ILIKE '%토스%'
   OR channel ILIKE '%toss%';

DELETE FROM public.ad_metrics
WHERE source = 'db_purchase'
   OR source = 'retired_db_purchase'
   OR channel ILIKE '%토스%'
   OR channel ILIKE '%toss%';

UPDATE public.ad_sync_config
SET sheet_csv_url = NULL,
    last_synced_at = NULL,
    last_status = NULL,
    last_message = '외부 DB 매입/토스 단말기 운영 중단으로 비활성화',
    updated_at = now()
WHERE id = 1;

DELETE FROM public.sheet_channel_alias
WHERE sheet_value ILIKE '%토스%'
   OR sheet_value ILIKE '%toss%'
   OR channel_code ILIKE '%toss%';

DELETE FROM public.channel_mapping
WHERE channel_code ILIKE '%toss%'
   OR channel_label ILIKE '%토스%'
   OR channel_label ILIKE '%toss%'
   OR utm_source ILIKE '%toss%';

