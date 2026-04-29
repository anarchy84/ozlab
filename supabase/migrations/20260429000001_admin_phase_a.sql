-- =============================================================
-- Migration: 20260429000001
-- Phase A — 어드민 CRM 코어 토대 (DB 스키마 확장)
-- =============================================================
-- 목적 :
--   광고 트래픽 받기 전, 어드민이 신청 데이터를 제대로 처리할 수 있게
--   상태 관리 / 이력 / 어뷰징 방어 / 분석 기반을 한 번에 깐다.
--
-- 배경 :
--   기존 consultations 의 status 컬럼은 하드코딩된 4개 enum (new/contacted/done/rejected).
--   대웅 사내 CRM PRO 벤치마크 결과 — 상태값을 DB 테이블로 관리하고
--   각 상태에 자동화 플래그(메시지발송/가망/재통화/전환 등)를 붙이는 패턴이 검증됨.
--   광고 운영하면서 상태값·룰을 코드 배포 없이 수정하려면 이 구조 필수.
--
-- 원칙 :
--   - 기존 consultations.status (text) 는 deprecation 예정이지만 유지 (BC)
--   - 신규 status_id (FK to db_statuses) 를 추가
--   - 기존 4개 status 값은 db_statuses 에 시딩 + 매핑
--   - 상태 변경 / 메시지 발송 / 차단 이력은 별도 1:N 테이블
--   - DELETE 정책 없음 (기존 컨벤션 유지, 사고 방지)
--   - RLS USING + WITH CHECK 둘 다 명시
--
-- 적용 절차 :
--   1) Supabase staging 프로젝트에 먼저 적용
--   2) 검증 (기존 consultations INSERT/SELECT 영향 없는지)
--   3) prod 적용 + lib/supabase 타입 재생성
-- =============================================================


-- =============================================================
-- 1) db_statuses : 상담 상태 마스터 (어드민에서 동적 관리)
-- =============================================================
-- CRM PRO 의 13개 자동화 플래그 패턴을 그대로 차용.
-- 각 플래그는 상태 변경 시 트리거되는 후속 동작을 정의한다.

CREATE TABLE IF NOT EXISTS public.db_statuses (
  id              serial      PRIMARY KEY,
  sort_order      int         NOT NULL DEFAULT 0,            -- 어드민 화면 노출 순서
  code            text        NOT NULL UNIQUE,               -- 영문 키 'new', 'consulting' 등 (기존 status 호환)
  label           text        NOT NULL,                      -- 한글 표시명
  bg_color        text        NOT NULL DEFAULT '#E5E7EB',    -- 배경색 (#RGB or #RRGGBB)
  text_color      text        NOT NULL DEFAULT '#111827',    -- 텍스트색

  -- 자동화 플래그 (CRM PRO 13개 패턴)
  send_message            boolean NOT NULL DEFAULT false,    -- 이 상태로 변경 시 알림톡 자동 발송
  is_promising            boolean NOT NULL DEFAULT false,    -- "가망 고객" 자동 분류 (대시보드 KPI)
  force_recall            boolean NOT NULL DEFAULT false,    -- 재통화 큐 자동 등록 + 일정 입력 강제
  is_conversion           boolean NOT NULL DEFAULT false,    -- 개통/매출 카운트 대상 (ROAS 계산)
  is_unapproved           boolean NOT NULL DEFAULT false,    -- 미승인 (허수율 카운트)
  needs_counselor_confirm boolean NOT NULL DEFAULT false,    -- 상담원 확인 필요
  in_progress             boolean NOT NULL DEFAULT false,    -- 개통진행중 (별도 KPI 카드)
  cannot_proceed          boolean NOT NULL DEFAULT false,    -- 개통불가
  include_in_gcl          boolean NOT NULL DEFAULT false,    -- 외부 데이터 추출 대상
  show_in_dashboard       boolean NOT NULL DEFAULT true,     -- 대시보드 KPI 카드 노출

  -- 알림톡 템플릿 매핑 (Phase B에서 alimtalk_templates 테이블 추가 후 FK 활성화)
  message_template_code   text,                              -- 'WELCOME', 'CONSULT_BOOKED' 등

  -- 메타
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CHECK (length(code) BETWEEN 1 AND 40),
  CHECK (length(label) BETWEEN 1 AND 40)
);

CREATE INDEX IF NOT EXISTS db_statuses_sort_idx ON public.db_statuses (sort_order);
CREATE INDEX IF NOT EXISTS db_statuses_active_idx ON public.db_statuses (is_active) WHERE is_active = true;

DROP TRIGGER IF EXISTS db_statuses_set_updated_at ON public.db_statuses;
CREATE TRIGGER db_statuses_set_updated_at
  BEFORE UPDATE ON public.db_statuses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE public.db_statuses IS
  '상담 상태 마스터 — 어드민에서 동적으로 추가/수정. 각 상태에 자동화 플래그 매핑.';
COMMENT ON COLUMN public.db_statuses.send_message IS
  'true 시 상태 변경 트리거로 알림톡 자동 발송 (Phase B에서 활성화)';


-- =============================================================
-- 2) 기본 상태 8개 시딩 (CRM PRO 38개 중 핵심만 골라서)
-- =============================================================
-- 기존 consultations.status 값(new/contacted/done/rejected)도 호환되게 같은 code 유지.
-- 추가 4개(consulting, promising, no_answer, recall)는 신규.

INSERT INTO public.db_statuses (code, label, sort_order, bg_color, text_color,
                                 send_message, is_promising, force_recall, is_conversion,
                                 is_unapproved, in_progress, show_in_dashboard, message_template_code)
VALUES
  ('new',         '신규',       10, '#3B82F6', '#FFFFFF',
   false, false, false, false, false, false, true, NULL),
  ('contacted',   '연락중',     20, '#F59E0B', '#FFFFFF',
   false, false, false, false, false, true,  true, NULL),
  ('consulting',  '상담중',     30, '#FACC15', '#111827',
   false, false, false, false, false, true,  true, NULL),
  ('promising',   '가망',       40, '#10B981', '#FFFFFF',
   false, true,  false, false, false, true,  true, NULL),
  ('no_answer',   '부재',       50, '#FBBF24', '#111827',
   false, false, true,  false, false, false, false, NULL),
  ('recall',      '재통화 대기',55, '#FB923C', '#FFFFFF',
   false, true,  true,  false, false, false, true, NULL),
  ('done',        '개통 완료',  60, '#EC4899', '#FFFFFF',
   true,  false, false, true,  false, false, true, 'CONVERSION_THANKS'),
  ('rejected',    '미승인/허수',70, '#9CA3AF', '#FFFFFF',
   false, false, false, false, true,  false, false, NULL)
ON CONFLICT (code) DO NOTHING;


-- =============================================================
-- 3) consultations 확장 — 신규 컬럼 추가
-- =============================================================
-- 기존 status (text) 는 BC 위해 유지. status_id (FK) 를 추가하고 점진 마이그레이션.

ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS status_id          int  REFERENCES public.db_statuses(id),
  ADD COLUMN IF NOT EXISTS db_group_label     text,                                  -- 캠페인/배치 라벨 ('141. 페이스북 리드폼_토스' 같은 자유 라벨)
  ADD COLUMN IF NOT EXISTS internal_memo      text,                                  -- 내부 운영 메모 (사용자 message와 별도)
  ADD COLUMN IF NOT EXISTS counselor_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,  -- 배정된 상담원 (퇴사 시 자동 미배정)
  ADD COLUMN IF NOT EXISTS assigned_at        timestamptz,                           -- 배정 일자
  ADD COLUMN IF NOT EXISTS callable_time      text,                                  -- 통화 가능 시간 (자유 입력)
  ADD COLUMN IF NOT EXISTS device_type        text,                                  -- 단말기 분류 ('CAT', 'POS', 'DCC' 등)
  ADD COLUMN IF NOT EXISTS contract_period    text,                                  -- 약정 기간

  -- 어트리뷰션 (GA4 + 광고 클릭 ID)
  ADD COLUMN IF NOT EXISTS ga_client_id       text,                                  -- GA4 _ga 쿠키
  ADD COLUMN IF NOT EXISTS ga_session_id      text,                                  -- GA4 ga_session_id
  ADD COLUMN IF NOT EXISTS landing_page_path  text,                                  -- 최초 진입 페이지
  ADD COLUMN IF NOT EXISTS gclid              text,                                  -- Google Ads 클릭 ID
  ADD COLUMN IF NOT EXISTS fbclid             text,                                  -- Meta Ads 클릭 ID

  -- 즐겨찾기 / 블랙리스트 토글
  ADD COLUMN IF NOT EXISTS is_favorite        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_blacklisted     boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS consultations_status_id_idx     ON public.consultations (status_id);
CREATE INDEX IF NOT EXISTS consultations_counselor_id_idx  ON public.consultations (counselor_id);
CREATE INDEX IF NOT EXISTS consultations_db_group_idx      ON public.consultations (db_group_label);
CREATE INDEX IF NOT EXISTS consultations_favorite_idx      ON public.consultations (is_favorite) WHERE is_favorite = true;

-- 기존 status (text) → status_id (FK) 백필
-- 신규 마이그레이션이라 데이터가 거의 없을 거라 1회 매핑으로 충분.
UPDATE public.consultations c
SET status_id = s.id
FROM public.db_statuses s
WHERE c.status_id IS NULL
  AND c.status = s.code;

COMMENT ON COLUMN public.consultations.status_id IS
  'db_statuses 마스터 FK. 기존 status (text) 는 BC 위해 유지하지만 신규 코드는 status_id 사용.';
COMMENT ON COLUMN public.consultations.ga_client_id IS
  'GA4 어트리뷰션용. 폼 제출 시 클라이언트에서 캡쳐.';


-- =============================================================
-- 4) consultation_status_history : 상태 변경 이력 (1:N)
-- =============================================================
-- CRM PRO 상세 모달의 "상태 이력" 섹션을 그대로 구현.
-- 누가 언제 어떤 상태로 바꿨는지 + 메모까지 추적.

CREATE TABLE IF NOT EXISTS public.consultation_status_history (
  id              bigserial   PRIMARY KEY,
  consultation_id uuid        NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  status_id       int         NOT NULL REFERENCES public.db_statuses(id),
  changed_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at      timestamptz NOT NULL DEFAULT now(),
  memo            text        CHECK (memo IS NULL OR length(memo) <= 2000)
);

CREATE INDEX IF NOT EXISTS csh_consultation_idx ON public.consultation_status_history (consultation_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS csh_status_idx       ON public.consultation_status_history (status_id);

COMMENT ON TABLE public.consultation_status_history IS
  '상담 상태 변경 이력 — 상세 모달 "상태 이력" 섹션 + 분석용';


-- =============================================================
-- 5) consultation_messages : 알림톡/SMS 발송 이력 (1:N)
-- =============================================================
-- Phase B 알림톡 자동 발송 시 INSERT.
-- 발송 실패도 같이 기록 (재시도 워커에서 활용).

CREATE TABLE IF NOT EXISTS public.consultation_messages (
  id               bigserial   PRIMARY KEY,
  consultation_id  uuid        NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  channel          text        NOT NULL CHECK (channel IN ('kakao_alimtalk','sms','email','slack_dm')),
  template_code    text,                                                              -- 발송 시 사용한 템플릿 코드
  body             text        NOT NULL,                                              -- 변수 치환 후 실제 본문
  triggered_by     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,         -- NULL = 자동 발송
  trigger_reason   text,                                                              -- 'status_change' / 'manual' / 'cron'
  sent_at          timestamptz NOT NULL DEFAULT now(),
  success          boolean     NOT NULL DEFAULT false,
  error_message    text,
  external_id      text                                                               -- 알림톡 API 응답 ID (재조회용)
);

CREATE INDEX IF NOT EXISTS cm_consultation_idx ON public.consultation_messages (consultation_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS cm_failed_idx       ON public.consultation_messages (sent_at DESC) WHERE success = false;

COMMENT ON TABLE public.consultation_messages IS
  '알림톡/SMS/이메일 발송 이력. 실패 건은 success=false 로 남겨 재시도 워커에서 처리.';


-- =============================================================
-- 6) abuse_blocklist : 광고 어뷰징 차단 마스터
-- =============================================================
-- CRM PRO 의 "블랙리스트 = 연락처 차단 / IP 차단" 패턴.
-- 광고 시작 후 봇·반복 신청·경쟁사 방해 자동 방어.
-- /api/consultations POST 단계에서 이 테이블 체크 → 매치되면 INSERT 안 함 (스텔스).

CREATE TABLE IF NOT EXISTS public.abuse_blocklist (
  id                       bigserial   PRIMARY KEY,
  block_type               text        NOT NULL CHECK (block_type IN ('phone','ip','email','user_agent_pattern')),
  block_value              text        NOT NULL,                                     -- 차단 값
  reason                   text,                                                     -- 차단 사유 (자유 입력)
  blocked_by               uuid        REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL = 자동 차단 (시스템)
  blocked_at               timestamptz NOT NULL DEFAULT now(),
  expires_at               timestamptz,                                              -- NULL = 영구
  source_consultation_id   uuid        REFERENCES public.consultations(id) ON DELETE SET NULL,
  hit_count                int         NOT NULL DEFAULT 0                            -- 차단된 횟수 (참고)
);

CREATE UNIQUE INDEX IF NOT EXISTS abuse_blocklist_unique_idx
  ON public.abuse_blocklist (block_type, block_value)
  WHERE expires_at IS NULL OR expires_at > now();

CREATE INDEX IF NOT EXISTS abuse_blocklist_value_idx ON public.abuse_blocklist (block_value);

COMMENT ON TABLE public.abuse_blocklist IS
  '광고 어뷰징 차단 — 신청 API 에서 phone/ip 매치 시 INSERT 거절 (스텔스 응답).';


-- =============================================================
-- 7) RLS 정책
-- =============================================================
-- 원칙 :
--   - db_statuses : 익명 SELECT 허용 (폼 사이드에서 상태 라벨 표시용),
--                   인증자만 INSERT/UPDATE
--   - history / messages / blocklist : 인증자만 모든 동작 (어드민 전용)

-- ----- db_statuses -----
ALTER TABLE public.db_statuses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS db_statuses_select_all ON public.db_statuses;
CREATE POLICY db_statuses_select_all
  ON public.db_statuses
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS db_statuses_write_admin ON public.db_statuses;
CREATE POLICY db_statuses_write_admin
  ON public.db_statuses
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ----- consultation_status_history -----
ALTER TABLE public.consultation_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS csh_admin_all ON public.consultation_status_history;
CREATE POLICY csh_admin_all
  ON public.consultation_status_history
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ----- consultation_messages -----
ALTER TABLE public.consultation_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cm_admin_all ON public.consultation_messages;
CREATE POLICY cm_admin_all
  ON public.consultation_messages
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ----- abuse_blocklist -----
-- 신청 API 에서 anon 으로 SELECT 가능해야 차단 체크 가능.
-- INSERT/UPDATE/DELETE 는 인증자만.

ALTER TABLE public.abuse_blocklist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS abuse_select_check ON public.abuse_blocklist;
CREATE POLICY abuse_select_check
  ON public.abuse_blocklist
  FOR SELECT
  TO anon, authenticated
  USING (expires_at IS NULL OR expires_at > now());

DROP POLICY IF EXISTS abuse_write_admin ON public.abuse_blocklist;
CREATE POLICY abuse_write_admin
  ON public.abuse_blocklist
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- =============================================================
-- 8) 분석용 뷰 (Phase A 끝나면 대시보드에서 바로 SELECT)
-- =============================================================

-- ----- v_consultation_funnel : 상태별 카운트 (대시보드 KPI 카드) -----
CREATE OR REPLACE VIEW public.v_consultation_funnel AS
SELECT
  s.code                              AS status_code,
  s.label                             AS status_label,
  s.bg_color                          AS status_color,
  s.is_conversion                     AS is_conversion,
  s.is_promising                      AS is_promising,
  s.is_unapproved                     AS is_unapproved,
  COUNT(c.id)                         AS total_count,
  COUNT(c.id) FILTER (WHERE c.created_at >= date_trunc('day', now()))     AS today_count,
  COUNT(c.id) FILTER (WHERE c.created_at >= now() - interval '7 days')    AS week_count,
  COUNT(c.id) FILTER (WHERE c.created_at >= now() - interval '30 days')   AS month_count
FROM public.db_statuses s
LEFT JOIN public.consultations c ON c.status_id = s.id
WHERE s.is_active = true
GROUP BY s.id;

COMMENT ON VIEW public.v_consultation_funnel IS
  '상태별 신청 카운트 (오늘/7일/30일/전체). 대시보드 KPI 카드 + 퍼널 차트용.';

-- ----- v_consultation_by_channel : 매체별 신청·전환 (CPL/CVR 계산 기반) -----
CREATE OR REPLACE VIEW public.v_consultation_by_channel AS
SELECT
  COALESCE(c.utm_source, '(direct)')  AS channel,
  COALESCE(c.utm_campaign, '(none)')  AS campaign,
  date_trunc('day', c.created_at)     AS day,
  COUNT(*)                            AS lead_count,
  COUNT(*) FILTER (WHERE s.is_conversion)  AS conversion_count,
  COUNT(*) FILTER (WHERE s.is_promising)   AS promising_count,
  COUNT(*) FILTER (WHERE s.is_unapproved)  AS unapproved_count,
  -- 비율은 상위 쿼리에서 계산 (NULLIF 처리)
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE s.is_conversion) / NULLIF(COUNT(*), 0),
    2
  ) AS conversion_rate_pct,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE s.is_unapproved) / NULLIF(COUNT(*), 0),
    2
  ) AS unapproved_rate_pct
FROM public.consultations c
LEFT JOIN public.db_statuses s ON c.status_id = s.id
GROUP BY 1, 2, 3;

COMMENT ON VIEW public.v_consultation_by_channel IS
  '매체별·캠페인별·일별 신청·전환·허수 카운트 + 비율. 광고 효율 분석 기반.';

-- ----- v_consultation_by_counselor : 상담사별 성과 -----
CREATE OR REPLACE VIEW public.v_consultation_by_counselor AS
SELECT
  c.counselor_id,
  u.email                             AS counselor_email,
  COUNT(*)                            AS assigned_count,
  COUNT(*) FILTER (WHERE s.is_conversion)  AS conversion_count,
  COUNT(*) FILTER (WHERE s.is_unapproved)  AS unapproved_count,
  COUNT(*) FILTER (WHERE c.status_id IS NOT NULL) AS processed_count,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE s.is_conversion) / NULLIF(COUNT(*), 0),
    2
  ) AS conversion_rate_pct,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE s.is_unapproved) / NULLIF(COUNT(*), 0),
    2
  ) AS unapproved_rate_pct
FROM public.consultations c
LEFT JOIN public.db_statuses s ON c.status_id = s.id
LEFT JOIN auth.users u ON c.counselor_id = u.id
WHERE c.counselor_id IS NOT NULL
GROUP BY c.counselor_id, u.email;

COMMENT ON VIEW public.v_consultation_by_counselor IS
  '상담사별 배정·처리·개통률·허수율. 상담사별 KPI 대시보드 + 인센티브 산정 기반.';


-- =============================================================
-- ROLLBACK (역순)
-- =============================================================
-- DROP VIEW  IF EXISTS public.v_consultation_by_counselor;
-- DROP VIEW  IF EXISTS public.v_consultation_by_channel;
-- DROP VIEW  IF EXISTS public.v_consultation_funnel;
--
-- DROP POLICY IF EXISTS abuse_write_admin       ON public.abuse_blocklist;
-- DROP POLICY IF EXISTS abuse_select_check      ON public.abuse_blocklist;
-- DROP POLICY IF EXISTS cm_admin_all            ON public.consultation_messages;
-- DROP POLICY IF EXISTS csh_admin_all           ON public.consultation_status_history;
-- DROP POLICY IF EXISTS db_statuses_write_admin ON public.db_statuses;
-- DROP POLICY IF EXISTS db_statuses_select_all  ON public.db_statuses;
--
-- DROP TABLE IF EXISTS public.abuse_blocklist;
-- DROP TABLE IF EXISTS public.consultation_messages;
-- DROP TABLE IF EXISTS public.consultation_status_history;
--
-- ALTER TABLE public.consultations
--   DROP COLUMN IF EXISTS is_blacklisted,
--   DROP COLUMN IF EXISTS is_favorite,
--   DROP COLUMN IF EXISTS fbclid,
--   DROP COLUMN IF EXISTS gclid,
--   DROP COLUMN IF EXISTS landing_page_path,
--   DROP COLUMN IF EXISTS ga_session_id,
--   DROP COLUMN IF EXISTS ga_client_id,
--   DROP COLUMN IF EXISTS contract_period,
--   DROP COLUMN IF EXISTS device_type,
--   DROP COLUMN IF EXISTS callable_time,
--   DROP COLUMN IF EXISTS assigned_at,
--   DROP COLUMN IF EXISTS counselor_id,
--   DROP COLUMN IF EXISTS internal_memo,
--   DROP COLUMN IF EXISTS db_group_label,
--   DROP COLUMN IF EXISTS status_id;
--
-- DROP TRIGGER IF EXISTS db_statuses_set_updated_at ON public.db_statuses;
-- DROP TABLE IF EXISTS public.db_statuses;
