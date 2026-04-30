-- =============================================================
-- 보안 경고 일괄 해결 (이미 prod 적용됨 — 재현용)
--   - 분석 view 모두 security_invoker = on (Supabase advisor 빨간 ERROR 9개 제거)
--   - 함수 search_path 고정 (mutable 경고 제거)
-- =============================================================

DO $$
DECLARE
  v_name text;
  view_list text[] := ARRAY[
    'v_revenue_cohort_matrix',
    'v_revenue_cohort_daily',
    'v_revenue_by_channel',
    'v_revenue_by_product',
    'v_revenue_ltv_by_channel',
    'v_consultations_by_inferred_channel',
    'v_consultations_by_keyword',
    'v_consultations_by_creative',
    'v_consultations_by_blog_post',
    'v_consultation_funnel',
    'v_consultation_by_channel',
    'v_consultation_by_counselor',
    'v_cta_performance'
  ];
BEGIN
  FOREACH v_name IN ARRAY view_list LOOP
    IF EXISTS (
      SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = v_name
    ) THEN
      EXECUTE format('ALTER VIEW public.%I SET (security_invoker = on)', v_name);
    END IF;
  END LOOP;
END
$$;

ALTER FUNCTION public.extract_domain(text)             SET search_path = public, pg_temp;
ALTER FUNCTION public.extract_search_keyword(text)     SET search_path = public, pg_temp;
ALTER FUNCTION public.classify_channel(text, text, text, text, text, text)
                                                       SET search_path = public, pg_temp;
ALTER FUNCTION public.fill_attribution_inferred()      SET search_path = public, pg_temp;
ALTER FUNCTION public.has_permission(text, text)       SET search_path = public, pg_temp;
ALTER FUNCTION public.pick_next_counselor()            SET search_path = public, pg_temp;
ALTER FUNCTION public.auto_assign_counselor()          SET search_path = public, pg_temp;
ALTER FUNCTION public.redistribute_consultations(uuid, boolean, integer)
                                                       SET search_path = public, pg_temp;
ALTER FUNCTION public.increment_post_view(text)        SET search_path = public, pg_temp;
