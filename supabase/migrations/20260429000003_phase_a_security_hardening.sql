-- =============================================================
-- Migration: 20260429000003
-- Phase A — 보안 패치 (Supabase Advisor 권고 반영)
-- =============================================================
-- 목적 :
--   Phase A 마이그레이션 적용 후 Supabase Advisor 가 발견한
--   ERROR 4건 + WARN 다수 해결.
--
-- 처리 항목 :
--   1) 뷰 3개 SECURITY INVOKER 로 재생성 (security_definer_view 경고)
--   2) v_consultation_by_counselor 에서 auth.users JOIN 제거 → admin_users 사용
--      (auth_users_exposed 경고)
--   3) 모든 함수 search_path = public, auth 고정 (function_search_path_mutable)
--   4) 헬퍼 함수 anon EXECUTE 권한 회수 (anon_security_definer_function_executable)
-- =============================================================

-- 1) 뷰 3개 SECURITY INVOKER 로 재생성

DROP VIEW IF EXISTS public.v_consultation_funnel;
CREATE VIEW public.v_consultation_funnel
WITH (security_invoker = true) AS
SELECT
  s.code AS status_code,
  s.label AS status_label,
  s.bg_color AS status_color,
  s.is_conversion,
  s.is_promising,
  s.is_unapproved,
  COUNT(c.id) AS total_count,
  COUNT(c.id) FILTER (WHERE c.created_at >= date_trunc('day', now()))   AS today_count,
  COUNT(c.id) FILTER (WHERE c.created_at >= now() - interval '7 days')  AS week_count,
  COUNT(c.id) FILTER (WHERE c.created_at >= now() - interval '30 days') AS month_count
FROM public.db_statuses s
LEFT JOIN public.consultations c ON c.status_id = s.id
WHERE s.is_active = true
GROUP BY s.id;

COMMENT ON VIEW public.v_consultation_funnel IS
  '상태별 신청 카운트 (오늘/7일/30일/전체). 대시보드 KPI 카드 + 퍼널 차트용. SECURITY INVOKER.';

DROP VIEW IF EXISTS public.v_consultation_by_channel;
CREATE VIEW public.v_consultation_by_channel
WITH (security_invoker = true) AS
SELECT
  COALESCE(c.utm_source, '(direct)') AS channel,
  COALESCE(c.utm_campaign, '(none)') AS campaign,
  date_trunc('day', c.created_at)    AS day,
  COUNT(*) AS lead_count,
  COUNT(*) FILTER (WHERE s.is_conversion)  AS conversion_count,
  COUNT(*) FILTER (WHERE s.is_promising)   AS promising_count,
  COUNT(*) FILTER (WHERE s.is_unapproved)  AS unapproved_count,
  ROUND(100.0 * COUNT(*) FILTER (WHERE s.is_conversion) / NULLIF(COUNT(*), 0), 2) AS conversion_rate_pct,
  ROUND(100.0 * COUNT(*) FILTER (WHERE s.is_unapproved) / NULLIF(COUNT(*), 0), 2) AS unapproved_rate_pct
FROM public.consultations c
LEFT JOIN public.db_statuses s ON c.status_id = s.id
GROUP BY 1, 2, 3;

COMMENT ON VIEW public.v_consultation_by_channel IS
  '매체별·캠페인별·일별 신청·전환·허수. SECURITY INVOKER.';

-- counselor 뷰는 auth.users 대신 admin_users 사용
DROP VIEW IF EXISTS public.v_consultation_by_counselor;
CREATE VIEW public.v_consultation_by_counselor
WITH (security_invoker = true) AS
SELECT
  c.counselor_id,
  au.display_name           AS counselor_name,
  au.department             AS counselor_department,
  au.role                   AS counselor_role,
  COUNT(*)                  AS assigned_count,
  COUNT(*) FILTER (WHERE s.is_conversion)  AS conversion_count,
  COUNT(*) FILTER (WHERE s.is_unapproved)  AS unapproved_count,
  COUNT(*) FILTER (WHERE c.status_id IS NOT NULL) AS processed_count,
  ROUND(100.0 * COUNT(*) FILTER (WHERE s.is_conversion) / NULLIF(COUNT(*), 0), 2) AS conversion_rate_pct,
  ROUND(100.0 * COUNT(*) FILTER (WHERE s.is_unapproved) / NULLIF(COUNT(*), 0), 2) AS unapproved_rate_pct
FROM public.consultations c
LEFT JOIN public.db_statuses s ON c.status_id = s.id
LEFT JOIN public.admin_users au ON c.counselor_id = au.user_id
WHERE c.counselor_id IS NOT NULL
GROUP BY c.counselor_id, au.display_name, au.department, au.role;

COMMENT ON VIEW public.v_consultation_by_counselor IS
  '상담사별 배정·처리·개통률·허수율. admin_users 기반 (auth.users 노출 X). SECURITY INVOKER.';


-- 2) 함수 search_path 고정 (보안 패치)
-- search_path 가 설정되지 않으면 권한 상승 공격 가능성 있음.
-- public, auth 둘 다 명시 (auth.uid() 호출 위해).

ALTER FUNCTION public.current_user_role()       SET search_path = public, auth;
ALTER FUNCTION public.is_super_admin()          SET search_path = public, auth;
ALTER FUNCTION public.is_admin_or_above()       SET search_path = public, auth;
ALTER FUNCTION public.is_counselor()            SET search_path = public, auth;
ALTER FUNCTION public.is_marketer()             SET search_path = public, auth;
ALTER FUNCTION public.has_admin_access()        SET search_path = public, auth;
ALTER FUNCTION public.get_my_admin_profile()    SET search_path = public, auth;
ALTER FUNCTION public.set_updated_at()          SET search_path = public;
ALTER FUNCTION public.trim_content_block_history() SET search_path = public;


-- 3) anon EXECUTE 권한 회수 (RPC 외부 노출 방지)
-- 이 함수들은 RLS 정책에서 내부적으로 호출되므로 PostgreSQL 엔진은 사용 가능.
-- 단, /rest/v1/rpc/* 경로로 anon 이 직접 호출하는 건 차단.

REVOKE EXECUTE ON FUNCTION public.current_user_role()       FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_super_admin()          FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_admin_or_above()       FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_counselor()            FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_marketer()             FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_admin_access()        FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_my_admin_profile()    FROM anon, public;

-- authenticated 는 get_my_admin_profile 만 호출 가능 (본인 프로필 조회용 RPC)
GRANT EXECUTE ON FUNCTION public.get_my_admin_profile() TO authenticated;

-- 나머지 헬퍼는 RLS 정책 안에서만 사용 (직접 RPC 호출 불필요)
-- → authenticated 도 직접 호출은 차단 (의도)


-- =============================================================
-- ROLLBACK
-- =============================================================
-- GRANT EXECUTE ON FUNCTION public.current_user_role()       TO anon, authenticated, public;
-- GRANT EXECUTE ON FUNCTION public.is_super_admin()          TO anon, authenticated, public;
-- ... (기타 함수들 grant 복원)
-- ALTER FUNCTION public.current_user_role() RESET search_path;
-- ... (기타 함수들 search_path 복원)
-- 뷰는 다시 SECURITY DEFINER 로 재생성하지 않음 (보안 후퇴)
