-- =============================================================
-- UTM medium aliases used by the public UTM naming guide
--
-- Existing seeds covered short forms such as `search` and `display`.
-- The operating UTM guide asks ad operators to use explicit paid
-- forms such as `search-ads` and `display-ads`, so paid-media needs
-- these aliases to avoid "unmapped" lead buckets.
-- =============================================================

INSERT INTO public.channel_mapping
  (utm_source, utm_medium, channel_code, channel_label, is_paid, sort_order, note)
VALUES
  ('naver',  'search-ads',  'naver-search',   '네이버 검색광고', true, 11, 'Alias for UTM guide paid search medium'),
  ('naver',  'display-ads', 'naver-display',  '네이버 디스플레이', true, 13, 'Alias for UTM guide paid display medium'),
  ('google', 'search-ads',  'google-search',  '구글 검색광고', true, 21, 'Alias for UTM guide paid search medium'),
  ('google', 'display-ads', 'google-display', '구글 디스플레이', true, 22, 'Alias for UTM guide paid display medium')
ON CONFLICT (lower(utm_source), lower(coalesce(utm_medium, '')))
DO UPDATE SET
  channel_code = EXCLUDED.channel_code,
  channel_label = EXCLUDED.channel_label,
  is_paid = EXCLUDED.is_paid,
  sort_order = EXCLUDED.sort_order,
  note = EXCLUDED.note,
  is_active = true,
  updated_at = now();
