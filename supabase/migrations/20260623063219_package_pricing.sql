-- =============================================================
-- Migration: 20260623063219_package_pricing
-- 마케팅 패키지 견적 마스터 — /marketing-package 랜딩 견적표
-- =============================================================
-- 배경 :
--   랜딩 견적표 12종 항목·단가·합계가 컴포넌트 const 에 하드코딩되어 있어
--   어드민에서 수정 불가. channel_mapping / consultation_field_options 와
--   동일하게 "DB 마스터 + 어드민 편집" 구조로 일원화.
--
-- 구성 :
--   1) package_pricing_items   — 항목별(초기/월정기) 이름·설명·단가
--   2) package_pricing_settings — 패키지가(월/연)·뱃지·CTA·정상가 override (단일 행)
--
-- 합계·할인율은 앱에서 계산 :
--   정상가 = regular_total_override ?? (Σ초기.monthly + Σ월정기.yearly)
--   절약   = 정상가 - package_yearly
--   할인%  = 절약 / 정상가 × 100
-- =============================================================

-- =============================================================
-- 1) package_pricing_items
-- =============================================================
CREATE TABLE IF NOT EXISTS public.package_pricing_items (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  item_group    text        NOT NULL CHECK (item_group IN ('initial', 'monthly')),
  name          text        NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  description   text        CHECK (description IS NULL OR length(description) <= 200),
  monthly_price integer     NOT NULL DEFAULT 0 CHECK (monthly_price >= 0),  -- 초기=1회성 금액, 월정기=월 단가
  yearly_price  integer     CHECK (yearly_price IS NULL OR yearly_price >= 0), -- 월정기 연 환산. 초기는 NULL
  sort_order    integer     NOT NULL DEFAULT 0,
  is_active     boolean     NOT NULL DEFAULT true,
  note          text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS package_pricing_items_lookup
  ON public.package_pricing_items (item_group, sort_order)
  WHERE is_active = true;

DROP TRIGGER IF EXISTS package_pricing_items_set_updated_at ON public.package_pricing_items;
CREATE TRIGGER package_pricing_items_set_updated_at
  BEFORE UPDATE ON public.package_pricing_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE public.package_pricing_items IS
  '/marketing-package 견적표 항목 마스터. item_group=initial(1회성)/monthly(월정기)';
COMMENT ON COLUMN public.package_pricing_items.monthly_price IS
  '초기 항목 = 1회성 금액, 월정기 항목 = 월 단가 (KRW 정수)';
COMMENT ON COLUMN public.package_pricing_items.yearly_price IS
  '월정기 항목의 연 환산 금액. 초기 항목은 NULL';

-- =============================================================
-- 2) package_pricing_settings (단일 행)
-- =============================================================
CREATE TABLE IF NOT EXISTS public.package_pricing_settings (
  id                     text        PRIMARY KEY DEFAULT 'marketing-package',
  package_monthly        integer     NOT NULL DEFAULT 125000 CHECK (package_monthly >= 0),
  package_yearly         integer     NOT NULL DEFAULT 1500000 CHECK (package_yearly >= 0),
  badge_label            text        NOT NULL DEFAULT '연간 계약 특가 · 통합 패키지',
  cta_label              text        NOT NULL DEFAULT '이 가격으로 견적 신청',
  yearly_note            text        NOT NULL DEFAULT '부가세 별도 · 광고 실비/현장 촬영 제외',
  regular_total_override integer     CHECK (regular_total_override IS NULL OR regular_total_override >= 0),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT package_pricing_settings_singleton CHECK (id = 'marketing-package')
);

DROP TRIGGER IF EXISTS package_pricing_settings_set_updated_at ON public.package_pricing_settings;
CREATE TRIGGER package_pricing_settings_set_updated_at
  BEFORE UPDATE ON public.package_pricing_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE public.package_pricing_settings IS
  '/marketing-package 패키지가·뱃지·CTA·정상가 override. 단일 행(id=marketing-package)';
COMMENT ON COLUMN public.package_pricing_settings.regular_total_override IS
  '정상가 수동 지정. NULL 이면 항목 합계로 자동 계산';

-- =============================================================
-- 3) RLS — 읽기는 모두(활성만 익명), 쓰기는 admin 이상
-- =============================================================
ALTER TABLE public.package_pricing_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS package_pricing_items_anon_read ON public.package_pricing_items;
CREATE POLICY package_pricing_items_anon_read
  ON public.package_pricing_items FOR SELECT TO anon
  USING (is_active = true);

DROP POLICY IF EXISTS package_pricing_items_authed_read ON public.package_pricing_items;
CREATE POLICY package_pricing_items_authed_read
  ON public.package_pricing_items FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS package_pricing_items_admin_insert ON public.package_pricing_items;
CREATE POLICY package_pricing_items_admin_insert
  ON public.package_pricing_items FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_above());

DROP POLICY IF EXISTS package_pricing_items_admin_update ON public.package_pricing_items;
CREATE POLICY package_pricing_items_admin_update
  ON public.package_pricing_items FOR UPDATE TO authenticated
  USING (public.is_admin_or_above()) WITH CHECK (public.is_admin_or_above());

DROP POLICY IF EXISTS package_pricing_items_admin_delete ON public.package_pricing_items;
CREATE POLICY package_pricing_items_admin_delete
  ON public.package_pricing_items FOR DELETE TO authenticated
  USING (public.is_admin_or_above());

ALTER TABLE public.package_pricing_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS package_pricing_settings_anon_read ON public.package_pricing_settings;
CREATE POLICY package_pricing_settings_anon_read
  ON public.package_pricing_settings FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS package_pricing_settings_authed_read ON public.package_pricing_settings;
CREATE POLICY package_pricing_settings_authed_read
  ON public.package_pricing_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS package_pricing_settings_admin_write ON public.package_pricing_settings;
CREATE POLICY package_pricing_settings_admin_write
  ON public.package_pricing_settings FOR ALL TO authenticated
  USING (public.is_admin_or_above()) WITH CHECK (public.is_admin_or_above());

GRANT SELECT ON public.package_pricing_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.package_pricing_items TO authenticated;
GRANT SELECT ON public.package_pricing_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.package_pricing_settings TO authenticated;

-- =============================================================
-- 4) 시드 — 현재 랜딩 하드코딩 12종 + 설정 (테이블 비어있을 때만)
-- =============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.package_pricing_items) THEN
    INSERT INTO public.package_pricing_items (item_group, name, description, monthly_price, yearly_price, sort_order) VALUES
      -- 초기 인프라 세팅 (1회성 · 4종)
      ('initial', '네이버 플레이스 최적화 + SEO 설계', '검색 노출 알고리즘 분석 + 키워드·해시태그 매칭', 150000, NULL, 10),
      ('initial', 'AI 콘텐츠 생성 엔진·API 환경 연동', '업체 전용 클라우드 + 프롬프트 커스텀 세팅', 150000, NULL, 20),
      ('initial', '광고 매체 초기 계정 연동 + 픽셀 설치', 'Meta·TikTok·네이버 광고 계정 + 트래킹 픽셀', 150000, NULL, 30),
      ('initial', '인플루언서 매칭 + 타겟 데이터 인프라', '체험단 모집 폼 + 지역 세그먼트 데이터 구축', 150000, NULL, 40),
      -- 월 정기 관리 (8종)
      ('monthly', 'AI 숏폼 영상 기획·제작', '매장 맞춤 릴스/틱톡/쇼츠 주 1회 · 월 4건', 400000, 4800000, 10),
      ('monthly', '지역 인근 AI 타겟팅 광고 운영', '매체 최적화·머신러닝 모니터링 (실비 별도)', 50000, 600000, 20),
      ('monthly', '로컬 최적화 블로그 콘텐츠 발행', '지역 상권 검색 노출 키워드 원고 · 월 4건', 200000, 2400000, 30),
      ('monthly', 'SNS 멀티 채널 업로드·브랜드 관리', '인스타·틱톡·유튜브 쇼츠 채널 케어', 250000, 3000000, 40),
      ('monthly', '바이럴 체험단 + 마이크로 인플루언서 모집', '지역 기반 상시 모집 + 신청 명단 전달', 200000, 2400000, 50),
      ('monthly', '네이버 플레이스 최적화 관리', '월 1회 새 소식·이미지 + SEO 순위 최적화', 150000, 1800000, 60),
      ('monthly', '플레이스 리워드 광고 운영 대행', '트래픽·저장·알림 받기 활성화 (실비 별도)', 100000, 1200000, 70),
      ('monthly', '소상공인·플레이스 검색 광고 운영 대행', '지역 검색 광고 최적화 (광고 실비 별도)', 100000, 1200000, 80);
  END IF;

  INSERT INTO public.package_pricing_settings (id, package_monthly, package_yearly, regular_total_override)
  VALUES ('marketing-package', 125000, 1500000, 20050000)
  ON CONFLICT (id) DO NOTHING;
END;
$$;

-- END --
