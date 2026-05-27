-- =============================================================
-- Migration: 20260527010000_ad_metrics_lead_qty
-- ad_metrics 에 매입수량(lead_qty) 컬럼 + source 표준화
-- =============================================================
-- 배경 :
--   오즈랩페이는 두 가지 데이터 획득 모델 병행:
--     · DB 매입 (토스 등 공급자가 일괄 전달) — 시트 sync, utm 없음
--     · 페이드 미디어 (네이버/메타/구글) — utm 어트리뷰션
--
--   시트 헤더 : 날짜, 출처, 매입수량, 단가, 총매입비
--   - 매입수량 = 공급자가 보낸 DB 수 (공식 수치)
--   - 단가 = 1건당 가격 (총매입비/매입수량으로 derive 가능, 안 저장)
--   - 총매입비 = 그 날 그 출처에서 쓴 돈 → spend
--
-- 변경 :
--   1) ad_metrics.lead_qty (int) 컬럼 추가 — 시트 매입수량
--   2) source 표준화 — 'db_purchase' (시트) / 'paid_media' (페이드) / 기타
-- =============================================================

ALTER TABLE public.ad_metrics
  ADD COLUMN IF NOT EXISTS lead_qty integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.ad_metrics.lead_qty IS
  'DB 매입 모델 — 공급자가 보낸 DB 수. 페이드 미디어는 0 (consultations.utm 으로 카운트).';

COMMENT ON COLUMN public.ad_metrics.source IS
  '데이터 출처 모델 — db_purchase (시트 sync 매입) / paid_media (광고 비용) / manual / api_*';

-- DB 매입 + 페이드 미디어 둘 다 활용하므로
-- (date, channel) 조회 인덱스 강화
CREATE INDEX IF NOT EXISTS ad_metrics_date_channel_source_idx
  ON public.ad_metrics (date, channel, source);

-- END --
