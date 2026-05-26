-- =============================================================
-- Migration: 20260526080000_consultation_field_options
-- 상담 입력 필드(업종/지역/단말기/약정/통화시간) 옵션 마스터 테이블
-- =============================================================
-- 배경 :
--   기존에는 INDUSTRY_OPTIONS / REGION_OPTIONS 를 lib/consultation-options.ts 에 하드코딩.
--   단말기·약정·통화가능시간은 자유 텍스트(CustomerInput) 라 신입사원이 입력값 표준화 불가.
--
-- 목적 :
--   - 5개 필드 옵션을 DB 로 일원화 → 어드민 설정 페이지에서 직접 편집 가능
--   - 신입사원 친화 : 옵션이 곧 드롭다운 리스트
--   - SaaS 멀티테넌트 확장 대비 : 추후 tenant_id 컬럼 추가로 확장 가능 (현재는 단일 테넌트라 미포함)
--
-- 사용처 :
--   - 어드민 상담 상세 모달 ( ConsultationDetailModal )
--   - 랜딩 신청서 ( ApplyForm )
--   - CTA 위자드 ( CtaWizardModal )
--
-- 직접입력 폴백 :
--   옵션 외 값도 consultations 컬럼에 저장 가능 (자유 텍스트 그대로).
--   이 테이블은 "추천 옵션 리스트"일 뿐, 강제 FK 아님.
-- =============================================================


-- =============================================================
-- 1) consultation_field_options : 옵션 마스터
-- =============================================================
CREATE TABLE IF NOT EXISTS public.consultation_field_options (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  field_key    text        NOT NULL CHECK (field_key IN (
                              'industry',         -- 업종
                              'region',           -- 지역
                              'device_type',      -- 단말기
                              'contract_period',  -- 약정
                              'callable_time'     -- 통화가능시간
                            )),
  value        text        NOT NULL CHECK (length(value) BETWEEN 1 AND 80),
  sort_order   integer     NOT NULL DEFAULT 0,
  is_active    boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- 같은 필드 안에서 동일 값 중복 방지 (대소문자·공백 정규화)
CREATE UNIQUE INDEX IF NOT EXISTS consultation_field_options_unique_value
  ON public.consultation_field_options (field_key, lower(regexp_replace(value, '\s+', '', 'g')));

-- 조회 인덱스 : 활성 옵션을 순서대로 가져오기
CREATE INDEX IF NOT EXISTS consultation_field_options_lookup
  ON public.consultation_field_options (field_key, sort_order)
  WHERE is_active = true;

DROP TRIGGER IF EXISTS consultation_field_options_set_updated_at
  ON public.consultation_field_options;
CREATE TRIGGER consultation_field_options_set_updated_at
  BEFORE UPDATE ON public.consultation_field_options
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE public.consultation_field_options IS
  '상담 입력 필드 5종(업종/지역/단말기/약정/통화시간) 드롭다운 옵션 마스터';
COMMENT ON COLUMN public.consultation_field_options.field_key IS
  'industry / region / device_type / contract_period / callable_time';
COMMENT ON COLUMN public.consultation_field_options.value IS
  '드롭다운에 표시되는 라벨이자 consultations 컬럼에 저장되는 값';
COMMENT ON COLUMN public.consultation_field_options.sort_order IS
  '드롭다운 표시 순서 (오름차순)';
COMMENT ON COLUMN public.consultation_field_options.is_active IS
  'false = 신규 입력 불가하지만 과거 데이터에는 그대로 남아있음 (soft hide)';


-- =============================================================
-- 2) RLS — 읽기는 모두 / 쓰기는 admin 이상
-- =============================================================
-- 랜딩 신청서가 익명 상태에서 옵션 리스트를 fetch 하므로 read 는 공개 가능해야 함.
-- 단, 비활성(is_active=false) 옵션은 익명에게 노출 안 함 (어드민만 볼 수 있음).

ALTER TABLE public.consultation_field_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS consultation_field_options_anon_read
  ON public.consultation_field_options;
CREATE POLICY consultation_field_options_anon_read
  ON public.consultation_field_options
  FOR SELECT
  TO anon
  USING (is_active = true);

DROP POLICY IF EXISTS consultation_field_options_authed_read
  ON public.consultation_field_options;
CREATE POLICY consultation_field_options_authed_read
  ON public.consultation_field_options
  FOR SELECT
  TO authenticated
  USING (true);  -- 어드민은 비활성 옵션도 보여야 편집 가능

DROP POLICY IF EXISTS consultation_field_options_admin_insert
  ON public.consultation_field_options;
CREATE POLICY consultation_field_options_admin_insert
  ON public.consultation_field_options
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_above());

DROP POLICY IF EXISTS consultation_field_options_admin_update
  ON public.consultation_field_options;
CREATE POLICY consultation_field_options_admin_update
  ON public.consultation_field_options
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_above())
  WITH CHECK (public.is_admin_or_above());

DROP POLICY IF EXISTS consultation_field_options_admin_delete
  ON public.consultation_field_options;
CREATE POLICY consultation_field_options_admin_delete
  ON public.consultation_field_options
  FOR DELETE
  TO authenticated
  USING (public.is_admin_or_above());


-- =============================================================
-- 3) 시드 데이터 — 기존 하드코딩 옵션 이전
-- =============================================================
-- 업종 4개 + 지역 8개 = 12개
-- 단말기·약정·통화시간은 비워둠 (사용자 의사결정 : 어드민에서 직접 추가)
-- ON CONFLICT 로 재실행 안전

INSERT INTO public.consultation_field_options (field_key, value, sort_order, is_active)
VALUES
  -- 업종 (industry)
  ('industry', '음식점 · 카페', 10, true),
  ('industry', '소매 · 판매',   20, true),
  ('industry', '서비스 · 뷰티', 30, true),
  ('industry', '기타',          40, true),

  -- 지역 (region)
  ('region', '서울',     10, true),
  ('region', '경기·인천', 20, true),
  ('region', '부산·경남', 30, true),
  ('region', '대구·경북', 40, true),
  ('region', '광주·전라', 50, true),
  ('region', '대전·충청', 60, true),
  ('region', '강원',     70, true),
  ('region', '제주',     80, true)
ON CONFLICT (field_key, lower(regexp_replace(value, '\s+', '', 'g'))) DO NOTHING;


-- =============================================================
-- 4) 권한 — anon/authenticated 에 명시적 GRANT
-- =============================================================
GRANT SELECT ON public.consultation_field_options TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultation_field_options TO authenticated;

-- END --
