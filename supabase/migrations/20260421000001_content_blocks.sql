-- =============================================================
-- Migration: 20260421000001
-- Phase 0 — 인라인 편집 시스템: content_blocks + history + storage bucket
-- =============================================================
-- 목적 :
--   워드프레스·윅스 스타일 인라인 편집을 위한 콘텐츠 블록 저장소.
--   마케터가 페이지에서 직접 텍스트/이미지/링크를 바꿔 A/B 테스트할 수 있게.
--
-- 원칙 :
--   - 블록 단위 저장 (block_key 예: 'home.hero.slide1.title')
--   - semantic_tag 필드로 H1/H2/H3/P 태그 강제 유지 → SEO 보호
--   - 직전 5개 버전 히스토리 보관 → 롤백 가능
--   - 모든 쓰기는 인증된 사용자만 (현재는 admin@ozlabpay.kr 1명)
-- =============================================================

-- -------------------------------------------------------------
-- 0) set_updated_at() : updated_at 자동 갱신 트리거 함수
--    (우리편에서는 packages 마이그레이션에 있었지만, 오즈랩페이는
--     content_blocks 가 첫 마이그레이션이라 여기서 선언)
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -------------------------------------------------------------
-- 1) content_blocks : 현재 값 (페이지 렌더 시 읽는 소스)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS content_blocks (
  block_key     text PRIMARY KEY,                          -- 'home.hero.slide1.title'
  block_type    text NOT NULL CHECK (block_type IN ('text','image','link')),
  value         jsonb NOT NULL,                            -- {text} / {url, alt, width, height} / {label, href}
  semantic_tag  text,                                      -- 'h1'|'h2'|'h3'|'h4'|'p'|'a'|'img' — SEO 태그 유지용
  page_path     text,                                      -- '/'  '/internet' 등 revalidatePath 힌트
  note          text,                                      -- 편집자 메모 (어떤 A/B 가설인지 등)
  updated_at    timestamptz NOT NULL DEFAULT now(),
  updated_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 페이지별 일괄 조회용 인덱스
CREATE INDEX IF NOT EXISTS idx_content_blocks_page_path
  ON content_blocks(page_path);

COMMENT ON TABLE  content_blocks            IS '인라인 편집 블록 — 페이지 텍스트/이미지/링크의 현재 값';
COMMENT ON COLUMN content_blocks.block_key  IS '도트 표기법 경로 ex) home.hero.slide1.title';
COMMENT ON COLUMN content_blocks.value      IS 'text: {text}, image: {url, alt, width, height, format}, link: {label, href, target}';
COMMENT ON COLUMN content_blocks.semantic_tag IS '렌더링 시 강제할 HTML 태그 — 마케터는 못 바꿈';
COMMENT ON COLUMN content_blocks.page_path  IS '저장 후 revalidatePath 대상 경로';

-- updated_at 자동 갱신 트리거 (위 0) 에서 선언한 함수 사용)
DROP TRIGGER IF EXISTS trg_content_blocks_updated_at ON content_blocks;
CREATE TRIGGER trg_content_blocks_updated_at
  BEFORE UPDATE ON content_blocks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -------------------------------------------------------------
-- 2) content_block_history : 직전 값 히스토리 (최대 5개 유지)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS content_block_history (
  id            bigserial PRIMARY KEY,
  block_key     text NOT NULL,
  value         jsonb NOT NULL,                            -- 당시 스냅샷
  semantic_tag  text,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  updated_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_content_block_history_key_time
  ON content_block_history(block_key, updated_at DESC);

COMMENT ON TABLE content_block_history IS '편집 직전값 스냅샷 — block_key당 최근 5개만 유지 (trigger로 정리)';

-- 5개 초과 시 오래된 것 자동 삭제 트리거
CREATE OR REPLACE FUNCTION trim_content_block_history()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM content_block_history
  WHERE id IN (
    SELECT id FROM content_block_history
    WHERE block_key = NEW.block_key
    ORDER BY updated_at DESC
    OFFSET 5
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_trim_content_block_history ON content_block_history;
CREATE TRIGGER trg_trim_content_block_history
  AFTER INSERT ON content_block_history
  FOR EACH ROW EXECUTE FUNCTION trim_content_block_history();

-- -------------------------------------------------------------
-- 3) RLS — 공개 읽기, 인증 사용자만 쓰기
-- -------------------------------------------------------------
ALTER TABLE content_blocks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_block_history ENABLE ROW LEVEL SECURITY;

-- content_blocks : 누구나 읽기 / 인증자만 INSERT·UPDATE·DELETE
CREATE POLICY "content_blocks_public_read"
  ON content_blocks FOR SELECT
  USING (true);

CREATE POLICY "content_blocks_auth_write"
  ON content_blocks FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- content_block_history : 인증자만 읽기·쓰기 (감사 목적)
CREATE POLICY "content_block_history_auth_all"
  ON content_block_history FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- -------------------------------------------------------------
-- 4) Storage bucket : public-content (이미지 편집물 저장)
-- -------------------------------------------------------------
-- 주의 : Supabase Storage bucket은 storage.buckets 테이블에 직접 INSERT
--        공개 bucket이라 누구나 URL로 이미지 읽기 가능 (RLS로 쓰기만 제한)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public-content',
  'public-content',
  true,                                                    -- public read
  5242880,                                                 -- 5MB 제한
  ARRAY['image/png','image/jpeg','image/webp','image/gif','image/svg+xml']
)
ON CONFLICT (id) DO UPDATE
  SET public            = EXCLUDED.public,
      file_size_limit   = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage 객체 RLS — 누구나 읽기 / 인증자만 쓰기
-- (public=true 이므로 SELECT 정책은 사실상 불필요하지만 명시)

-- 기존 동일 정책 있으면 지우고 재생성
DROP POLICY IF EXISTS "public_content_read"   ON storage.objects;
DROP POLICY IF EXISTS "public_content_write"  ON storage.objects;
DROP POLICY IF EXISTS "public_content_update" ON storage.objects;
DROP POLICY IF EXISTS "public_content_delete" ON storage.objects;

CREATE POLICY "public_content_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'public-content');

CREATE POLICY "public_content_write"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'public-content');

CREATE POLICY "public_content_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'public-content')
  WITH CHECK (bucket_id = 'public-content');

CREATE POLICY "public_content_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'public-content');

-- =============================================================
-- ROLLBACK
-- =============================================================
-- DROP TRIGGER IF EXISTS trg_trim_content_block_history ON content_block_history;
-- DROP FUNCTION IF EXISTS trim_content_block_history();
-- DROP TRIGGER IF EXISTS trg_content_blocks_updated_at ON content_blocks;
-- DROP TABLE IF EXISTS content_block_history;
-- DROP TABLE IF EXISTS content_blocks;
-- DROP POLICY IF EXISTS "public_content_read"   ON storage.objects;
-- DROP POLICY IF EXISTS "public_content_write"  ON storage.objects;
-- DROP POLICY IF EXISTS "public_content_update" ON storage.objects;
-- DROP POLICY IF EXISTS "public_content_delete" ON storage.objects;
-- DELETE FROM storage.buckets WHERE id = 'public-content';
