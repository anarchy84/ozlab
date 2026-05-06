-- =============================================================
-- Migration: 20260504000001
-- Phase 2B — CTA 폼 빌더 (cta_type + form_fields + trigger/display)
-- =============================================================
-- 목적 :
--   기존 cta_buttons 는 placement(어디) × style(외관) 만 관리.
--   여기에 cta_type(어떻게 노출), form_fields(무엇을 받을지),
--   trigger_config(언제 띄울지), display_config(어떻게 꾸밀지) 추가.
--
--   동시에 consultations.custom_fields 추가 →
--   CTA 별로 다른 필드 정의 시 표준 컬럼 외 답변을 jsonb 로 저장.
--
-- BC 보장 :
--   - 모든 신규 컬럼 nullable, default 정의
--   - cta_type 기본값 = 'inline_anchor' (기존 #apply 스크롤 동작 유지)
--   - 기존 cta_buttons 6개 row 영향 없음
-- =============================================================

-- ─────────────────────────────────────────────
-- 1) cta_buttons 컬럼 추가
-- ─────────────────────────────────────────────

ALTER TABLE public.cta_buttons
  ADD COLUMN IF NOT EXISTS cta_type        text        NOT NULL DEFAULT 'inline_anchor'
    CHECK (cta_type IN (
      'inline_anchor',     -- 기존: a 태그, #apply 로 스크롤
      'inline_form',       -- 인라인 폼 (현재 ApplyForm 자리에 동적 폼)
      'modal_form',        -- 클릭 시 모달 폼
      'floating_button',   -- 우하단 떠다니는 둥근 버튼 → 클릭 시 모달
      'sticky_bar',        -- 상단/하단 고정 띠
      'toast'              -- 우하단 슬라이드인 카드 (스크롤/시간 트리거)
    )),

  -- 폼 필드 정의 (cta_type 이 *_form / modal/toast/floating 일 때 사용)
  -- 예: [
  --   { id:"name",  label:"이름",   type:"text",  required:true },
  --   { id:"phone", label:"연락처", type:"phone", required:true },
  --   { id:"store", label:"매장명", type:"text" },
  --   { id:"industry", label:"업종", type:"select",
  --     options:["요식","뷰티","의료","기타"] }
  -- ]
  ADD COLUMN IF NOT EXISTS form_fields     jsonb       NOT NULL DEFAULT '[]'::jsonb,

  -- 트리거 설정 — 언제 띄울지 (sticky_bar / toast / modal / floating 에서 의미)
  -- 예: { type:"scroll_pct", value:50 }
  --     { type:"time_sec",   value:30 }
  --     { type:"exit_intent" }
  --     { type:"immediate" }
  ADD COLUMN IF NOT EXISTS trigger_config  jsonb       NOT NULL DEFAULT '{"type":"immediate"}'::jsonb,

  -- 디자인 설정 — 제목/설명/색상/위치
  -- 예: { title:"3분만에 무료 견적", description:"...",
  --       button_color:"#17e06d", bg_color:"#0a0a0a",
  --       position:"bottom-right", show_close:true }
  ADD COLUMN IF NOT EXISTS display_config  jsonb       NOT NULL DEFAULT '{}'::jsonb,

  -- 노출 페이지 — 어느 경로에 띄울지 (NULL = 모든 페이지)
  -- 예: ['/', '/blog', '/blog/*']
  ADD COLUMN IF NOT EXISTS page_paths      text[]      DEFAULT NULL;


COMMENT ON COLUMN public.cta_buttons.cta_type IS
  'CTA 노출 방식 — inline_anchor(기본·스크롤) / inline_form / modal_form / floating_button / sticky_bar / toast';

COMMENT ON COLUMN public.cta_buttons.form_fields IS
  'jsonb 배열. 각 원소: { id, label, type, required, options?, placeholder?, mask? }. type ∈ text|phone|email|textarea|select|checkbox';

COMMENT ON COLUMN public.cta_buttons.trigger_config IS
  'jsonb. { type: immediate|scroll_pct|time_sec|exit_intent, value?: number }. floating/sticky/toast/modal 에서만 의미.';

COMMENT ON COLUMN public.cta_buttons.display_config IS
  'jsonb. { title, description, button_color, bg_color, position, show_close }. 모달·토스트·플로팅 디자인 오버라이드.';

COMMENT ON COLUMN public.cta_buttons.page_paths IS
  '노출 경로 배열. NULL = 모든 페이지. ''*'' 와일드카드 지원 (예: /blog/*).';


-- ─────────────────────────────────────────────
-- 2) consultations.custom_fields — CTA 별 추가 입력
-- ─────────────────────────────────────────────

ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.consultations.custom_fields IS
  'CTA 폼 빌더로 추가된 비표준 필드 답변. 키 = field.id, 값 = 사용자 입력.';

-- 인덱스 — custom_fields 키 검색 (필요 시 GIN)
CREATE INDEX IF NOT EXISTS consultations_custom_fields_gin
  ON public.consultations USING gin (custom_fields jsonb_path_ops);


-- ─────────────────────────────────────────────
-- 3) 기본 폼 필드 시드 — 기존 ApplyForm 6 필드 동등
-- ─────────────────────────────────────────────
-- inline_anchor 타입은 form_fields 무시되므로 변경 없음.
-- 단, 어드민에서 새 CTA 만들 때 참조하는 default 시드를 함수로 제공.

CREATE OR REPLACE FUNCTION public.cta_default_form_fields()
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT jsonb_build_array(
    jsonb_build_object(
      'id', 'name', 'label', '사장님 성함', 'type', 'text',
      'required', true, 'placeholder', '홍길동'
    ),
    jsonb_build_object(
      'id', 'phone', 'label', '연락처', 'type', 'phone',
      'required', true, 'placeholder', '010-0000-0000'
    ),
    jsonb_build_object(
      'id', 'store_name', 'label', '매장명', 'type', 'text',
      'required', false, 'placeholder', '매장 상호명'
    ),
    jsonb_build_object(
      'id', 'industry', 'label', '업종', 'type', 'select',
      'required', false,
      'options', jsonb_build_array('음식점·카페','소매·판매','서비스·뷰티','기타')
    ),
    jsonb_build_object(
      'id', 'region', 'label', '지역', 'type', 'select',
      'required', false,
      'options', jsonb_build_array('서울','경기·인천','부산·경남','대구·경북',
                                    '광주·전라','대전·충청','강원','제주')
    ),
    jsonb_build_object(
      'id', 'message', 'label', '원하시는 구성 / 남기실 말씀',
      'type', 'textarea', 'required', false,
      'placeholder', '예) 10.1인치 POS 세트 견적 궁금합니다'
    )
  );
$$;

COMMENT ON FUNCTION public.cta_default_form_fields() IS
  '어드민에서 새 CTA 폼 만들 때 시드로 쓰는 기본 6필드 (현재 ApplyForm 동등).';

-- 함수 search_path 고정 (security advisor 통과)
ALTER FUNCTION public.cta_default_form_fields() SET search_path = public, pg_temp;


-- =============================================================
-- ROLLBACK
-- =============================================================
-- ALTER TABLE public.cta_buttons
--   DROP COLUMN IF EXISTS page_paths,
--   DROP COLUMN IF EXISTS display_config,
--   DROP COLUMN IF EXISTS trigger_config,
--   DROP COLUMN IF EXISTS form_fields,
--   DROP COLUMN IF EXISTS cta_type;
-- DROP INDEX IF EXISTS public.consultations_custom_fields_gin;
-- ALTER TABLE public.consultations DROP COLUMN IF EXISTS custom_fields;
-- DROP FUNCTION IF EXISTS public.cta_default_form_fields();
