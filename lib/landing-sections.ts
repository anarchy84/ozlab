// ─────────────────────────────────────────────
// 마케터용 랜딩 섹션 빌더 — 공유 타입/기본값
//
// 의도:
//   - raw HTML 이 아니라 안전한 모듈 템플릿만 조립
//   - 기존 content_blocks(고정 문구/이미지 편집)와 분리
//   - page_path + slot_key 기준으로 각 페이지 중간에 삽입
// ─────────────────────────────────────────────

export const LANDING_MODULE_TYPES = ['text', 'image', 'split', 'cards', 'cta', 'faq'] as const

export type LandingModuleType = (typeof LANDING_MODULE_TYPES)[number]

export const LANDING_MODULE_LABELS: Record<LandingModuleType, string> = {
  text: '텍스트 섹션',
  image: '이미지 섹션',
  split: '텍스트+이미지',
  cards: '카드 묶음',
  cta: 'CTA 섹션',
  faq: 'FAQ 섹션',
}

export interface LandingCardContent {
  title?: string
  body?: string
}

export interface LandingFaqContent {
  q?: string
  a?: string
}

export interface LandingModuleContent {
  eyebrow?: string
  title?: string
  body?: string
  align?: 'left' | 'center'
  imageUrl?: string
  imageAlt?: string
  caption?: string
  reverse?: boolean
  buttonLabel?: string
  buttonHref?: string
  cards?: LandingCardContent[]
  faqs?: LandingFaqContent[]
}

export interface LandingSlotItem {
  id: string
  page_path: string
  slot_key: string
  item_type: LandingModuleType
  title: string | null
  content: LandingModuleContent
  sort_order: number
  is_active: boolean
  variant_key: string
  traffic_weight: number
  experiment_key: string | null
  note: string | null
  created_at?: string
  updated_at?: string
}

export type LandingSlotsByKey = Record<string, LandingSlotItem[]>

export interface LandingSlotDefinition {
  pagePath: string
  slotKey: string
  label: string
}

const SERVICE_PAGE_PATHS = [
  '/naver-pos',
  '/apple-pay-pos',
  '/internet',
  '/business/torder',
  '/business/cctv',
]

const SERVICE_PAGE_SLOTS = [
  { slotKey: 'page.after_hero', label: '히어로 아래' },
  { slotKey: 'page.after_intro', label: '소개 섹션 아래' },
  { slotKey: 'page.after_catalog', label: '상품/구성 섹션 아래' },
  { slotKey: 'page.after_proof', label: '근거/지표 섹션 아래' },
  { slotKey: 'page.after_guide', label: '가이드 섹션 아래' },
  { slotKey: 'page.after_process', label: '진행 방식 섹션 아래' },
  { slotKey: 'page.before_faq', label: 'FAQ 위' },
  { slotKey: 'page.before_consult', label: '상담 CTA 위' },
]

export const LANDING_SLOT_DEFINITIONS: LandingSlotDefinition[] = [
  { pagePath: '/', slotKey: 'home.after_hero', label: '홈 히어로 아래' },
  { pagePath: '/', slotKey: 'home.after_painpoints', label: '불편 포인트 아래' },
  { pagePath: '/', slotKey: 'home.after_showcase', label: '쇼케이스 아래' },
  { pagePath: '/', slotKey: 'home.after_features', label: '핵심 기능 아래' },
  { pagePath: '/', slotKey: 'home.after_review', label: '리뷰 자동화 아래' },
  { pagePath: '/', slotKey: 'home.after_placeplus', label: '플레이스+ 아래' },
  { pagePath: '/', slotKey: 'home.after_mechanism', label: '작동 방식 아래' },
  { pagePath: '/', slotKey: 'home.after_pricing', label: '가격 안내 아래' },
  { pagePath: '/', slotKey: 'home.after_promotion', label: '프로모션 아래' },
  { pagePath: '/', slotKey: 'home.after_testimonials', label: '고객 후기 아래' },
  { pagePath: '/', slotKey: 'home.before_apply', label: 'FAQ 아래 · 상담폼 위' },
  ...SERVICE_PAGE_PATHS.flatMap((pagePath) =>
    SERVICE_PAGE_SLOTS.map((slot) => ({ pagePath, ...slot }))
  ),
  { pagePath: '/marketing-support', slotKey: 'marketing.after_hero', label: '히어로 아래' },
  { pagePath: '/marketing-support', slotKey: 'marketing.after_benefits', label: '지원 내용 아래' },
  { pagePath: '/marketing-support', slotKey: 'marketing.after_why', label: '플레이스 설명 아래' },
  { pagePath: '/marketing-support', slotKey: 'marketing.before_cta', label: '신청 CTA 위' },
  { pagePath: '/marketing-support', slotKey: 'marketing.before_faq', label: 'FAQ 위' },
]

export function isLandingModuleType(value: unknown): value is LandingModuleType {
  return typeof value === 'string' && LANDING_MODULE_TYPES.includes(value as LandingModuleType)
}

export function getLandingSlotLabel(pagePath: string, slotKey: string): string {
  return (
    LANDING_SLOT_DEFINITIONS.find((slot) => slot.pagePath === pagePath && slot.slotKey === slotKey)
      ?.label ?? slotKey
  )
}

export function getDefaultLandingModuleContent(type: LandingModuleType): LandingModuleContent {
  switch (type) {
    case 'text':
      return {
        eyebrow: 'NEW SECTION',
        title: '새로운 메시지를 입력하세요.',
        body: '마케터가 캠페인 목적에 맞게 설명 문구를 추가할 수 있는 텍스트 섹션입니다.',
        align: 'left',
      }
    case 'image':
      return {
        title: '이미지 섹션',
        imageUrl: '',
        imageAlt: '랜딩 섹션 이미지',
        caption: '',
      }
    case 'split':
      return {
        eyebrow: 'OZLAB PAY',
        title: '이미지와 설명을 함께 보여주세요.',
        body: '상품 사진, 혜택 이미지, 비교 이미지 등과 설명을 한 화면에서 자연스럽게 보여주는 섹션입니다.',
        imageUrl: '',
        imageAlt: '설명 이미지',
        reverse: false,
        buttonLabel: '상담 신청하기',
        buttonHref: '/#apply',
      }
    case 'cards':
      return {
        eyebrow: 'BENEFITS',
        title: '핵심 혜택을 카드로 정리하세요.',
        cards: [
          { title: '혜택 1', body: '첫 번째 혜택을 입력하세요.' },
          { title: '혜택 2', body: '두 번째 혜택을 입력하세요.' },
          { title: '혜택 3', body: '세 번째 혜택을 입력하세요.' },
        ],
      }
    case 'cta':
      return {
        eyebrow: '무료 상담',
        title: '지금 매장 상황에 맞는 구성을 받아보세요.',
        body: '신청 후 담당자가 영업일 기준 24시간 내 연락드립니다.',
        buttonLabel: '상담 신청하기',
        buttonHref: '/#apply',
      }
    case 'faq':
      return {
        title: '자주 묻는 질문',
        faqs: [
          { q: '여기에 질문을 입력하세요.', a: '답변 내용을 입력하세요.' },
          { q: '두 번째 질문을 입력하세요.', a: '답변 내용을 입력하세요.' },
        ],
      }
  }
}

function normalizeContent(value: unknown): LandingModuleContent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as LandingModuleContent
}

export function normalizeLandingSlotItem(row: Record<string, unknown>): LandingSlotItem {
  const itemType = isLandingModuleType(row.item_type) ? row.item_type : 'text'
  return {
    id: String(row.id ?? ''),
    page_path: String(row.page_path ?? '/'),
    slot_key: String(row.slot_key ?? ''),
    item_type: itemType,
    title: typeof row.title === 'string' ? row.title : null,
    content: normalizeContent(row.content),
    sort_order: Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : 0,
    is_active: row.is_active !== false,
    variant_key: typeof row.variant_key === 'string' && row.variant_key.trim() ? row.variant_key : 'A',
    traffic_weight: Number.isFinite(Number(row.traffic_weight)) ? Number(row.traffic_weight) : 100,
    experiment_key: typeof row.experiment_key === 'string' && row.experiment_key.trim()
      ? row.experiment_key
      : null,
    note: typeof row.note === 'string' && row.note.trim() ? row.note : null,
    created_at: typeof row.created_at === 'string' ? row.created_at : undefined,
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : undefined,
  }
}

export function landingFaqsForSlots(slots: LandingSlotsByKey): Array<{ q: string; a: string }> {
  return Object.values(slots)
    .flat()
    .filter((item) => item.item_type === 'faq')
    .flatMap((item) => item.content.faqs ?? [])
    .map((faq) => ({
      q: typeof faq.q === 'string' ? faq.q.trim() : '',
      a: typeof faq.a === 'string' ? faq.a.trim() : '',
    }))
    .filter((faq) => faq.q && faq.a)
}
