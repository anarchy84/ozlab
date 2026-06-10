-- =============================================================
-- Migration: site visit tracking
-- 목적:
--   광고관리자 클릭수가 아니라 오즈랩페이 사이트에 실제 도착한 방문 세션을
--   first-party 데이터로 기록한다.
--
-- 수집 기준:
--   - 퍼블릭 페이지 방문 시 /api/track/visit 이 service_role 로 INSERT
--   - UTM/referrer/landing/page/device/geo/ip hash 저장
--   - 연령/성별 같은 인구통계는 브라우저 방문만으로는 수집하지 않음
--
-- 보안:
--   - public schema 테이블이지만 RLS ON
--   - anon/authenticated 에는 직접 접근 정책 없음
--   - 서버 Route Handler(service_role)와 관리자 서버 코드만 접근
-- =============================================================

CREATE TABLE IF NOT EXISTS public.site_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at timestamptz NOT NULL DEFAULT now(),

  visitor_id text NOT NULL,
  session_id text NOT NULL,
  event_type text NOT NULL DEFAULT 'page_view'
    CHECK (event_type IN ('page_view')),

  page_path text NOT NULL,
  page_url text,
  page_title text,
  referrer text,
  referrer_domain text,

  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  gclid text,
  fbclid text,
  inferred_channel text,

  ip_address inet,
  ip_hash text,
  country_code text,
  country_name text,
  region text,
  city text,
  latitude numeric(9,6),
  longitude numeric(9,6),

  user_agent text,
  device_type text NOT NULL DEFAULT 'unknown'
    CHECK (device_type IN ('desktop', 'mobile', 'tablet', 'bot', 'unknown')),
  browser_family text,
  os_family text,
  language text,
  timezone text,
  screen_width int,
  screen_height int,
  viewport_width int,
  viewport_height int,
  color_scheme text,
  is_bot boolean NOT NULL DEFAULT false,

  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

COMMENT ON TABLE public.site_visits IS
  'First-party page visit log. 광고관리자 클릭수가 아닌 실제 사이트 도착 방문/세션/UTM/지역/디바이스 분석용.';
COMMENT ON COLUMN public.site_visits.ip_address IS
  '관리자 분석 전용 원본 IP. 공개 API 접근은 차단하고, 화면 표시는 마스킹한다.';
COMMENT ON COLUMN public.site_visits.ip_hash IS
  'IP 원문 노출 없이 중복/통계 계산을 위한 SHA-256 hash.';
COMMENT ON COLUMN public.site_visits.inferred_channel IS
  'UTM/gclid/fbclid/referrer 기반 자동 분류 채널. consultations 와 동일 classify_channel 함수 사용.';

CREATE OR REPLACE FUNCTION public.fill_site_visit_attribution()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.referrer_domain := COALESCE(NEW.referrer_domain, public.extract_domain(NEW.referrer));
  NEW.inferred_channel := COALESCE(
    NEW.inferred_channel,
    public.classify_channel(
      NEW.utm_source,
      NEW.utm_medium,
      NEW.gclid,
      NEW.fbclid,
      NEW.referrer,
      NEW.page_path
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_site_visits_attribution ON public.site_visits;
CREATE TRIGGER trg_site_visits_attribution
  BEFORE INSERT OR UPDATE OF utm_source, utm_medium, utm_term, utm_content,
                              gclid, fbclid, referrer, page_path
  ON public.site_visits
  FOR EACH ROW
  EXECUTE FUNCTION public.fill_site_visit_attribution();

CREATE INDEX IF NOT EXISTS idx_site_visits_occurred_at
  ON public.site_visits (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_visits_session
  ON public.site_visits (session_id);
CREATE INDEX IF NOT EXISTS idx_site_visits_visitor
  ON public.site_visits (visitor_id);
CREATE INDEX IF NOT EXISTS idx_site_visits_utm
  ON public.site_visits (utm_source, utm_medium, utm_campaign);
CREATE INDEX IF NOT EXISTS idx_site_visits_inferred_channel
  ON public.site_visits (inferred_channel);
CREATE INDEX IF NOT EXISTS idx_site_visits_geo
  ON public.site_visits (country_code, region, city);
CREATE INDEX IF NOT EXISTS idx_site_visits_ip_hash
  ON public.site_visits (ip_hash);
CREATE INDEX IF NOT EXISTS idx_site_visits_page_path
  ON public.site_visits (page_path);

ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

-- 서비스 라우트와 관리자 서버 코드에서만 접근한다. 브라우저 anon/authenticated
-- role 이 직접 select/insert 하지 않도록 정책은 만들지 않는다.
GRANT SELECT, INSERT ON public.site_visits TO service_role;
