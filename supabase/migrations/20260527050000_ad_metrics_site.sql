-- =============================================================
-- Migration: 20260527050000_ad_metrics_site
-- ad_metrics 멀티 사이트 분리 (site 컬럼 추가)
-- =============================================================
-- 배경 :
--   현재 ad_metrics 는 오즈랩 전용 가정.
--   2026-04~05 우리편 시트 데이터를 일단 같은 테이블에 import 하고
--   오즈랩 본격 운영 시작 후 DELETE WHERE site='wooripen' 한 줄로 정리.
--
--   향후 멀티테넌트(SaaS) 확장 대비 — site 컬럼이 tenant 식별자 역할.
-- =============================================================

-- 1) site 컬럼 추가 (기본 'ozlab')
ALTER TABLE public.ad_metrics
  ADD COLUMN IF NOT EXISTS site text NOT NULL DEFAULT 'ozlab';

-- 2) 기존 unique index 제거 → (site, date, channel, service) 로 확장
DROP INDEX IF EXISTS public.ux_ad_metrics_date_channel_service;

CREATE UNIQUE INDEX IF NOT EXISTS ux_ad_metrics_site_date_channel_service
  ON public.ad_metrics (site, date, channel, service);

-- site 단독 인덱스 (필터 자주 쓰임)
CREATE INDEX IF NOT EXISTS idx_ad_metrics_site
  ON public.ad_metrics (site);

-- 3) 코멘트
COMMENT ON COLUMN public.ad_metrics.site IS
  '사이트/테넌트 식별자. ''ozlab''(기본), ''wooripen''(2026-04~05 시트 일괄 import) 등. 오즈랩 본격 운영 시 wooripen 데이터 삭제 예정.';

-- =============================================================
-- ad_sync_config 에도 site 컬럼 추가 (시트 sync 시 어떤 site 로 들어갈지)
-- =============================================================
ALTER TABLE public.ad_sync_config
  ADD COLUMN IF NOT EXISTS site text NOT NULL DEFAULT 'ozlab';

COMMENT ON COLUMN public.ad_sync_config.site IS
  '이 시트 sync 결과가 들어갈 site. 어드민에서 설정.';

-- END --
