-- =============================================================
-- Migration: 20260429000005
-- Phase A — CTA 어드민 관리 + DB 어트리뷰션
-- =============================================================
-- 목적 :
--   홈에 흩어진 CTA 6개(nav/hero/showcase/promotion/floating/footer)를
--   DB 마스터로 옮겨 super_admin 이 어드민에서 동적 관리.
--   각 CTA 클릭 시 utm_campaign 자동 부여 → consultations 에 기록 →
--   대시보드에서 CTA 별 전환율 분석.
--
-- 데이터 흐름 :
--   1) 사용자가 페이지 진입 → DynamicCTA 가 cta_buttons 조회
--   2) 사용자가 CTA 클릭 → utm 파라미터를 sessionStorage 에 저장
--   3) ApplyForm 제출 → utm 자동 첨부 → consultations.utm_campaign 등 채워짐
--   4) /admin 대시보드에서 CTA 별 신청·전환율 표 노출
--
-- 원칙 :
--   - placement 는 unique 가 아님 (한 위치에 여러 CTA 가능, sort_order 로 순서)
--   - 활성 CTA 만 렌더 (is_active = true)
--   - 어드민에서 추가/수정/삭제·정렬 자유
--   - 클릭수는 utm_campaign 기반으로 분석 뷰에서 자동 집계 (별도 cta_clicks 테이블 X)
-- =============================================================

CREATE TABLE IF NOT EXISTS public.cta_buttons (
  id              serial      PRIMARY KEY,
  placement       text        NOT NULL CHECK (placement IN (
                                'nav','hero','showcase','promotion',
                                'floating','footer','pricing','features',
                                'mechanism','review','custom'
                              )),
  sort_order      int         NOT NULL DEFAULT 0,
  label           text        NOT NULL,
  target_href     text        NOT NULL DEFAULT '#apply',
  target_blank    boolean     NOT NULL DEFAULT false,

  -- 어트리뷰션 (클릭 시 sessionStorage 저장 → 폼 제출 시 첨부)
  utm_source      text,                                -- 예: 'site'
  utm_medium      text,                                -- 예: 'cta'
  utm_campaign    text,                                -- 예: 'cta_hero_main'
  utm_content     text,                                -- 예: '0wonStart'

  -- 스타일 힌트 (DynamicCTA 가 분기 렌더)
  style           text        NOT NULL DEFAULT 'primary'
                              CHECK (style IN ('primary','secondary','ghost','outline','floating')),

  -- 운영 메타
  is_active       boolean     NOT NULL DEFAULT true,
  note            text        CHECK (note IS NULL OR length(note) <= 500),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CHECK (length(label) BETWEEN 1 AND 60)
);

CREATE INDEX IF NOT EXISTS cta_buttons_placement_idx
  ON public.cta_buttons (placement, sort_order)
  WHERE is_active = true;

DROP TRIGGER IF EXISTS cta_buttons_set_updated_at ON public.cta_buttons;
CREATE TRIGGER cta_buttons_set_updated_at
  BEFORE UPDATE ON public.cta_buttons
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE public.cta_buttons IS
  'CTA 버튼 마스터 — 홈 페이지의 모든 CTA 를 DB 로 관리. 클릭 시 utm 자동 부여.';

-- ----- 초기 6개 CTA 시딩 (현재 홈 컴포넌트와 1:1 매핑) -----

INSERT INTO public.cta_buttons
  (placement, sort_order, label, target_href, utm_source, utm_medium, utm_campaign, utm_content, style)
VALUES
  ('nav',        10, '지금 신청하기',     '#apply', 'site', 'cta', 'cta_nav',        'top_nav_button',     'primary'),
  ('hero',       10, '0원으로 시작하기',  '#apply', 'site', 'cta', 'cta_hero',       'hero_main',          'primary'),
  ('showcase',   10, '0원으로 시작하기',  '#apply', 'site', 'cta', 'cta_showcase',   'showcase_section',   'primary'),
  ('promotion',  10, '지금 신청하기',     '#apply', 'site', 'cta', 'cta_promotion',  'promotion_section',  'primary'),
  ('floating',   10, '지금 신청하기',     '#apply', 'site', 'cta', 'cta_floating',   'floating_button',    'floating'),
  ('footer',     10, '상담 신청',         '#apply', 'site', 'cta', 'cta_footer',     'footer_link',        'ghost')
ON CONFLICT DO NOTHING;

COMMENT ON COLUMN public.cta_buttons.utm_campaign IS
  'CTA 클릭 시 ApplyForm 제출에 자동 첨부 → consultations.utm_campaign. 대시보드에서 CTA별 전환율 집계 키.';


-- =============================================================
-- 2) RLS — 익명 SELECT (페이지 렌더용), 쓰기는 super_admin 만
-- =============================================================
ALTER TABLE public.cta_buttons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cta_buttons_select_all ON public.cta_buttons;
CREATE POLICY cta_buttons_select_all
  ON public.cta_buttons
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS cta_buttons_select_admin ON public.cta_buttons;
CREATE POLICY cta_buttons_select_admin
  ON public.cta_buttons
  FOR SELECT
  TO authenticated
  USING (public.has_admin_access());

DROP POLICY IF EXISTS cta_buttons_write_super ON public.cta_buttons;
CREATE POLICY cta_buttons_write_super
  ON public.cta_buttons
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS cta_buttons_update_super ON public.cta_buttons;
CREATE POLICY cta_buttons_update_super
  ON public.cta_buttons
  FOR UPDATE
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS cta_buttons_delete_super ON public.cta_buttons;
CREATE POLICY cta_buttons_delete_super
  ON public.cta_buttons
  FOR DELETE
  TO authenticated
  USING (public.is_super_admin());


-- =============================================================
-- 3) 분석 뷰 — CTA 별 신청·전환율
-- =============================================================
-- consultations.utm_campaign 와 cta_buttons.utm_campaign 매칭
-- → 어떤 CTA 가 가장 효율 좋은지 한눈에

CREATE OR REPLACE VIEW public.v_cta_performance
WITH (security_invoker = true) AS
SELECT
  cta.id                          AS cta_id,
  cta.placement                   AS placement,
  cta.label                       AS label,
  cta.utm_campaign                AS utm_campaign,
  cta.is_active                   AS is_active,
  COUNT(c.id)                     AS lead_count,
  COUNT(c.id) FILTER (WHERE s.is_conversion)  AS conversion_count,
  COUNT(c.id) FILTER (WHERE s.is_promising)   AS promising_count,
  COUNT(c.id) FILTER (WHERE s.is_unapproved)  AS unapproved_count,
  ROUND(
    100.0 * COUNT(c.id) FILTER (WHERE s.is_conversion) / NULLIF(COUNT(c.id), 0),
    2
  ) AS conversion_rate_pct,
  COUNT(c.id) FILTER (WHERE c.created_at >= date_trunc('day', now()))   AS today_count,
  COUNT(c.id) FILTER (WHERE c.created_at >= now() - interval '7 days')  AS week_count,
  COUNT(c.id) FILTER (WHERE c.created_at >= now() - interval '30 days') AS month_count
FROM public.cta_buttons cta
LEFT JOIN public.consultations c ON c.utm_campaign = cta.utm_campaign
LEFT JOIN public.db_statuses s   ON c.status_id = s.id
GROUP BY cta.id;

COMMENT ON VIEW public.v_cta_performance IS
  'CTA 별 신청·전환·허수 카운트 + 비율. utm_campaign 키로 매칭. 어드민 대시보드에서 CTA 효율 표 렌더.';


-- =============================================================
-- ROLLBACK
-- =============================================================
-- DROP VIEW   IF EXISTS public.v_cta_performance;
-- DROP POLICY IF EXISTS cta_buttons_delete_super  ON public.cta_buttons;
-- DROP POLICY IF EXISTS cta_buttons_update_super  ON public.cta_buttons;
-- DROP POLICY IF EXISTS cta_buttons_write_super   ON public.cta_buttons;
-- DROP POLICY IF EXISTS cta_buttons_select_admin  ON public.cta_buttons;
-- DROP POLICY IF EXISTS cta_buttons_select_all    ON public.cta_buttons;
-- DROP TRIGGER IF EXISTS cta_buttons_set_updated_at ON public.cta_buttons;
-- DROP TABLE  IF EXISTS public.cta_buttons;
