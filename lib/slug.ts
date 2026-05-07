// ─────────────────────────────────────────────
// 한글 제목 → 안전한 영문 slug 변환 헬퍼
//
// 정책 :
//   1) 제목에 의미 있는 영문/숫자가 3자 이상 있으면 그대로 슬러그화
//      (예 : "Toss Terminal Guide 2026" → "toss-terminal-guide-2026")
//   2) 한글·이모지·특수문자만 있는 제목은 영문 부분이 짧아 SEO 가치 X
//      → 'tip-YYYY-MM-DD-xxxx' 형태 timestamp slug 폴백
//      (예 : "토스 단말기 가이드" → "tip-2026-05-06-a3xb")
//
// 이 헬퍼는 어드민 폼의 자동 slug 생성과
// /api/admin/media 의 한글 파일명 → ASCII 변환에서 사용된다.
// ─────────────────────────────────────────────

/**
 * 제목 문자열을 URL-safe 영문 slug 로 변환한다.
 * 영문/숫자가 부족하면 timestamp 기반 폴백 slug 를 반환한다.
 */
export function generateSlug(title: string): string {
  // 1) ASCII 영문·숫자·하이픈만 추출
  //    악센트(é, ü 등)는 NFKD 정규화 후 결합문자 제거 → 베이스 영문자만 남김
  const ascii = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')   // 결합 다이어크리틱(악센트) 제거
    .replace(/[^a-z0-9\s-]/g, '')      // ASCII 영문·숫자·공백·하이픈만
    .replace(/\s+/g, '-')              // 공백 → 하이픈
    .replace(/-+/g, '-')               // 연속 하이픈 압축
    .replace(/^-|-$/g, '')             // 양끝 하이픈 제거
    .substring(0, 80)

  // 2) 의미 있는 영문이 3자 이상이면 그대로 사용
  if (ascii.length >= 3) return ascii

  // 3) 한글/이모지만 있는 경우 timestamp 폴백
  //    YYYY-MM-DD-xxxx (xxxx = 랜덤 4자)
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  const rand = Math.random().toString(36).slice(2, 6)
  return `tip-${yyyy}-${mm}-${dd}-${rand}`
}

/**
 * 사용자가 직접 입력한 slug 를 정리한다.
 * (대문자→소문자, 특수문자 제거, 공백→하이픈)
 * /api/admin/media 에서도 한글 파일명을 ASCII storage path 로 변환할 때 사용.
 */
export function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80)
}
