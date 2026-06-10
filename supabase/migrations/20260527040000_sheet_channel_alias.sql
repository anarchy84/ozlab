-- =============================================================
-- Migration: 20260527040000_sheet_channel_alias
-- 시트 매체값 → channel_code 매핑 테이블
-- =============================================================
-- 배경 :
--   시트 매체 컬럼값은 한글 ('네이버 검색광고', '메타 비즈니스' 등).
--   channel_mapping 은 utm_source/utm_medium 기반이라 직접 매핑 불가.
--   시트값 → channel_code 1:1 매핑 별도 테이블 필요.
--
--   ad-sync API 가 sync 시 이 테이블로 매체값 정규화.
--   매핑 안 된 시트값은 그대로 ad_metrics.channel 에 저장되고
--   sync 결과에 unmapped_channels 로 반환됨.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.sheet_channel_alias (
  id           bigserial PRIMARY KEY,
  sheet_value  text NOT NULL,                -- 시트 매체 컬럼값 (한글 그대로)
  channel_code text NOT NULL,                -- 정규화된 channel_code (예: 'meta-ads')
  notes        text,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- 대소문자 무시한 unique
CREATE UNIQUE INDEX IF NOT EXISTS ux_sheet_channel_alias_value
  ON public.sheet_channel_alias (lower(sheet_value));

CREATE INDEX IF NOT EXISTS idx_sheet_channel_alias_code
  ON public.sheet_channel_alias (channel_code);

-- =============================================================
-- 시드 — 우리편 시트(2026-05-27 기준) 매체값
-- =============================================================
INSERT INTO public.sheet_channel_alias (sheet_value, channel_code, notes) VALUES
  -- 네이버
  ('네이버 검색광고',    'naver-search',  '네이버 검색광고 SA'),
  ('네이버검색광고',     'naver-search',  '띄어쓰기 변형'),
  ('네이버',             'naver-ads',     '네이버 (광고매체 미상 시 기본)'),
  -- 메타
  ('메타 비즈니스',      'meta-ads',      '메타 비즈니스 (페이스북/인스타)'),
  ('메타비즈니스',       'meta-ads',      '띄어쓰기 변형'),
  ('메타',               'meta-ads',      '메타 단축 표기'),
  ('페이스북',           'meta-ads',      '페이스북 단독 표기'),
  ('인스타그램',         'meta-ads',      '인스타그램 단독 표기'),
  -- 당근
  ('당근 비즈니스',      'daangn-ads',    '당근마켓 비즈니스'),
  ('당근비즈니스',       'daangn-ads',    '띄어쓰기 변형'),
  ('당근',               'daangn-ads',    '당근 단축 표기'),
  -- 구글
  ('구글ads',            'google-ads',    '구글 광고 (시트 표기)'),
  ('구글 광고',          'google-ads',    '구글 광고 — 한글 표기'),
  ('google ads',         'google-ads',    '영문 표기'),
  ('googleads',          'google-ads',    '영문 단축'),
  -- 유튜브
  ('유튜브',             'youtube-ads',   '유튜브 광고'),
  ('youtube',            'youtube-ads',   '영문 표기'),
  ('youtube ads',        'youtube-ads',   '영문 풀'),
  -- 카카오
  ('카카오 모먼트',      'kakao-ads',     '카카오 모먼트'),
  ('카카오모먼트',       'kakao-ads',     '띄어쓰기 변형'),
  ('카카오 비즈보드',    'kakao-bizboard','카카오 비즈보드'),
  -- 틱톡
  ('틱톡',               'tiktok-ads',    '틱톡 광고'),
  ('tiktok',             'tiktok-ads',   '영문 표기'),
  -- 자연 유입 (광고비 없음)
  ('자체',               'self',          '자체 채널 / 비유료'),
  ('site',               'site',          '사이트 직접 유입')
ON CONFLICT (lower(sheet_value)) DO NOTHING;

-- =============================================================
-- RLS — anon read, admin write
-- =============================================================
ALTER TABLE public.sheet_channel_alias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sheet_channel_alias_read" ON public.sheet_channel_alias;
CREATE POLICY "sheet_channel_alias_read"
  ON public.sheet_channel_alias FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "sheet_channel_alias_admin_write" ON public.sheet_channel_alias;
CREATE POLICY "sheet_channel_alias_admin_write"
  ON public.sheet_channel_alias FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'marketing', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'marketing', 'admin')
    )
  );

-- =============================================================
-- 코멘트
-- =============================================================
COMMENT ON TABLE public.sheet_channel_alias IS
  '시트 매체 컬럼값(한글) → channel_code 정규화 매핑. ad-sync 시 자동 적용. 어드민에서 편집 가능.';
COMMENT ON COLUMN public.sheet_channel_alias.sheet_value IS
  '시트에서 사용되는 매체값. 대소문자/띄어쓰기 변형까지 시드.';
COMMENT ON COLUMN public.sheet_channel_alias.channel_code IS
  '정규화된 channel_code. channel_mapping 의 channel_code 와 일치하면 KPI 합산에 자동 포함.';

-- =============================================================
-- 헬퍼 함수 — 시트값 → channel_code 조회 (RPC)
-- =============================================================
CREATE OR REPLACE FUNCTION public.resolve_sheet_channel(p_sheet_value text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT channel_code
  FROM public.sheet_channel_alias
  WHERE lower(sheet_value) = lower(p_sheet_value)
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.resolve_sheet_channel(text) IS
  '시트 매체값 → channel_code. 매핑 없으면 NULL.';

-- END --
