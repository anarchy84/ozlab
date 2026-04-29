-- =============================================================
-- Migration: 20260429000004
-- Phase A — 기존 status (text) CHECK 제약 풀기 (BC)
-- =============================================================
-- 배경 :
--   기존 consultations.status 는 'new/contacted/done/rejected' 4개만 허용.
--   Phase A 에서 db_statuses 마스터로 8개 + 동적 추가 가능하게 됐는데
--   기존 status 컬럼이 여전히 4개만 받아서 신규 코드 INSERT/UPDATE 거절.
--
-- 처리 :
--   - 기존 CHECK 제거
--   - 신규 CHECK : db_statuses.code 와 동일한 값만 허용 (느슨한 형태)
--   - 또는 그냥 free-text 허용 (status_id 가 진짜 마스터)
--
-- 결정 : free-text 허용 (status_id 가 source of truth, status 는 deprecated 메모용)
-- =============================================================

ALTER TABLE public.consultations
  DROP CONSTRAINT IF EXISTS consultations_status_check;

-- 신규 CHECK : 길이만 검증 (값은 자유)
ALTER TABLE public.consultations
  ADD CONSTRAINT consultations_status_check
  CHECK (status IS NULL OR length(status) BETWEEN 1 AND 40);

COMMENT ON COLUMN public.consultations.status IS
  'Deprecated. status_id (FK) 가 source of truth. 신규 코드는 status_id 사용.';

-- =============================================================
-- ROLLBACK
-- =============================================================
-- ALTER TABLE public.consultations DROP CONSTRAINT IF EXISTS consultations_status_check;
-- ALTER TABLE public.consultations
--   ADD CONSTRAINT consultations_status_check
--   CHECK (status IN ('new','contacted','done','rejected'));
