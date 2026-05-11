-- =============================================================
-- Weighted TM distribution controls
-- =============================================================
-- 상담사별 분배는 단순 ON/OFF와 배수만 사용한다.
-- - distribution_enabled=false: 자동분배 대상 제외
-- - distribution_weight=0.5/1/2: 1/2배수, 기본, 2배수
-- - distribution_score: 가중 라운드로빈을 위한 누적 점수

ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS distribution_weight numeric(3,1) NOT NULL DEFAULT 1.0
    CHECK (distribution_weight IN (0.5, 1.0, 2.0)),
  ADD COLUMN IF NOT EXISTS distribution_score numeric(12,3) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS admin_users_distribution_weighted_idx
  ON public.admin_users (role, distribution_enabled, distribution_score)
  WHERE is_active = true;

COMMENT ON COLUMN public.admin_users.distribution_weight IS
  '자동 DB 분배 배수. 0.5=1/2배수, 1=기본, 2=2배수.';
COMMENT ON COLUMN public.admin_users.distribution_score IS
  '가중 라운드로빈 분배 누적 점수. 낮은 상담사가 다음 후보가 된다.';

UPDATE public.distribution_rules
SET eligible_roles = ARRAY['counselor', 'tm_lead']::text[],
    mode = 'round_robin',
    updated_at = now()
WHERE id = 1;

CREATE OR REPLACE FUNCTION public.pick_next_counselor_excluding(p_exclude_user uuid DEFAULT NULL::uuid)
RETURNS uuid
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_rule       distribution_rules%ROWTYPE;
  v_next_uid   uuid;
  v_increment  numeric;
BEGIN
  SELECT * INTO v_rule FROM distribution_rules WHERE id = 1;

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
      AND (p_exclude_user IS NULL OR user_id <> p_exclude_user)
  )
  SELECT user_id, (1.0 / weight)
  INTO v_next_uid, v_increment
  FROM eligible
  ORDER BY
    score ASC,
    CASE WHEN user_id = v_rule.last_assigned THEN 1 ELSE 0 END ASC,
    name ASC
  LIMIT 1;

  IF v_next_uid IS NOT NULL THEN
    UPDATE public.admin_users
    SET distribution_score = COALESCE(distribution_score, 0) + v_increment,
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

DROP FUNCTION IF EXISTS public.redistribute_consultations(uuid, boolean, integer);

CREATE OR REPLACE FUNCTION public.redistribute_consultations(
  p_target_counselor uuid DEFAULT NULL::uuid,
  p_unassigned_only boolean DEFAULT true,
  p_limit integer DEFAULT 100,
  p_status_id integer DEFAULT NULL::integer,
  p_exclude_counselor uuid DEFAULT NULL::uuid
)
RETURNS TABLE(consultation_id uuid, new_counselor uuid)
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  r RECORD;
  v_uid uuid;
BEGIN
  FOR r IN
    SELECT id
    FROM public.consultations
    WHERE (
        (p_unassigned_only AND counselor_id IS NULL)
        OR (NOT p_unassigned_only AND p_target_counselor IS NOT NULL AND counselor_id = p_target_counselor)
        OR (NOT p_unassigned_only AND p_target_counselor IS NULL)
      )
      AND (p_status_id IS NULL OR status_id = p_status_id)
    ORDER BY created_at DESC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500)
  LOOP
    v_uid := public.pick_next_counselor_excluding(p_exclude_counselor);
    EXIT WHEN v_uid IS NULL;

    UPDATE public.consultations
    SET counselor_id = v_uid,
        assigned_at = now(),
        updated_at = now()
    WHERE id = r.id;

    consultation_id := r.id;
    new_counselor := v_uid;
    RETURN NEXT;
  END LOOP;
END;
$function$;
