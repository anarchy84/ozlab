-- =============================================================
-- Migration: 20260429000002
-- Phase A — 어드민 권한 시스템 (admin_users + 5개 role + RLS 헬퍼)
-- =============================================================
-- 목적 :
--   현재는 "Auth 로그인 = 모두 admin" 단순 구조 (1명 ourteam.kr@gmail.com).
--   광고 시작 후 다중 사용자(상담사·마케터·운영자·뷰어) 어드민이 들어올 때
--   역할별 권한이 분리되어야 안전.
--
-- 5개 역할 :
--   super_admin : 모든 권한 (대웅·CTO). db_statuses CRUD, 사용자 관리, 약관 편집
--   admin       : 운영 권한. 상담 데이터 read/write, 콘텐츠 발행, 블랙리스트 관리
--   counselor   : 본인 배정 상담만 read/write, 본인 성과 조회
--   marketer    : 분석 read-only + 광고비 입력 (Phase F 활성화) + 매체 관리
--   viewer      : read-only (보고용)
--
-- 적용 후 :
--   - db_statuses INSERT/UPDATE/DELETE 는 super_admin 만
--   - abuse_blocklist 쓰기는 admin 이상
--   - history/messages 쓰기는 모든 인증자 (시스템 자동 INSERT 위해)
--   - consultations RLS 본격 분리는 Phase A-2 (어드민 UI 와 함께) — 지금은 BC 위해 그대로
--
-- 의존성 :
--   - 20260429000001_admin_phase_a.sql 가 먼저 적용되어 있어야 함
-- =============================================================


-- =============================================================
-- 1) admin_users : 어드민 사용자 + 역할 매핑
-- =============================================================
-- auth.users 와 1:1 (Supabase Auth 가 만든 user 중 어드민으로 승격된 사람)
-- 별도 테이블로 두는 이유 :
--   - role 외에도 display_name, 부서, 메모 등 운영 메타 추가 여지
--   - is_active 로 일시 비활성화 가능 (퇴사·휴직)
--   - JWT custom claim 안 써도 됨 (Supabase 무료 plan 호환)

CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id        uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role           text        NOT NULL CHECK (role IN (
                                'super_admin',  -- 최고관리자
                                'admin',        -- 운영자
                                'counselor',    -- 상담사
                                'marketer',     -- 마케터
                                'viewer'        -- 뷰어
                              )),
  display_name   text        CHECK (display_name IS NULL OR length(display_name) <= 40),
  department     text        CHECK (department IS NULL OR length(department) <= 40),
  note           text        CHECK (note IS NULL OR length(note) <= 500),
  is_active      boolean     NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_users_role_idx
  ON public.admin_users (role)
  WHERE is_active = true;

DROP TRIGGER IF EXISTS admin_users_set_updated_at ON public.admin_users;
CREATE TRIGGER admin_users_set_updated_at
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE public.admin_users IS
  '어드민 사용자 마스터. auth.users 와 1:1. 5개 role 로 권한 분리.';
COMMENT ON COLUMN public.admin_users.role IS
  'super_admin > admin > counselor / marketer / viewer';


-- =============================================================
-- 2) RLS 헬퍼 함수 — 정책 안에서 짧게 사용
-- =============================================================
-- SECURITY DEFINER : auth.uid() 호출 시 권한 우회 필요
-- STABLE           : 같은 트랜잭션 내 캐시 가능 (성능)

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text AS $$
  SELECT role
  FROM public.admin_users
  WHERE user_id = auth.uid() AND is_active = true
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
  SELECT public.current_user_role() = 'super_admin';
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.is_admin_or_above()
RETURNS boolean AS $$
  SELECT public.current_user_role() IN ('super_admin', 'admin');
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.is_counselor()
RETURNS boolean AS $$
  SELECT public.current_user_role() = 'counselor';
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.is_marketer()
RETURNS boolean AS $$
  SELECT public.current_user_role() = 'marketer';
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.has_admin_access()
RETURNS boolean AS $$
  -- 어드민 영역 접근 가능 여부 (role 등록된 모든 활성 사용자)
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid() AND is_active = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.current_user_role() IS
  '현재 로그인 사용자의 role 반환. 등록 안된 사용자는 NULL.';
COMMENT ON FUNCTION public.has_admin_access() IS
  '어드민 영역 접근 가능 여부. admin_users 에 활성 등록된 사용자만 true.';


-- =============================================================
-- 3) admin_users 자체 RLS
-- =============================================================
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- super_admin 만 모든 admin_users 관리 (다른 사용자 추가/삭제/role 변경)
DROP POLICY IF EXISTS admin_users_super_all ON public.admin_users;
CREATE POLICY admin_users_super_all
  ON public.admin_users
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- 본인 정보는 누구나 본인 것만 SELECT 가능 (어드민 화면에 본인 이름·role 표시용)
DROP POLICY IF EXISTS admin_users_select_self ON public.admin_users;
CREATE POLICY admin_users_select_self
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());


-- =============================================================
-- 4) 기존 db_statuses RLS 강화 — INSERT/UPDATE/DELETE 는 super_admin 만
-- =============================================================
-- 대웅 결정 (2026-04-29) : "어드민에서 수퍼관리자가 수정·삭제·추가할 수 있어야"
-- → SELECT 는 모두 / 쓰기는 super_admin 만

DROP POLICY IF EXISTS db_statuses_write_admin ON public.db_statuses;
CREATE POLICY db_statuses_write_super
  ON public.db_statuses
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS db_statuses_update_super ON public.db_statuses;
CREATE POLICY db_statuses_update_super
  ON public.db_statuses
  FOR UPDATE
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS db_statuses_delete_super ON public.db_statuses;
CREATE POLICY db_statuses_delete_super
  ON public.db_statuses
  FOR DELETE
  TO authenticated
  USING (public.is_super_admin());


-- =============================================================
-- 5) abuse_blocklist 쓰기 권한 — admin 이상만
-- =============================================================
-- 차단·해제는 운영 결정이라 admin 이상 필요. SELECT 는 anon 도 가능 (API 차단 체크)

DROP POLICY IF EXISTS abuse_write_admin ON public.abuse_blocklist;
CREATE POLICY abuse_write_admin_only
  ON public.abuse_blocklist
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_above());

DROP POLICY IF EXISTS abuse_update_admin ON public.abuse_blocklist;
CREATE POLICY abuse_update_admin_only
  ON public.abuse_blocklist
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_above())
  WITH CHECK (public.is_admin_or_above());

DROP POLICY IF EXISTS abuse_delete_admin ON public.abuse_blocklist;
CREATE POLICY abuse_delete_admin_only
  ON public.abuse_blocklist
  FOR DELETE
  TO authenticated
  USING (public.is_admin_or_above());


-- =============================================================
-- 6) consultations RLS — 점진 분리 (Phase A 단계)
-- =============================================================
-- 현재 정책 : authenticated 모두 SELECT/UPDATE 가능 (단순)
-- Phase A 변경 : has_admin_access() 통과한 사람만 (등록된 어드민만 진입)
--                → 단, 아직 role 별 세부 분리는 안 함 (Phase A-2 어드민 UI 와 함께)
-- Phase A-2 변경 예정 :
--   counselor : counselor_id = auth.uid() 인 행만
--   admin/super_admin : 모두
--   marketer/viewer : SELECT 만 (개인정보 마스킹은 view layer)

DROP POLICY IF EXISTS consultations_select_admin ON public.consultations;
CREATE POLICY consultations_select_admin
  ON public.consultations
  FOR SELECT
  TO authenticated
  USING (public.has_admin_access());

DROP POLICY IF EXISTS consultations_update_admin ON public.consultations;
CREATE POLICY consultations_update_admin
  ON public.consultations
  FOR UPDATE
  TO authenticated
  USING (public.has_admin_access())
  WITH CHECK (public.has_admin_access());

-- INSERT 는 그대로 anon + authenticated (폼 제출용, consent_privacy = true 필수)


-- =============================================================
-- 7) consultation_status_history / messages RLS — admin_access 만
-- =============================================================

DROP POLICY IF EXISTS csh_admin_all ON public.consultation_status_history;
CREATE POLICY csh_admin_access
  ON public.consultation_status_history
  FOR ALL
  TO authenticated
  USING (public.has_admin_access())
  WITH CHECK (public.has_admin_access());

DROP POLICY IF EXISTS cm_admin_all ON public.consultation_messages;
CREATE POLICY cm_admin_access
  ON public.consultation_messages
  FOR ALL
  TO authenticated
  USING (public.has_admin_access())
  WITH CHECK (public.has_admin_access());


-- =============================================================
-- 8) 기존 ourteam.kr@gmail.com 자동 super_admin 시딩
-- =============================================================
-- HANDOFF.md 에 명시된 어드민 계정 (현재 1명) 을 super_admin 으로 등록.
-- auth.users 에 해당 이메일이 있어야 INSERT 됨 (없으면 skip).

INSERT INTO public.admin_users (user_id, role, display_name, department, note)
SELECT
  id,
  'super_admin',
  '대웅 (마스터)',
  '경영',
  '오즈랩페이 최초 어드민 — 자동 시딩 (2026-04-29 마이그레이션)'
FROM auth.users
WHERE email = 'ourteam.kr@gmail.com'
ON CONFLICT (user_id) DO UPDATE
  SET role = 'super_admin',
      is_active = true;


-- =============================================================
-- 9) 어드민 로그인 게이트용 RPC (옵션)
-- =============================================================
-- 클라이언트가 한 번 호출해서 본인 권한 받아갈 때 사용.
-- AdminGuardProvider 에서 supabase.rpc('get_my_admin_profile') 로 호출.

CREATE OR REPLACE FUNCTION public.get_my_admin_profile()
RETURNS TABLE (
  user_id      uuid,
  email        text,
  role         text,
  display_name text,
  is_active    boolean
) AS $$
  SELECT
    au.user_id,
    u.email,
    au.role,
    au.display_name,
    au.is_active
  FROM public.admin_users au
  JOIN auth.users u ON au.user_id = u.id
  WHERE au.user_id = auth.uid()
    AND au.is_active = true
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_my_admin_profile() TO authenticated;

COMMENT ON FUNCTION public.get_my_admin_profile() IS
  '현재 로그인 사용자의 admin 프로필 반환. 어드민 진입 게이트 + 헤더 표시용.';


-- =============================================================
-- ROLLBACK (역순)
-- =============================================================
-- DROP FUNCTION IF EXISTS public.get_my_admin_profile();
--
-- DELETE FROM public.admin_users WHERE role = 'super_admin' AND display_name = '대웅 (마스터)';
--
-- DROP POLICY IF EXISTS cm_admin_access            ON public.consultation_messages;
-- DROP POLICY IF EXISTS csh_admin_access           ON public.consultation_status_history;
-- DROP POLICY IF EXISTS consultations_update_admin ON public.consultations;
-- DROP POLICY IF EXISTS consultations_select_admin ON public.consultations;
-- DROP POLICY IF EXISTS abuse_delete_admin_only    ON public.abuse_blocklist;
-- DROP POLICY IF EXISTS abuse_update_admin_only    ON public.abuse_blocklist;
-- DROP POLICY IF EXISTS abuse_write_admin_only     ON public.abuse_blocklist;
-- DROP POLICY IF EXISTS db_statuses_delete_super   ON public.db_statuses;
-- DROP POLICY IF EXISTS db_statuses_update_super   ON public.db_statuses;
-- DROP POLICY IF EXISTS db_statuses_write_super    ON public.db_statuses;
-- DROP POLICY IF EXISTS admin_users_select_self    ON public.admin_users;
-- DROP POLICY IF EXISTS admin_users_super_all      ON public.admin_users;
--
-- DROP FUNCTION IF EXISTS public.has_admin_access();
-- DROP FUNCTION IF EXISTS public.is_marketer();
-- DROP FUNCTION IF EXISTS public.is_counselor();
-- DROP FUNCTION IF EXISTS public.is_admin_or_above();
-- DROP FUNCTION IF EXISTS public.is_super_admin();
-- DROP FUNCTION IF EXISTS public.current_user_role();
--
-- DROP TRIGGER IF EXISTS admin_users_set_updated_at ON public.admin_users;
-- DROP TABLE IF EXISTS public.admin_users;
--
-- 주의 : 이 마이그레이션 롤백 시 consultations RLS 가 has_admin_access() 함수 제거로 깨짐.
--        롤백 전에 consultations RLS 를 원래 정책 (authenticated USING true) 으로 복원 필수.
