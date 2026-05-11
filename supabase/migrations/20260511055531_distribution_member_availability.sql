-- =============================================================
-- Distribution member availability
-- =============================================================
-- 담당자별로 자동분배 대상 여부를 제어한다.
-- - distribution_enabled = false: 수동으로 분배 제외
-- - distribution_paused_until > now(): 휴가/부재 등 기간성 제외
-- - pick_next_counselor()는 이 조건을 실제 라운드로빈 후보에서 제외한다.

ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS distribution_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS distribution_pause_reason text
    CHECK (
      distribution_pause_reason IS NULL
      OR distribution_pause_reason IN ('manual', 'leave', 'busy', 'other')
    ),
  ADD COLUMN IF NOT EXISTS distribution_paused_until timestamptz,
  ADD COLUMN IF NOT EXISTS distribution_note text
    CHECK (distribution_note IS NULL OR length(distribution_note) <= 500);

CREATE INDEX IF NOT EXISTS admin_users_distribution_available_idx
  ON public.admin_users (role, distribution_enabled, distribution_paused_until)
  WHERE is_active = true;

COMMENT ON COLUMN public.admin_users.distribution_enabled IS
  '자동 DB 분배 대상 여부. false면 pick_next_counselor 후보에서 제외된다.';
COMMENT ON COLUMN public.admin_users.distribution_pause_reason IS
  '분배 제외 사유: manual, leave, busy, other.';
COMMENT ON COLUMN public.admin_users.distribution_paused_until IS
  '이 시각까지 자동 분배 후보에서 제외. NULL이면 기간 제한 없음.';
COMMENT ON COLUMN public.admin_users.distribution_note IS
  '분배 제외/연차/부재 관련 관리자 메모.';

CREATE OR REPLACE FUNCTION public.pick_next_counselor()
RETURNS uuid
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_rule       distribution_rules%ROWTYPE;
  v_next_uid   uuid;
BEGIN
  SELECT * INTO v_rule FROM distribution_rules WHERE id = 1;

  IF NOT FOUND OR NOT v_rule.is_enabled OR v_rule.mode != 'round_robin' THEN
    RETURN NULL;
  END IF;

  WITH eligible AS (
    SELECT user_id, COALESCE(display_name, user_id::text) AS name
    FROM admin_users
    WHERE is_active = true
      AND role = ANY(v_rule.eligible_roles)
      AND distribution_enabled = true
      AND (
        distribution_paused_until IS NULL
        OR distribution_paused_until <= now()
      )
    ORDER BY name
  ),
  with_idx AS (
    SELECT user_id, ROW_NUMBER() OVER () AS rn
    FROM eligible
  ),
  last_idx AS (
    SELECT rn FROM with_idx WHERE user_id = v_rule.last_assigned
  )
  SELECT user_id INTO v_next_uid
  FROM with_idx
  WHERE rn = COALESCE((SELECT rn FROM last_idx), 0) + 1
  LIMIT 1;

  IF v_next_uid IS NULL THEN
    SELECT user_id INTO v_next_uid
    FROM eligible
    ORDER BY name
    LIMIT 1;
  END IF;

  IF v_next_uid IS NOT NULL THEN
    UPDATE distribution_rules
    SET last_assigned = v_next_uid,
        updated_at = now()
    WHERE id = 1;
  END IF;

  RETURN v_next_uid;
END;
$function$;
