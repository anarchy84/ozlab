-- =============================================================
-- Migration: 20260610050907_unify_channel_classification
-- 채널 분류 단일화 — classify_channel 이 channel_mapping 을 1순위로 조회
-- =============================================================
-- 배경 :
--   classify_channel() (consultations / site_visits 트리거)이
--   channel_mapping 마스터를 무시하고 자체 문자열 휴리스틱으로 분류.
--   → utm_medium 에 'ads' 만 있으면 무조건 `<source>-ads` 로 뭉개버려
--     naver + search-ads 가 'naver-ads'(네이버 광고)로 표기되는 버그.
--   channel_mapping 에는 이미 naver+search-ads → naver-search
--   ('네이버 검색광고') 매핑이 존재하지만 사용되지 않았음.
--
-- 변경 :
--   1) channel_mapping 시드 보강 — 오가닉/리퍼러 기반 채널 코드도
--      마스터에 등록해 "코드 → 라벨" 단일 사전으로 승격
--   2) classify_channel() 재작성 —
--      ① channel_mapping 정확매칭(source+medium) → ② source 단독 매칭
--      → ③ 기존 휴리스틱 폴백 (미매핑 utm 안전망)
--      → ④ gclid/fbclid → ⑤ referer 도메인 → ⑥ direct
--      referer 기반 검색 유입은 paid 코드와 충돌하지 않게
--      naver-organic / google-organic 등 *-organic 코드로 분리
--   3) consultations + site_visits 의 inferred_channel 전체 백필
--
-- 효과 :
--   · 어드민에서 channel_mapping 행만 수정하면 분류 즉시 반영 (하드코딩 0)
--   · 유료(naver-search=네이버 검색광고) vs 오가닉(naver-organic) 구분 보존
--   · ad_metrics(시트 동기화) 의 channel_code 와 동일 체계 유지 → 조인 무손상
-- =============================================================

-- -------------------------------------------------------------
-- 1) 시드 보강 — 오가닉 검색 + 리퍼러 기반 채널을 마스터 사전에 등록
-- -------------------------------------------------------------
INSERT INTO public.channel_mapping
  (utm_source, utm_medium, channel_code, channel_label, is_paid, sort_order, note)
VALUES
  -- 오가닉 검색 (referer 기반 분류 결과도 이 코드 사용)
  ('daum',            'organic', 'daum-organic',   '다음 자연유입',   false, 102, 'referer 기반 오가닉 검색 코드'),
  ('bing',            'organic', 'bing-organic',   '빙 자연유입',     false, 103, 'referer 기반 오가닉 검색 코드'),
  -- 리퍼러 기반 분류 코드 사전 (utm_source 가 이 값으로 들어올 일은 사실상 없지만
  -- channel_code → label 단일 사전 역할을 위해 등록. is_paid=false)
  ('internal-blog',   NULL,      'internal-blog',  '자체 블로그',     false, 140, 'referer 기반 분류 코드 사전용'),
  ('internal',        NULL,      'internal',       '자체 사이트 이동', false, 141, 'referer 기반 분류 코드 사전용'),
  ('referral-blog',   NULL,      'referral-blog',  '외부 블로그',     false, 142, 'referer 기반 분류 코드 사전용'),
  ('referral-other',  NULL,      'referral-other', '외부 추천',       false, 143, 'referer 기반 분류 코드 사전용'),
  ('social-organic',  NULL,      'social-organic', 'SNS 자연유입',    false, 144, 'referer 기반 분류 코드 사전용'),
  ('kakao-organic',   NULL,      'kakao',          '카카오톡',        false, 145, 'referer 기반 분류 코드 사전용')
ON CONFLICT (lower(utm_source), lower(coalesce(utm_medium, ''))) DO NOTHING;

-- -------------------------------------------------------------
-- 2) classify_channel 재작성 — channel_mapping 1순위 조회
-- -------------------------------------------------------------
-- 주의 : 테이블을 읽으므로 IMMUTABLE → STABLE 로 변경
CREATE OR REPLACE FUNCTION public.classify_channel(
  p_utm_source   text,
  p_utm_medium   text,
  p_gclid        text,
  p_fbclid       text,
  p_referer      text,
  p_landing_path text
) RETURNS text LANGUAGE plpgsql STABLE AS $$
DECLARE
  domain    text;
  src_lower text;
  med_lower text;
  v_code    text;
BEGIN
  -- ── ① UTM 이 있으면 channel_mapping 마스터 1순위 ──
  IF p_utm_source IS NOT NULL AND p_utm_source != '' THEN
    src_lower := lower(trim(p_utm_source));
    med_lower := lower(trim(coalesce(p_utm_medium, '')));

    -- ①-a source + medium 정확 매칭
    SELECT cm.channel_code INTO v_code
    FROM public.channel_mapping cm
    WHERE cm.is_active
      AND lower(cm.utm_source) = src_lower
      AND lower(coalesce(cm.utm_medium, '')) = med_lower
    LIMIT 1;
    IF v_code IS NOT NULL THEN RETURN v_code; END IF;

    -- ①-b source 단독 매칭 (medium NULL 행)
    SELECT cm.channel_code INTO v_code
    FROM public.channel_mapping cm
    WHERE cm.is_active
      AND lower(cm.utm_source) = src_lower
      AND lower(coalesce(cm.utm_medium, '')) = ''
    LIMIT 1;
    IF v_code IS NOT NULL THEN RETURN v_code; END IF;

    -- ①-c 미매핑 안전망 — 기존 휴리스틱 유지
    IF p_utm_medium ILIKE '%ads%' OR p_utm_medium ILIKE '%cpc%' OR p_utm_medium ILIKE '%paid%' THEN
      RETURN src_lower || '-ads';
    END IF;
    RETURN src_lower;
  END IF;

  -- ── ② 광고 클릭 ID ──
  IF p_gclid IS NOT NULL AND p_gclid != '' THEN RETURN 'google-ads'; END IF;
  IF p_fbclid IS NOT NULL AND p_fbclid != '' THEN RETURN 'meta-ads'; END IF;

  -- ── ③ referer 도메인 ──
  domain := extract_domain(p_referer);
  IF domain IS NULL OR domain = '' THEN RETURN 'direct'; END IF;

  IF domain LIKE '%ozlabpay.kr%' THEN
    IF p_landing_path LIKE '/blog/%' THEN RETURN 'internal-blog'; END IF;
    RETURN 'internal';
  END IF;

  -- 오가닉 검색 — paid 코드(naver-search 등)와 충돌하지 않게 *-organic 분리
  IF domain LIKE '%search.naver.com%' THEN RETURN 'naver-organic';
  ELSIF domain LIKE '%google.%' THEN RETURN 'google-organic';
  ELSIF domain LIKE '%search.daum.net%' THEN RETURN 'daum-organic';
  ELSIF domain LIKE '%bing.com%' THEN RETURN 'bing-organic';
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

COMMENT ON FUNCTION public.classify_channel(text, text, text, text, text, text) IS
  '유입 채널 분류. channel_mapping 마스터 1순위 조회(어드민 편집 즉시 반영) → 휴리스틱 폴백. consultations/site_visits 트리거 공용';

-- -------------------------------------------------------------
-- 3) 백필 — 기존 데이터 재분류
-- -------------------------------------------------------------
-- inferred_channel 직접 갱신은 attribution 트리거(UPDATE OF utm_* ...)를
-- 발화시키지 않으므로 이중 실행 없음.
UPDATE public.consultations
SET inferred_channel = public.classify_channel(
  utm_source, utm_medium, gclid, fbclid, referer, landing_page_path
);

-- site_visits 는 20260610044332 마이그레이션 적용 후에만 존재 — 가드 처리
DO $$
BEGIN
  IF to_regclass('public.site_visits') IS NOT NULL THEN
    UPDATE public.site_visits
    SET inferred_channel = public.classify_channel(
      utm_source, utm_medium, gclid, fbclid, referrer, page_path
    );
  END IF;
END;
$$;

-- END --
