-- =============================================================
-- Migration: 20260428000001
-- Phase 6 — 상담 신청 파이프라인 : consultations 테이블
-- =============================================================
-- 목적 :
--   /#apply 폼에서 들어오는 상담 신청을 저장하고
--   어드민(/admin/consultations)에서 처리 상태를 관리.
--
-- 원칙 :
--   - 익명 사용자(anon)는 INSERT 만 허용 (폼 제출용)
--   - 어드민(authenticated) 만 SELECT / UPDATE 가능
--   - 삭제는 SQL 콘솔에서만 (실수로 데이터 날리는 사고 방지)
--   - UTM·IP·User-Agent 같은 메타 정보를 같이 저장해서 P3 어트리뷰션 분석 여지 확보
-- =============================================================

-- -------------------------------------------------------------
-- 1) consultations : 상담 신청 본체
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.consultations (
  -- 기본 키 + 시간 메타
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL    DEFAULT now(),
  updated_at      timestamptz NOT NULL    DEFAULT now(),

  -- 사용자 입력 — 필수
  name            text        NOT NULL    CHECK (length(trim(name)) BETWEEN 1 AND 60),
  phone           text        NOT NULL    CHECK (length(trim(phone)) BETWEEN 7 AND 30),
  consent_privacy boolean     NOT NULL    DEFAULT false,

  -- 사용자 입력 — 선택
  store_name      text                    CHECK (store_name IS NULL OR length(store_name) <= 80),
  industry        text                    CHECK (industry IS NULL OR length(industry) <= 40),
  region          text                    CHECK (region IS NULL OR length(region) <= 40),
  message         text                    CHECK (message IS NULL OR length(message) <= 2000),

  -- 처리 상태 (어드민이 변경)
  -- new      : 신규 (기본)
  -- contacted: 연락중 (담당자가 전화·이메일 보냄)
  -- done     : 완료 (계약·해지 등 종결)
  -- rejected : 반려 (스팸·무관 신청)
  status          text        NOT NULL    DEFAULT 'new'
                              CHECK (status IN ('new','contacted','done','rejected')),
  assignee_note   text                    CHECK (assignee_note IS NULL OR length(assignee_note) <= 2000),
  contacted_at    timestamptz,
  done_at         timestamptz,

  -- 어트리뷰션 메타 (P3 데이터 분석 여지 확보)
  ip_address      inet,
  user_agent      text,
  referer         text,
  utm_source      text,
  utm_medium      text,
  utm_campaign    text,
  utm_term        text,
  utm_content     text
);

-- 인덱스 — 어드민 목록에서 자주 쓰는 정렬·필터
CREATE INDEX IF NOT EXISTS consultations_created_at_desc_idx
  ON public.consultations (created_at DESC);
CREATE INDEX IF NOT EXISTS consultations_status_idx
  ON public.consultations (status);
CREATE INDEX IF NOT EXISTS consultations_phone_idx
  ON public.consultations (phone);

-- updated_at 자동 갱신 (set_updated_at 함수는 content_blocks 마이그레이션에서 선언)
DROP TRIGGER IF EXISTS consultations_set_updated_at ON public.consultations;
CREATE TRIGGER consultations_set_updated_at
  BEFORE UPDATE ON public.consultations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE public.consultations IS
  '오즈랩페이 랜딩 /#apply 폼에서 수집된 상담 신청. 어드민이 status로 처리 상태 관리.';

-- -------------------------------------------------------------
-- 2) RLS : 익명은 INSERT 만, 어드민(authenticated) 만 READ/UPDATE
-- -------------------------------------------------------------
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

-- 2-1) anon + authenticated : INSERT 허용 (폼 제출용)
--      consent_privacy = true 인 경우만 통과 (개인정보 동의 강제)
DROP POLICY IF EXISTS consultations_insert_public ON public.consultations;
CREATE POLICY consultations_insert_public
  ON public.consultations
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (consent_privacy = true);

-- 2-2) authenticated : 모든 행 SELECT 가능 (어드민 목록)
DROP POLICY IF EXISTS consultations_select_admin ON public.consultations;
CREATE POLICY consultations_select_admin
  ON public.consultations
  FOR SELECT
  TO authenticated
  USING (true);

-- 2-3) authenticated : UPDATE 가능 (status / assignee_note / contacted_at / done_at)
--      USING + WITH CHECK 둘 다 명시 (베스트 프랙티스)
DROP POLICY IF EXISTS consultations_update_admin ON public.consultations;
CREATE POLICY consultations_update_admin
  ON public.consultations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 2-4) DELETE 정책 없음 → SQL 콘솔에서만 삭제 가능 (사고 방지)
