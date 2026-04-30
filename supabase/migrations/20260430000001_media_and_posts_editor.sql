-- =============================================================
-- Migration: 20260430000001
-- 콘텐츠 어드민 (TipTap 에디터 + 미디어 라이브러리 + SEO 점수)
-- =============================================================
-- 목적 :
--   1) media 테이블 — 업로드된 이미지 메타 (Sharp WebP 변환 결과)
--   2) content_posts 컬럼 보강 :
--        body_html      : TipTap 에디터 HTML (기존 body_md 와 병행)
--        focus_keyword  : SEO 포커스 키워드
--        seo_scores     : 자체 랭킹 점수 캐시 (jsonb)
--        author_id      : 작성자 admin_users 참조
--   3) Storage 버킷 'media' (public-content 와 별도, 콘텐츠 글 본문 이미지 전용)
--
-- 권한 :
--   - 콘텐츠 글쓰기 / 미디어 업로드 : super_admin / admin / marketer
--   - 읽기 : 누구나 (anon)
-- =============================================================

-- -------------------------------------------------------------
-- 1) content_posts 컬럼 보강
-- -------------------------------------------------------------
ALTER TABLE content_posts
  ADD COLUMN IF NOT EXISTS body_html      text,
  ADD COLUMN IF NOT EXISTS focus_keyword  text,
  ADD COLUMN IF NOT EXISTS seo_scores     jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS author_id      uuid REFERENCES admin_users(id) ON DELETE SET NULL;

COMMENT ON COLUMN content_posts.body_html     IS 'TipTap 에디터 HTML (작성·수정의 단일 진실 소스)';
COMMENT ON COLUMN content_posts.body_md       IS 'DEPRECATED — body_html 로 통합 중. 기존 시드글만 호환용 보관';
COMMENT ON COLUMN content_posts.focus_keyword IS 'SEO 포커스 키워드 (점수 계산 기준)';
COMMENT ON COLUMN content_posts.seo_scores    IS '점수 캐시 {tier1, tier2, tier3, total, grade} — 저장 시 갱신';
COMMENT ON COLUMN content_posts.author_id     IS '작성자 admin_users 참조 (퇴사해도 글은 유지)';

-- 카테고리 라벨 헬퍼 (기존 ENUM 보존, promotion 이 필요하면 별도 작업)
-- (lib/posts.ts 의 ContentPost 와 일치 확인 — 변경 없음)

-- -------------------------------------------------------------
-- 2) media : 업로드 이미지 메타
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS media (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name       text NOT NULL,                            -- 원본 파일명
  storage_path    text NOT NULL,                            -- 원본 public URL
  webp_path       text,                                     -- WebP 변환 public URL
  mime_type       text NOT NULL,
  file_size       bigint,                                   -- bytes
  width           int,
  height          int,
  alt_text        text,                                     -- 접근성 + SEO
  uploaded_by     uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_created_at ON media(created_at DESC);

COMMENT ON TABLE  media           IS '콘텐츠 본문·대표 이미지 라이브러리';
COMMENT ON COLUMN media.webp_path IS 'Sharp 변환 1200px 가로 + WebP quality 82 — 본문에는 이걸 우선 사용';

-- -------------------------------------------------------------
-- 3) RLS — media
-- -------------------------------------------------------------
ALTER TABLE media ENABLE ROW LEVEL SECURITY;

-- 누구나 SELECT (어차피 storage 가 public 이라 의미 없지만 명시)
CREATE POLICY "media_public_read"
  ON media FOR SELECT
  USING (true);

-- INSERT/UPDATE/DELETE 는 super_admin/admin/marketer 만
CREATE POLICY "media_admin_write_insert"
  ON media FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.id = auth.uid()
        AND au.is_active = true
        AND au.role IN ('super_admin', 'admin', 'marketer')
    )
  );

CREATE POLICY "media_admin_write_update"
  ON media FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.id = auth.uid()
        AND au.is_active = true
        AND au.role IN ('super_admin', 'admin', 'marketer')
    )
  );

CREATE POLICY "media_admin_write_delete"
  ON media FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.id = auth.uid()
        AND au.is_active = true
        AND au.role IN ('super_admin', 'admin', 'marketer')
    )
  );

-- -------------------------------------------------------------
-- 4) Storage bucket : 'media' (글 본문 이미지 전용)
--    public-content 와 분리 — 본문 이미지 / 인라인 편집 이미지 구분 관리
-- -------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  5242880,                                                 -- 5MB
  ARRAY['image/png','image/jpeg','image/webp','image/gif']
)
ON CONFLICT (id) DO UPDATE
  SET public            = EXCLUDED.public,
      file_size_limit   = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage 객체 RLS — 누구나 읽기 / admin role 만 쓰기
DROP POLICY IF EXISTS "media_storage_read"   ON storage.objects;
DROP POLICY IF EXISTS "media_storage_write"  ON storage.objects;
DROP POLICY IF EXISTS "media_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "media_storage_delete" ON storage.objects;

CREATE POLICY "media_storage_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media');

CREATE POLICY "media_storage_write"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'media'
    AND EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.id = auth.uid()
        AND au.is_active = true
        AND au.role IN ('super_admin', 'admin', 'marketer')
    )
  );

CREATE POLICY "media_storage_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'media'
    AND EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.id = auth.uid()
        AND au.is_active = true
        AND au.role IN ('super_admin', 'admin', 'marketer')
    )
  );

CREATE POLICY "media_storage_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'media'
    AND EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.id = auth.uid()
        AND au.is_active = true
        AND au.role IN ('super_admin', 'admin', 'marketer')
    )
  );

-- =============================================================
-- ROLLBACK
-- =============================================================
-- ALTER TABLE content_posts
--   DROP COLUMN IF EXISTS body_html,
--   DROP COLUMN IF EXISTS focus_keyword,
--   DROP COLUMN IF EXISTS seo_scores,
--   DROP COLUMN IF EXISTS author_id;
-- DROP POLICY IF EXISTS "media_storage_delete" ON storage.objects;
-- DROP POLICY IF EXISTS "media_storage_update" ON storage.objects;
-- DROP POLICY IF EXISTS "media_storage_write"  ON storage.objects;
-- DROP POLICY IF EXISTS "media_storage_read"   ON storage.objects;
-- DELETE FROM storage.buckets WHERE id = 'media';
-- DROP TABLE IF EXISTS media;
