// ─────────────────────────────────────────────
// 콘텐츠 글 SEO 점수 계산 — 3-Tier 자체 랭킹 시스템
//
// Tier 1 (40%) : 기본 SEO (RankMath류 7항목)
// Tier 2 (30%) : 네이버 다이아 알고리즘 휴리스틱 (자체)
// Tier 3 (30%) : 구글 EEAT 알고리즘 휴리스틱 (자체)
//
// 모든 점수는 0~100 정수, 종합 점수 + S/A/B/C 등급 반환.
// 입력은 HTML body + 메타 정보. 외부 의존성 없음 (서버·클라 양쪽 동작).
// ─────────────────────────────────────────────

export interface SeoInput {
  title: string
  metaTitle?: string | null
  metaDescription?: string | null
  slug: string
  bodyHtml: string
  focusKeyword: string
  authorName?: string | null
  updatedAt?: string | null
}

export interface SeoCheck {
  label: string
  pass: boolean
  weight: number      // 가중치 (해당 Tier 내에서)
  info: string
}

export interface TierResult {
  score: number       // 0~100
  checks: SeoCheck[]
}

export interface SeoResult {
  tier1: TierResult   // 기본 SEO
  tier2: TierResult   // 네이버 다이아
  tier3: TierResult   // 구글 EEAT
  total: number       // 0~100 (40 + 30 + 30 가중평균)
  grade: 'S' | 'A' | 'B' | 'C'
}

// ─────────────────────────────────────────────
// 유틸 — HTML 파싱 (서버·클라 모두 동작)
// ─────────────────────────────────────────────
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function countMatches(text: string, pattern: RegExp): number {
  const m = text.match(pattern)
  return m ? m.length : 0
}

function tagCount(html: string, tag: string): number {
  const re = new RegExp(`<${tag}[\\s>]`, 'gi')
  return countMatches(html, re)
}

// 외부 권위 도메인 화이트리스트 (네이버·정부·협회 등)
const AUTHORITY_DOMAINS = [
  'naver.com', 'kakao.com', 'daum.net',
  'go.kr', 'or.kr',                    // 정부 / 공공
  'wikipedia.org', 'wikidata.org',
  'mss.go.kr',                         // 중소벤처기업부
  'kosbi.re.kr', 'kssa.or.kr',         // 협회
]

function externalLinks(html: string, currentDomain = 'ozlabpay.kr'): string[] {
  const re = /href=["']https?:\/\/([^"'\/]+)/gi
  const matches = Array.from(html.matchAll(re))
  return matches
    .map(m => m[1].toLowerCase())
    .filter(d => !d.includes(currentDomain))
}

function isAuthorityDomain(domain: string): boolean {
  return AUTHORITY_DOMAINS.some(a => domain.includes(a))
}

// ─────────────────────────────────────────────
// Tier 1 : 기본 SEO (RankMath류) — 가중치 합 100
// ─────────────────────────────────────────────
function calcTier1(input: SeoInput): TierResult {
  const { title, metaDescription, bodyHtml, focusKeyword } = input
  const kw = focusKeyword.trim().toLowerCase()
  const titleLower = title.toLowerCase()
  const plain = stripHtml(bodyHtml).toLowerCase()
  const descLower = (metaDescription ?? '').toLowerCase()

  const checks: SeoCheck[] = []

  if (!kw) {
    return {
      score: 0,
      checks: [{
        label: '포커스 키워드 미입력',
        pass: false,
        weight: 100,
        info: '오른쪽 패널에서 포커스 키워드를 입력해야 점수 계산이 시작됩니다.',
      }],
    }
  }

  // 1) 제목에 키워드 — 20점
  const inTitle = titleLower.includes(kw)
  checks.push({
    label: '제목(H1)에 키워드 포함',
    pass: inTitle,
    weight: 20,
    info: inTitle ? '제목에 키워드가 들어 있습니다.' : '제목에 포커스 키워드를 자연스럽게 넣어 주세요.',
  })

  // 2) 첫 150자에 키워드 — 15점
  const firstChunk = plain.substring(0, 150)
  const inFirst = firstChunk.includes(kw)
  checks.push({
    label: '첫 문단에 키워드 포함',
    pass: inFirst,
    weight: 15,
    info: inFirst ? '도입부에 키워드가 있습니다.' : '글의 첫 150자 안에 키워드를 넣어 주세요.',
  })

  // 3) 키워드 밀도 0.5~3% — 15점
  const words = plain.split(/\s+/).filter(Boolean).length
  const kwCount = (plain.match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
  const density = words > 0 ? (kwCount / words) * 100 : 0
  const densityOk = density >= 0.5 && density <= 3
  checks.push({
    label: `키워드 밀도 ${density.toFixed(2)}%`,
    pass: densityOk,
    weight: 15,
    info: density < 0.5
      ? '키워드 사용이 적습니다. 0.5~3% 권장.'
      : density > 3
        ? '키워드가 너무 많습니다. 부자연스러워 보일 수 있어요.'
        : '적절한 밀도입니다.',
  })

  // 4) 메타 설명에 키워드 — 10점
  const inDesc = descLower.includes(kw)
  checks.push({
    label: '메타 설명에 키워드 포함',
    pass: inDesc,
    weight: 10,
    info: inDesc ? '메타 설명에 키워드가 있습니다.' : '메타 설명에도 키워드를 포함해 주세요.',
  })

  // 5) H2/H3 사용 — 15점
  const hasH2 = /<h[23][\s>]/i.test(bodyHtml)
  checks.push({
    label: '소제목(H2/H3) 사용',
    pass: hasH2,
    weight: 15,
    info: hasH2 ? '소제목으로 글이 구조화돼 있습니다.' : '소제목(H2/H3)을 추가해 글을 나눠 주세요.',
  })

  // 6) 이미지 alt에 키워드 — 10점
  const hasImages = /<img[\s>]/i.test(bodyHtml)
  const altMatches = bodyHtml.match(/alt=["']([^"']*)["']/gi) || []
  const altsLower = altMatches.map(a => a.toLowerCase())
  const hasKwInAlt = altsLower.some(a => a.includes(kw))
  const altPass = !hasImages || hasKwInAlt
  checks.push({
    label: '이미지 alt 태그에 키워드',
    pass: altPass,
    weight: 10,
    info: !hasImages
      ? '이미지가 없습니다. 이미지를 추가하면 SEO·다이아 점수에 도움돼요.'
      : hasKwInAlt
        ? 'alt 텍스트에 키워드가 있습니다.'
        : '이미지 alt 텍스트에 키워드를 포함하세요.',
  })

  // 7) 내부링크 — 15점
  const hasInternalLink = /href=["']\/(?!\/)/i.test(bodyHtml)
  checks.push({
    label: '내부 링크 포함 (다른 글·홈)',
    pass: hasInternalLink,
    weight: 15,
    info: hasInternalLink ? '내부 링크가 있습니다.' : '관련 글이나 홈으로 가는 내부 링크를 추가하세요.',
  })

  const score = Math.round(
    checks.reduce((sum, c) => sum + (c.pass ? c.weight : 0), 0)
  )
  return { score, checks }
}

// ─────────────────────────────────────────────
// Tier 2 : 네이버 다이아 알고리즘 휴리스틱
// ─────────────────────────────────────────────
function calcTier2(input: SeoInput): TierResult {
  const { bodyHtml, focusKeyword } = input
  const plain = stripHtml(bodyHtml)
  const checks: SeoCheck[] = []

  // 1) 본문 길이 1500자 이상 — 20점
  const len = plain.length
  const lenPass = len >= 1500
  checks.push({
    label: `본문 길이 ${len.toLocaleString()}자`,
    pass: lenPass,
    weight: 20,
    info: lenPass ? '충분한 길이입니다.' : '1,500자 이상이 다이아 점수에 유리합니다.',
  })

  // 2) 이미지 2개 이상 — 15점
  const imgCount = tagCount(bodyHtml, 'img')
  const imgPass = imgCount >= 2
  checks.push({
    label: `이미지 ${imgCount}개`,
    pass: imgPass,
    weight: 15,
    info: imgPass ? '시각 자료가 충분합니다.' : '본문 이미지를 2개 이상 넣어 주세요.',
  })

  // 3) H2 3개 이상 (구조화) — 15점
  const h2Count = tagCount(bodyHtml, 'h2')
  const h2Pass = h2Count >= 3
  checks.push({
    label: `H2 소제목 ${h2Count}개`,
    pass: h2Pass,
    weight: 15,
    info: h2Pass ? '글이 잘 구조화돼 있습니다.' : '주요 섹션 3개 이상을 H2 로 구분하세요.',
  })

  // 4) 표 또는 리스트 사용 — 10점
  const hasStructure = /<(table|ul|ol)[\s>]/i.test(bodyHtml)
  checks.push({
    label: '표 또는 목록 사용',
    pass: hasStructure,
    weight: 10,
    info: hasStructure ? '구조화 요소가 있습니다.' : '표·목록을 활용하면 다이아 점수가 오릅니다.',
  })

  // 5) 외부 권위 링크 — 10점
  const extDomains = externalLinks(bodyHtml)
  const authorityCount = extDomains.filter(isAuthorityDomain).length
  const authPass = authorityCount > 0
  checks.push({
    label: `권위 사이트 인용 ${authorityCount}개`,
    pass: authPass,
    weight: 10,
    info: authPass
      ? '네이버·정부·협회 등 권위 사이트 인용이 있습니다.'
      : '근거가 되는 외부 권위 사이트(naver/go.kr 등)를 1개 이상 인용하세요.',
  })

  // 6) 키워드 자연 분포 (밀도 1~2%) — 15점
  const kw = focusKeyword.trim().toLowerCase()
  const plainLower = plain.toLowerCase()
  const words = plainLower.split(/\s+/).filter(Boolean).length
  const kwHits = kw
    ? (plainLower.match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
    : 0
  const density = words > 0 ? (kwHits / words) * 100 : 0
  const naturalPass = density >= 1 && density <= 2
  checks.push({
    label: `자연스러운 키워드 분포 (${density.toFixed(2)}%)`,
    pass: naturalPass,
    weight: 15,
    info: naturalPass
      ? '다이아 선호 분포입니다 (1~2%).'
      : '1~2% 분포가 다이아에 가장 유리합니다.',
  })

  // 7) 모바일 가독성 (한 문장 평균 60자 이하) — 15점
  const sentences = plain.split(/[.!?。]\s+/).filter(s => s.length > 0)
  const avgLen = sentences.length > 0
    ? sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length
    : 0
  const readPass = avgLen > 0 && avgLen <= 60
  checks.push({
    label: `평균 문장 길이 ${Math.round(avgLen)}자`,
    pass: readPass,
    weight: 15,
    info: readPass
      ? '모바일에서 읽기 좋은 문장 길이입니다.'
      : '한 문장 60자 이하가 모바일 가독성에 좋습니다.',
  })

  const score = Math.round(
    checks.reduce((sum, c) => sum + (c.pass ? c.weight : 0), 0)
  )
  return { score, checks }
}

// ─────────────────────────────────────────────
// Tier 3 : 구글 EEAT 휴리스틱
// ─────────────────────────────────────────────
const EXPERIENCE_PATTERNS = [
  '직접', '실제로', '써봤', '운영해', '경험', '사례', '실측', '측정',
  '확인했', '저희', '우리 매장', '제가',
]

function calcTier3(input: SeoInput): TierResult {
  const { bodyHtml, authorName, updatedAt } = input
  const plain = stripHtml(bodyHtml)
  const plainLower = plain.toLowerCase()
  const checks: SeoCheck[] = []

  // 1) Experience — 직접 경험어 — 25점
  const expHits = EXPERIENCE_PATTERNS.filter(p => plainLower.includes(p)).length
  const expPass = expHits >= 2
  checks.push({
    label: `Experience: 경험어 ${expHits}개`,
    pass: expPass,
    weight: 25,
    info: expPass
      ? '직접 경험을 보여 주는 표현이 있습니다.'
      : '"직접", "실제로", "사례" 등 경험을 드러내는 표현을 2개 이상 넣어 주세요.',
  })

  // 2) Expertise — 수치·단위 — 25점
  const numberHits = countMatches(plain, /\d+\s*(%|원|만원|건|회|배|시간|일|개|점|위|차|위치)/g)
  const expertPass = numberHits >= 3
  checks.push({
    label: `Expertise: 수치·단위 ${numberHits}개`,
    pass: expertPass,
    weight: 25,
    info: expertPass
      ? '구체적인 수치가 충분합니다.'
      : '%, 원, 건, 배 등 수치를 3개 이상 넣어 주세요.',
  })

  // 3) Authoritativeness — 외부 인용 — 25점
  const extLinks = externalLinks(bodyHtml).length
  const authPass = extLinks >= 1
  checks.push({
    label: `Authoritativeness: 외부 링크 ${extLinks}개`,
    pass: authPass,
    weight: 25,
    info: authPass
      ? '외부 출처가 인용돼 있습니다.'
      : '근거가 되는 외부 사이트 링크를 1개 이상 추가하세요.',
  })

  // 4) Trustworthiness — 작성자·업데이트일·출처 — 25점
  // 글 자체의 author_name 이 채워지고, 본문에 "출처"·"참고" 키워드가 있으면 만점 후보
  const hasAuthor = !!(authorName && authorName.trim().length > 0)
  const hasUpdated = !!updatedAt
  const hasSource = /(출처|참고|reference|source)/i.test(plain)
  const trustHits = [hasAuthor, hasUpdated, hasSource].filter(Boolean).length
  const trustPass = trustHits >= 2
  checks.push({
    label: `Trust: 작성자·갱신일·출처 ${trustHits}/3`,
    pass: trustPass,
    weight: 25,
    info: trustPass
      ? '신뢰 신호가 충분합니다.'
      : '작성자명·업데이트일·출처 표기 중 2개 이상을 채워 주세요.',
  })

  const score = Math.round(
    checks.reduce((sum, c) => sum + (c.pass ? c.weight : 0), 0)
  )
  return { score, checks }
}

// ─────────────────────────────────────────────
// 종합 점수 + 등급
// ─────────────────────────────────────────────
function computeGrade(total: number): SeoResult['grade'] {
  if (total >= 85) return 'S'
  if (total >= 70) return 'A'
  if (total >= 50) return 'B'
  return 'C'
}

export function calcSeoScore(input: SeoInput): SeoResult {
  const tier1 = calcTier1(input)
  const tier2 = calcTier2(input)
  const tier3 = calcTier3(input)

  // 가중평균 (40 + 30 + 30)
  const total = Math.round(tier1.score * 0.4 + tier2.score * 0.3 + tier3.score * 0.3)
  const grade = computeGrade(total)

  return { tier1, tier2, tier3, total, grade }
}

// ─────────────────────────────────────────────
// 점수 캐시용 직렬화 (DB seo_scores jsonb)
// ─────────────────────────────────────────────
export function serializeScoreCache(r: SeoResult) {
  return {
    tier1: r.tier1.score,
    tier2: r.tier2.score,
    tier3: r.tier3.score,
    total: r.total,
    grade: r.grade,
    calculated_at: new Date().toISOString(),
  }
}
