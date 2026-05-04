-- =============================================================
-- Migration: 20260430000002
-- 어트리뷰션 강화 — 5컬럼 + 분류 함수 + 자동 채움 trigger + 분석 view
-- =============================================================
-- 목적 :
--   광고 utm 만으로는 부족한 유입 출처 추적을 강화.
--   referer / landing_page / gclid / fbclid 캡처 + 자동 분류로
--   "이 신청이 어디서 왔는지" 한 행에 다 표시.
-- =============================================================

-- 1) consultations 컬럼 추가
ALTER TABLE consultations
  ADD COLUMN IF NOT EXISTS inferred_channel       text,
  ADD COLUMN IF NOT EXISTS inferred_keyword       text,
  ADD COLUMN IF NOT EXISTS inferred_creative      text,
  ADD COLUMN IF NOT EXISTS inferred_landing_title text,
  ADD COLUMN IF NOT EXISTS referer_domain         text;

-- 2) referer URL → 도메인 추출
CREATE OR REPLACE FUNCTION extract_domain(url text)
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE m text;
BEGIN
  IF url IS NULL OR url = '' THEN RETURN NULL; END IF;
  m := substring(url FROM '^https?://([^/]+)');
  IF m IS NULL THEN RETURN NULL; END IF;
  RETURN regexp_replace(lower(m), '^www\.', '');
END;
$$;

-- 3) referer URL → 검색 키워드 (네이버/다음/빙 best-effort)
CREATE OR REPLACE FUNCTION extract_search_keyword(url text)
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  domain text;
  q text;
BEGIN
  IF url IS NULL OR url = '' THEN RETURN NULL; END IF;
  domain := extract_domain(url);
  IF domain IS NULL THEN RETURN NULL; END IF;

  IF domain LIKE '%search.naver.com%' THEN
    q := substring(url FROM '[?&]query=([^&]+)');
  ELSIF domain LIKE '%search.daum.net%' OR domain LIKE '%kakao.com%' THEN
    q := substring(url FROM '[?&]q=([^&]+)');
  ELSIF domain LIKE '%bing.com%' THEN
    q := substring(url FROM '[?&]q=([^&]+)');
  ELSIF domain LIKE '%google.%' THEN
    q := substring(url FROM '[?&]q=([^&]+)');
    IF q IS NULL THEN RETURN '(not provided)'; END IF;
  ELSE
    RETURN NULL;
  END IF;

  IF q IS NULL THEN RETURN NULL; END IF;
  RETURN replace(replace(q, '+', ' '), '%20', ' ');
END;
$$;

-- 4) 매체 분류 — 6단계 우선순위
--    1. utm_source → utm_medium 으로 광고/organic 구분
--    2. gclid → google-ads
--    3. fbclid → meta-ads
--    4. referer 도메인 → search/blog/social/internal/referral
--    5. referer 없음 → direct
CREATE OR REPLACE FUNCTION classify_channel(
  p_utm_source   text,
  p_utm_medium   text,
  p_gclid        text,
  p_fbclid       text,
  p_referer      text,
  p_landing_path text
) RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE domain text; src_lower text;
BEGIN
  IF p_utm_source IS NOT NULL AND p_utm_source != '' THEN
    src_lower := lower(p_utm_source);
    IF p_utm_medium ILIKE '%ads%' OR p_utm_medium ILIKE '%cpc%' OR p_utm_medium ILIKE '%paid%' THEN
      RETURN src_lower || '-ads';
    END IF;
    RETURN src_lower;
  END IF;

  IF p_gclid IS NOT NULL AND p_gclid != '' THEN RETURN 'google-ads'; END IF;
  IF p_fbclid IS NOT NULL AND p_fbclid != '' THEN RETURN 'meta-ads'; END IF;

  domain := extract_domain(p_referer);
  IF domain IS NULL OR domain = '' THEN RETURN 'direct'; END IF;

  IF domain LIKE '%ozlabpay.kr%' THEN
    IF p_landing_path LIKE '/blog/%' THEN RETURN 'internal-blog'; END IF;
    RETURN 'internal';
  END IF;

  IF domain LIKE '%search.naver.com%' THEN RETURN 'naver-search';
  ELSIF domain LIKE '%google.%' THEN RETURN 'google-search';
  ELSIF domain LIKE '%search.daum.net%' THEN RETURN 'daum-search';
  ELSIF domain LIKE '%bing.com%' THEN RETURN 'bing-search';
  END IF;

  IF domain LIKE '%blog.naver.com%' OR domain LIKE '%cafe.naver.com%'
     OR domain LIKE '%tistory.com%' OR domain LIKE '%brunch.co.kr%'
     OR domain LIKE '%velog.io%' THEN RETURN 'referral-blog'; END IF;

  IF domain LIKE '%facebook.com%' OR domain LIKE '%fb.com%'
     OR domain LIKE '%instagram.com%'
     OR domain LIKE '%youtube.com%' OR domain LIKE '%youtu.be%'
     OR domain LIKE '%tiktok.com%' THEN RETURN 'social-organic'; END IF;

  IF domain LIKE '%kakao.com%' OR domain LIKE '%kko.to%' THEN RETURN 'kakao'; END IF;

  RETURN 'referral-other';
END;
$$;

-- 5) 자동 채움 trigger
CREATE OR REPLACE FUNCTION fill_attribution_inferred()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_landing_title text;
BEGIN
  NEW.referer_domain := COALESCE(NEW.referer_domain, extract_domain(NEW.referer));
  NEW.inferred_channel := classify_channel(
    NEW.utm_source, NEW.utm_medium, NEW.gclid, NEW.fbclid, NEW.referer, NEW.landing_page_path
  );
  NEW.inferred_keyword := COALESCE(NULLIF(NEW.utm_term, ''), extract_search_keyword(NEW.referer));
  NEW.inferred_creative := NULLIF(NEW.utm_content, '');

  IF NEW.landing_page_path LIKE '/blog/%' THEN
    SELECT title INTO v_landing_title FROM content_posts
    WHERE slug = substring(NEW.landing_page_path FROM '^/blog/([^/?#]+)') LIMIT 1;
    NEW.inferred_landing_title := v_landing_title;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_consultations_attribution ON consultations;
CREATE TRIGGER trg_consultations_attribution
  BEFORE INSERT OR UPDATE OF utm_source, utm_medium, utm_term, utm_content,
                              gclid, fbclid, referer, landing_page_path
  ON consultations FOR EACH ROW EXECUTE FUNCTION fill_attribution_inferred();

-- 6) 인덱스
CREATE INDEX IF NOT EXISTS idx_consultations_inferred_channel ON consultations(inferred_channel);
CREATE INDEX IF NOT EXISTS idx_consultations_inferred_keyword ON consultations(inferred_keyword);
CREATE INDEX IF NOT EXISTS idx_consultations_referer_domain   ON consultations(referer_domain);

-- 7) 분석 view
DROP VIEW IF EXISTS v_consultations_by_inferred_channel CASCADE;
CREATE VIEW v_consultations_by_inferred_channel AS
SELECT
  COALESCE(inferred_channel, 'direct') AS channel,
  COUNT(*) AS total_count,
  COUNT(*) FILTER (WHERE created_at > now() - interval '1 day')   AS today_count,
  COUNT(*) FILTER (WHERE created_at > now() - interval '7 days')  AS week_count,
  COUNT(*) FILTER (WHERE created_at > now() - interval '30 days') AS month_count,
  COUNT(*) FILTER (
    WHERE EXISTS (SELECT 1 FROM db_statuses s WHERE s.id = consultations.status_id AND s.is_conversion = true)
  ) AS conversion_count
FROM consultations
WHERE COALESCE(is_blacklisted, false) = false
GROUP BY 1 ORDER BY total_count DESC;

DROP VIEW IF EXISTS v_consultations_by_keyword CASCADE;
CREATE VIEW v_consultations_by_keyword AS
SELECT
  inferred_keyword AS keyword,
  COALESCE(inferred_channel, 'direct') AS channel,
  COUNT(*) AS lead_count,
  COUNT(*) FILTER (
    WHERE EXISTS (SELECT 1 FROM db_statuses s WHERE s.id = consultations.status_id AND s.is_conversion = true)
  ) AS conversion_count
FROM consultations
WHERE inferred_keyword IS NOT NULL AND inferred_keyword != '' AND inferred_keyword != '(not provided)'
  AND COALESCE(is_blacklisted, false) = false
GROUP BY 1, 2 ORDER BY lead_count DESC;

DROP VIEW IF EXISTS v_consultations_by_creative CASCADE;
CREATE VIEW v_consultations_by_creative AS
SELECT
  inferred_creative AS creative,
  COALESCE(inferred_channel, 'direct') AS channel,
  utm_campaign AS campaign,
  COUNT(*) AS lead_count,
  COUNT(*) FILTER (
    WHERE EXISTS (SELECT 1 FROM db_statuses s WHERE s.id = consultations.status_id AND s.is_conversion = true)
  ) AS conversion_count
FROM consultations
WHERE inferred_creative IS NOT NULL AND inferred_creative != ''
  AND COALESCE(is_blacklisted, false) = false
GROUP BY 1, 2, 3 ORDER BY lead_count DESC;

DROP VIEW IF EXISTS v_consultations_by_blog_post CASCADE;
CREATE VIEW v_consultations_by_blog_post AS
SELECT
  inferred_landing_title AS post_title,
  landing_page_path,
  COUNT(*) AS lead_count,
  COUNT(*) FILTER (
    WHERE EXISTS (SELECT 1 FROM db_statuses s WHERE s.id = consultations.status_id AND s.is_conversion = true)
  ) AS conversion_count
FROM consultations
WHERE inferred_channel = 'internal-blog'
  AND COALESCE(is_blacklisted, false) = false
GROUP BY 1, 2 ORDER BY lead_count DESC;
