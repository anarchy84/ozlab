-- =============================================================
-- Repair: assignment visibility + auto distribution trigger
-- =============================================================
-- 증상:
-- - 마케팅/TM실장 계정에서 담당자 목록이 비거나 본인만 보일 수 있음
--   (admin_users RLS 가 super_admin 전체/select self 만 허용하던 영향).
-- - 운영 DB에 distribution_rules 기본 행 또는 auto_assign trigger 가 빠지면
--   신규 상담이 미배정으로 남을 수 있음.
--
-- 목표:
-- - 어드민 접근 권한이 있는 사용자는 담당자 목록을 조회할 수 있게 한다.
-- - distribution_rules id=1 기본 행, pick_next_counselor, auto_assign trigger 를 보장한다.
-- =============================================================

DROP POLICY IF EXISTS admin_users_select_admin_access ON public.admin_users;
CREATE POLICY admin_users_select_admin_access
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (public.has_admin_access());

INSERT INTO public.distribution_rules (
  id,
  is_enabled,
  mode,
  eligible_roles,
  updated_at
)
VALUES (
  1,
  true,
  'round_robin',
  ARRAY['counselor', 'tm_lead']::text[],
  now()
)
ON CONFLICT (id) DO UPDATE
SET
  eligible_roles = ARRAY['counselor', 'tm_lead']::text[],
  mode = CASE
    WHEN public.distribution_rules.mode IN ('round_robin', 'manual_only')
    THEN public.distribution_rules.mode
    ELSE 'round_robin'
  END,
  updated_at = now();

CREATE OR REPLACE FUNCTION public.pick_next_counselor_excluding(
  p_exclude_user uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_rule       public.distribution_rules%ROWTYPE;
  v_next_uid   uuid;
  v_increment  numeric;
BEGIN
  SELECT *
    INTO v_rule
  FROM public.distribution_rules
  WHERE id = 1
  FOR UPDATE;

  IF NOT FOUND OR NOT v_rule.is_enabled OR v_rule.mode != 'round_robin' THEN
    RETURN NULL;
  END IF;

  WITH eligible AS (
    SELECT
      user_id,
      COALESCE(display_name, user_id::text) AS name,
      COALESCE(distribution_weight, 1.0) AS weight,
      COALESCE(distribution_score, 0) AS score
    FROM public.admin_users
    WHERE is_active = true
      AND role = ANY(v_rule.eligible_roles)
      AND distribution_enabled = true
      AND (
        distribution_paused_until IS NULL
        OR distribution_paused_until <= now()
      )
      AND (p_exclude_user IS NULL OR user_id <> p_exclude_user)
  )
  SELECT user_id, (1.0 / NULLIF(weight, 0))
    INTO v_next_uid, v_increment
  FROM eligible
  ORDER BY
    score ASC,
    CASE WHEN user_id = v_rule.last_assigned THEN 1 ELSE 0 END ASC,
    name ASC,
    user_id ASC
  LIMIT 1;

  IF v_next_uid IS NOT NULL THEN
    UPDATE public.admin_users
    SET distribution_score = COALESCE(distribution_score, 0) + COALESCE(v_increment, 1.0),
        updated_at = now()
    WHERE user_id = v_next_uid;

    UPDATE public.distribution_rules
    SET last_assigned = v_next_uid,
        updated_at = now()
    WHERE id = 1;
  END IF;

  RETURN v_next_uid;
END;
$function$;

CREATE OR REPLACE FUNCTION public.pick_next_counselor()
RETURNS uuid
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN public.pick_next_counselor_excluding(NULL);
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_assign_counselor()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_uid uuid;
BEGIN
  IF NEW.counselor_id IS NOT NULL THEN
    NEW.assigned_at := COALESCE(NEW.assigned_at, now());
    RETURN NEW;
  END IF;

  v_uid := public.pick_next_counselor();

  IF v_uid IS NOT NULL THEN
    NEW.counselor_id := v_uid;
    NEW.assigned_at := COALESCE(NEW.assigned_at, now());
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS consultations_auto_assign_counselor ON public.consultations;
DROP TRIGGER IF EXISTS trg_consultations_auto_assign ON public.consultations;

CREATE TRIGGER trg_consultations_auto_assign
  BEFORE INSERT ON public.consultations
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_counselor();

COMMENT ON POLICY admin_users_select_admin_access ON public.admin_users IS
  '어드민 사용자가 수동배정/담당자 확인용 admin_users 목록을 조회할 수 있게 허용한다.';
COMMENT ON FUNCTION public.auto_assign_counselor() IS
  '상담 신규 접수 시 distribution_rules 기준으로 counselor_id/assigned_at 을 자동 입력한다.';
