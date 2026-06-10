-- =============================================================
-- Migration: 20260527000000_channel_mapping
-- UTM ↔ 표준 channel 코드 매핑 마스터
-- =============================================================
-- 배경 :
--   consultations.utm_source / utm_medium 값(광고대행사가 박는 값)과
--   ad_metrics.channel 값(시트에서 들어오는 값)이 표기가 달라서
--   분석 시 조인 불가. 매핑 테이블로 일원화.
--
-- 예시 :
--   utm_source=naver + utm_medium=cpc  →  channel_code=naver-ads
--   utm_source=naver + utm_medium=search → channel_code=naver-search
--   utm_source=meta + utm_medium=cpc   →  channel_code=meta-ads
--   utm_source=site (자체)              →  channel_code=site (paid=false)
--
-- 사용처 :
--   - paid-media 대시보드에서 utm → channel 정규화 후 ad_metrics 와 조인
--   - 광고 대행사 utm 변경 시 어드민 편집 (Phase Z, 추후)
-- =============================================================

CREATE TABLE IF NOT EXISTS public.channel_mapping (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  utm_source      text        NOT NULL CHECK (length(utm_source) BETWEEN 1 AND 50),
  utm_medium      text        CHECK (utm_medium IS NULL OR length(utm_medium) BETWEEN 1 AND 50),
  channel_code    text        NOT NULL CHECK (length(channel_code) BETWEEN 1 AND 50),
  channel_label   text        NOT NULL CHECK (length(channel_label) BETWEEN 1 AND 50),
  is_paid         boolean     NOT NULL DEFAULT true,  -- true=페이드미디어, false=자연유입/직접
  sort_order      integer     NOT NULL DEFAULT 0,
  is_active       boolean     NOT NULL DEFAULT true,
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- utm_source + utm_medium 조합 unique (medium NULL = source 만 매칭)
CREATE UNIQUE INDEX IF NOT EXISTS channel_mapping_unique
  ON public.channel_mapping (lower(utm_source), lower(coalesce(utm_medium, '')));

-- 조회 인덱스
CREATE INDEX IF NOT EXISTS channel_mapping_lookup
  ON public.channel_mapping (channel_code, is_active);

DROP TRIGGER IF EXISTS channel_mapping_set_updated_at
  ON public.channel_mapping;
CREATE TRIGGER channel_mapping_set_updated_at
  BEFORE UPDATE ON public.channel_mapping
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE public.channel_mapping IS
  'UTM 조합 → 표준 채널 코드 매핑. consultations.utm_* 과 ad_metrics.channel 통일 정규화';

-- =============================================================
-- RLS
-- =============================================================
ALTER TABLE public.channel_mapping ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS channel_mapping_read ON public.channel_mapping;
CREATE POLICY channel_mapping_read
  ON public.channel_mapping FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS channel_mapping_admin_write ON public.channel_mapping;
CREATE POLICY channel_mapping_admin_write
  ON public.channel_mapping FOR ALL
  TO authenticated
  USING (public.is_admin_or_above())
  WITH CHECK (public.is_admin_or_above());

GRANT SELECT ON public.channel_mapping TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.channel_mapping TO authenticated;

-- =============================================================
-- 시드 — 한국 디지털마케팅 표준 매체 셋
-- =============================================================
-- 페이드 미디어 (광고비 집행 대상)
INSERT INTO public.channel_mapping
  (utm_source, utm_medium, channel_code, channel_label, is_paid, sort_order)
VALUES
  -- 네이버 계열
  ('naver',    'cpc',      'naver-ads',      '네이버 광고',     true, 10),
  ('naver',    'search',   'naver-search',   '네이버 검색광고', true, 11),
  ('naver',    'brand',    'naver-brand',    '네이버 브랜드검색', true, 12),
  ('naver',    'display',  'naver-display',  '네이버 디스플레이', true, 13),
  ('naver',    'powerlink','naver-powerlink','네이버 파워링크', true, 14),
  -- 구글 계열
  ('google',   'cpc',      'google-ads',     '구글 광고',       true, 20),
  ('google',   'search',   'google-search',  '구글 검색광고',   true, 21),
  ('google',   'display',  'google-display', '구글 디스플레이', true, 22),
  ('youtube',  'cpc',      'youtube-ads',    '유튜브 광고',     true, 25),
  -- 메타 계열
  ('meta',     'cpc',      'meta-ads',       '메타 광고',       true, 30),
  ('facebook', 'cpc',      'meta-ads',       '메타 광고',       true, 31),
  ('instagram','cpc',      'meta-ads',       '메타 광고',       true, 32),
  -- 카카오 계열
  ('kakao',    'cpc',      'kakao-ads',      '카카오 모먼트',   true, 40),
  ('kakao',    'biz',      'kakao-bizboard', '카카오 비즈보드', true, 41),
  -- 그 외 페이드
  ('daangn',   'cpc',      'daangn-ads',     '당근 광고',       true, 50),
  ('tiktok',   'cpc',      'tiktok-ads',     '틱톡 광고',       true, 51),

  -- 자연 유입 (광고비 없음 — paid=false)
  ('naver',    'organic',  'naver-organic',  '네이버 자연유입', false, 100),
  ('google',   'organic',  'google-organic', '구글 자연유입',   false, 101),
  ('referral', NULL,       'referral',       '추천/리퍼럴',     false, 110),
  ('direct',   NULL,       'direct',         '직접 유입',       false, 120),
  ('email',    NULL,       'email',          '이메일',          false, 130),
  ('sms',      NULL,       'sms',            'SMS',             false, 131),

  -- 자체 (랜딩의 CTA 버튼 등 — utm_source=site)
  ('site',     NULL,       'site',           '자체 사이트',     false, 200)
ON CONFLICT (lower(utm_source), lower(coalesce(utm_medium, ''))) DO NOTHING;

-- =============================================================
-- 헬퍼 함수 — utm_source/medium 으로 channel_code 조회
-- =============================================================
-- 우선순위 : (source + medium 정확매칭) > (source 만 매칭 medium IS NULL) > 'unknown'
-- consultations 어트리뷰션 분석 SQL 에서 사용
CREATE OR REPLACE FUNCTION public.resolve_channel(
  p_source text,
  p_medium text DEFAULT NULL
) RETURNS TABLE (
  channel_code  text,
  channel_label text,
  is_paid       boolean
) LANGUAGE sql STABLE AS $$
  WITH src AS (
    SELECT lower(coalesce(p_source, '')) AS s,
           lower(coalesce(p_medium, '')) AS m
  )
  -- 1) source + medium 정확 매칭
  SELECT cm.channel_code, cm.channel_label, cm.is_paid
  FROM public.channel_mapping cm, src
  WHERE cm.is_active
    AND lower(cm.utm_source) = src.s
    AND lower(coalesce(cm.utm_medium, '')) = src.m
  LIMIT 1
$$;

COMMENT ON FUNCTION public.resolve_channel(text, text) IS
  'UTM source/medium → 표준 채널 코드. 분석 SQL 에서 consultations 와 ad_metrics 매핑 시 사용';

-- END --
