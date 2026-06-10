// ─────────────────────────────────────────────
// 채널 코드 → 라벨/색상 공용 헬퍼 (클라이언트 안전)
//
// 원칙 :
//   라벨의 단일 진실원(source of truth)은 DB 의 channel_mapping 테이블.
//   서버에서 loadChannelDictionary() 로 사전을 내려받아 prop 으로 전달하고,
//   여기 FALLBACK_* 은 사전 로드 실패/미등록 코드의 안전망일 뿐이다.
//   → 새 매체 추가 시 코드 수정 없이 channel_mapping 행만 추가하면 됨.
// ─────────────────────────────────────────────

/** channel_code → { label, isPaid } 사전. 서버에서 channel_mapping 로드 */
export type ChannelDict = Record<string, { label: string; isPaid: boolean }>

/** 사전 미로드/미등록 코드용 폴백 라벨 (channel_mapping 시드와 동일하게 유지) */
const FALLBACK_LABELS: Record<string, string> = {
  // 페이드
  'naver-ads': '네이버 광고',
  'naver-search': '네이버 검색광고',
  'naver-brand': '네이버 브랜드검색',
  'naver-display': '네이버 디스플레이',
  'naver-powerlink': '네이버 파워링크',
  'google-ads': '구글 광고',
  'google-search': '구글 검색광고',
  'google-display': '구글 디스플레이',
  'youtube-ads': '유튜브 광고',
  'meta-ads': '메타 광고',
  'kakao-ads': '카카오 모먼트',
  'kakao-bizboard': '카카오 비즈보드',
  'daangn-ads': '당근 광고',
  'tiktok-ads': '틱톡 광고',
  'toss-ads': '토스 광고',
  // 오가닉 검색
  'naver-organic': '네이버 자연유입',
  'google-organic': '구글 자연유입',
  'daum-organic': '다음 자연유입',
  'bing-organic': '빙 자연유입',
  // 레거시 코드 (백필 이전 데이터 잔존 대비)
  'daum-search': '다음 검색',
  'bing-search': '빙 검색',
  // referer 기반 분류
  'referral-blog': '외부 블로그',
  'internal-blog': '자체 블로그',
  internal: '자체 사이트 이동',
  'social-organic': 'SNS 자연유입',
  kakao: '카카오톡',
  'referral-other': '외부 추천',
  direct: '직접 유입',
  site: '자체 사이트',
  referral: '추천/리퍼럴',
  email: '이메일',
  sms: 'SMS',
}

/** 채널 라벨 — 사전 1순위, 폴백 2순위, 코드 그대로 3순위 */
export function channelLabel(code: string | null, dict?: ChannelDict): string {
  if (!code) return '미분류'
  return dict?.[code]?.label ?? FALLBACK_LABELS[code] ?? code
}

// 색상 그룹 — 개별 코드 하드코딩 대신 사전 is_paid + 코드 계열로 판정
type ColorGroup =
  | 'paid'
  | 'organic-search'
  | 'blog-ext'
  | 'internal'
  | 'social'
  | 'kakao'
  | 'referral'
  | 'direct'

const PAID_SUFFIXES = ['-ads', '-search', '-brand', '-display', '-powerlink', '-bizboard']

function colorGroup(code: string | null, dict?: ChannelDict): ColorGroup {
  if (!code || code === 'direct') return 'direct'
  if (code === 'internal' || code === 'internal-blog' || code === 'site') return 'internal'
  if (code === 'referral-blog') return 'blog-ext'
  if (code === 'social-organic') return 'social'
  if (code === 'kakao') return 'kakao'

  // 사전에 있으면 is_paid 가 진실
  const dictEntry = dict?.[code]
  if (dictEntry) return dictEntry.isPaid ? 'paid' : 'organic-search'

  // 사전에 없으면 코드 계열로 추정
  if (code.endsWith('-organic')) return 'organic-search'
  if (PAID_SUFFIXES.some((s) => code.endsWith(s))) return 'paid'
  return 'referral'
}

const CHIP_STYLES: Record<ColorGroup, string> = {
  paid: 'bg-violet-500/20 text-violet-300',
  'organic-search': 'bg-blue-500/20 text-blue-300',
  'blog-ext': 'bg-orange-500/20 text-orange-300',
  internal: 'bg-emerald-500/20 text-emerald-300',
  social: 'bg-pink-500/20 text-pink-300',
  kakao: 'bg-yellow-500/20 text-yellow-300',
  referral: 'bg-amber-500/15 text-amber-300',
  direct: 'bg-ink-700 text-ink-300',
}

const BADGE_STYLES: Record<ColorGroup, string> = {
  paid: 'bg-violet-500/20 text-violet-200 border-violet-500/40',
  'organic-search': 'bg-blue-500/20 text-blue-200 border-blue-500/40',
  'blog-ext': 'bg-orange-500/20 text-orange-200 border-orange-500/40',
  internal: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40',
  social: 'bg-pink-500/20 text-pink-200 border-pink-500/40',
  kakao: 'bg-yellow-500/20 text-yellow-200 border-yellow-500/40',
  referral: 'bg-amber-500/15 text-amber-200 border-amber-500/30',
  direct: 'bg-ink-700 text-ink-300 border-ink-600',
}

/** 목록용 칩 클래스 (border 없음) */
export function channelChipClass(code: string | null, dict?: ChannelDict): string {
  return CHIP_STYLES[colorGroup(code, dict)]
}

/** 상세 모달용 배지 클래스 (border 포함) */
export function channelBadgeClass(code: string | null, dict?: ChannelDict): string {
  return BADGE_STYLES[colorGroup(code, dict)]
}
