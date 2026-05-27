-- =============================================================
-- Migration: 20260527020000_ad_metrics_service_not_null
-- ad_metrics.service NOT NULL DEFAULT '' + unique index 단순화
-- =============================================================
-- 배경 :
--   기존 unique index 가 (date, channel, COALESCE(service, '')) expression 형태.
--   supabase-js .upsert(onConflict: 'date,channel,service') 는 expression
--   index 를 인식 못 함 → upsert 충돌 회피 실패.
--
--   service 를 NOT NULL DEFAULT '' 로 강제하면 단순 (date, channel, service)
--   unique 인덱스만으로 충분. 시트 sync 가 정상 동작.
-- =============================================================

-- 기존 NULL service 행을 빈 문자열로 정규화
UPDATE public.ad_metrics SET service = '' WHERE service IS NULL;

-- service NOT NULL + 기본값 ''
ALTER TABLE public.ad_metrics ALTER COLUMN service SET DEFAULT '';
ALTER TABLE public.ad_metrics ALTER COLUMN service SET NOT NULL;

-- 기존 expression 인덱스 제거
DROP INDEX IF EXISTS public.ux_ad_metrics_date_channel_service;

-- 단순 unique 인덱스 재생성
CREATE UNIQUE INDEX ux_ad_metrics_date_channel_service
  ON public.ad_metrics (date, channel, service);

-- END --
