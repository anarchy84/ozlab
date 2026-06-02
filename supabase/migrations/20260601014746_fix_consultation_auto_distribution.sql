-- =============================================================
-- Fix: consultation auto distribution
-- =============================================================
-- 원인:
-- - 재현용 마이그레이션에는 auto_assign_counselor() 본문과
--   consultations INSERT 트리거가 빠져 있었다.
-- - distribution_rules id=1 기본 행이 보장되지 않아 pick_next_counselor()
--   가 NULL을 반환할 수 있었다.
-- - 가중 라운드로빈 재정의 과정에서 pause_until 필터와 동시성 잠금이
--   빠져 있었다.
--
-- 목표:
-- - 새 상담 접수 시 counselor_id/assigned_at 이 DB에서 자동 입력되도록 복구한다.
-- - 기존 운영자가 자동분배를 꺼둔 경우(is_enabled=false)는 존중한다.
-- - 분배 대상 role은 TM 상담사/실장만 포함한다.
-- =============================================================

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
  eligible_roles = EXCLUDED.eligible_roles,
  mode = CASE
    WHEN public.distribution_rules.mode NOT IN ('round_robin', 'manual_only')
    THEN 'round_robin'
    ELSE public.distribution_rules.mode
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
  -- 한 번에 여러 상담이 들어와도 같은 담당자에게 몰리지 않도록
  -- 분배 규칙 행을 잠가 pick/update 순서를 직렬화한다.
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
  -- 수동 배정으로 들어온 상담은 담당자를 바꾸지 않고 assigned_at 만 보정한다.
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

COMMENT ON FUNCTION public.auto_assign_counselor() IS
  '상담 신규 접수 시 distribution_rules 기준으로 counselor_id/assigned_at 을 자동 입력한다.';
