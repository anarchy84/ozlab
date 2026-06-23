'use client'

// ─────────────────────────────────────────────
// MarketingPackageLanding — /marketing-package
//
// "매장 온라인 노출·운영 패키지" — 초기 셋업 + 월 운영 3티어 + 애드온.
//   · 모든 카피 = content_blocks 인라인 편집 (blockKey prefix = 'package.')
//   · 이미지 슬롯 = EditableVisualSlot (기본 레이아웃 → 어드민이 이미지로 교체 가능)
//   · 랜딩 슬롯 = LandingSlot (마케터가 섹션 사이에 모듈 삽입)
//   · CTA = 페이지 하단 <ApplyForm/> (#apply) 로 스크롤 → /api/consultations 연동
//   · 스티키 CTA 바 = 전화 + 견적신청(#apply 스크롤)
// ─────────────────────────────────────────────

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from '@/components/icons'
import { EditableText } from '@/components/editable/EditableText'
import { EditableVisualSlot } from '@/components/editable/EditableVisualSlot'
import { useBlocks } from '@/components/editable/BlocksProvider'
import { ApplyForm } from '@/components/sections/ApplyForm'
import { LandingSlot } from '@/components/landing/LandingSlot'
import { pickImageOrUndef, pickTextOrUndef } from '@/lib/content-blocks'
import { SITE_PHONE, SITE_PHONE_HREF } from '@/lib/contact'
import { marketingPackageFaqsForBlocks } from '@/lib/marketing-package-faqs'
import { formatNum, formatWon } from '@/lib/marketing-package-pricing'
import type { LandingSlotsByKey } from '@/lib/landing-sections'

const PAGE_PATH = '/marketing-package'
const k = (s: string) => `package.${s}`

// ── 정적 콘텐츠(카피는 EditableText 로 덮어쓰기 가능) ──
const introStats = [
  { label: '누적 가입 매장', value: '12,400+', sub: '2026년 5월 기준' },
  { label: '평균 콜백 시간', value: '47분', sub: '전담 매니저 직통' },
  { label: '가입 만족도', value: '4.7 / 5.0', sub: '설치 후 1개월 응답' },
]

const problems = [
  { icon: <Icon.Clock s={22} />, quote: '시간이 없어요', desc: '매장 운영하면서 인스타·블로그·플레이스를 동시에 굴리는 건 사실상 불가능. 새벽에 폰 들고 올리다 잠드는 사장님이 수두룩합니다.' },
  { icon: <Icon.Search s={22} />, quote: '방법을 모르겠어요', desc: '"플레이스 SEO", "릴스 알고리즘", "체험단 모집" — 들어보긴 했지만 직접 하라고 하면 어디서부터 시작할지 막막합니다.' },
  { icon: <Icon.Won s={22} />, quote: '외주가 너무 비싸요', desc: '대행사에 통합으로 맡기면 월 100~200만원. 항목별로 쪼개도 30~50만원씩. 1년이면 자릿수가 천만 단위로 불어납니다.' },
  { icon: <Icon.Chart s={22} />, quote: '결과가 안 보여요', desc: '돈은 썼는데 매출이 올랐는지 모르겠음. 노출 늘었다는 보고서만 받고 손님 수는 그대로. 그래서 더 안 쓰게 됩니다.' },
]

const pillars = [
  {
    icon: <Icon.Sparkle s={24} />,
    num: 'PILLAR 01',
    title: 'AI 콘텐츠 자동 제작',
    desc: '매장 트렌드·상권에 맞춘 콘텐츠를 AI 엔진으로 주 1~2회 자동 생산. 외주 대비 1/4 비용.',
    bullets: ['숏폼 영상(릴스·틱톡·쇼츠) 월 4건', '로컬 SEO 블로그 글 월 4건', '업체 전용 클라우드 + 커스텀 프롬프트'],
  },
  {
    icon: <Icon.Megaphone s={24} />,
    num: 'PILLAR 02',
    title: '광고 운영 풀세팅',
    desc: '네이버·메타·플레이스·틱톡 4대 매체 광고 운영. 머신러닝 타겟팅 + 매주 최적화.',
    bullets: ['매체별 광고 계정 + 픽셀 설치', '플레이스 리워드·소상공인 광고 대행', '지역 잠재고객 AI 타겟팅 운영'],
  },
  {
    icon: <Icon.Share s={24} />,
    num: 'PILLAR 03',
    title: '멀티 채널 관리',
    desc: '제작한 콘텐츠를 인스타·틱톡·유튜브·플레이스에 자동 분배. 브랜드 일관성 유지.',
    bullets: ['인스타 릴스 / 틱톡 / 쇼츠 업로드', '플레이스 새 소식·이미지 월 1회', '채널 활성화 및 모니터링'],
  },
  {
    icon: <Icon.Users s={24} />,
    num: 'PILLAR 04',
    title: '바이럴 + 인플루언서',
    desc: '체험단 상시 모집 + 지역 마이크로 인플루언서 매칭으로 자연스러운 바이럴.',
    bullets: ['지역 기반 체험단 상시 모집 시스템', '잠재고객 세그먼트 데이터 인프라', '신청자 명단 매장에 전달'],
  },
]

// ── 초기 셋업 (1회성 · 1년 약정 시 무료) ──
const SETUP_PRICE = 550000
const setupItems = [
  { icon: <Icon.Share s={22} />, name: '공식 SNS 5종 개설·세팅', desc: '플레이스·당근마켓·카카오톡채널·네이버 공식블로그·인스타그램 개설 및 기본 세팅' },
  { icon: <Icon.Pin s={22} />, name: '네이버 플레이스 예약 세팅', desc: '예약 기능 활성화 + 옵션·안내 문구 구성 (예약 → 방문 → 리뷰 작성 동선 확보)' },
  { icon: <Icon.Video s={22} />, name: '브랜드 홍보영상 1편', desc: '매장 소개용 홍보영상 초기 1편 제작' },
  { icon: <Icon.Sparkle s={22} />, name: '카톡채널 가입 이벤트 설계', desc: '“채널 추가 시 혜택 증정” 이벤트 기획·세팅 (단골 마케팅 연계)' },
  { icon: <Icon.Doc s={22} />, name: '리뷰 참여 이벤트 키트', desc: '리뷰 유도 QR · 테이블 부착물 · POP 디자인 제작·제공' },
]

// ── 월 운영 3티어 ──
const tiers = [
  { key: 'lite', name: 'Lite', tagline: '시작하는 매장', monthly: 99000, yearly: 990000, featured: false },
  { key: 'standard', name: 'Standard', tagline: '가장 많이 선택', monthly: 200000, yearly: 2000000, featured: true },
  { key: 'pro', name: 'Pro', tagline: '본격 성장', monthly: 390000, yearly: 3900000, featured: false },
]

// 비교표 항목 — [라벨, Lite, Standard, Pro]
const features: { label: string; lite: string; standard: string; pro: string }[] = [
  { label: '10만 프로필 배포·부스팅', lite: '릴스 월 1회', standard: '릴스 월 1회', pro: '릴스 월 2회' },
  { label: 'SNS 콘텐츠 배포 (인스타·플레이스·블로그)', lite: '주 1회', standard: '주 1회', pro: '주 2회' },
  { label: '멀티채널 숏폼 배포', lite: '—', standard: '쇼츠 + 틱톡', pro: '쇼츠 + 틱톡 + 릴스' },
  { label: '세부 키워드 블로그', lite: '월 5회 / 키워드 3개', standard: '월 10회 / 키워드 5개', pro: '월 20회 / 키워드 8개' },
  { label: '플레이스 블로그 리뷰', lite: '월 3회', standard: '월 5회', pro: '월 10회' },
  { label: '플레이스 리워드', lite: '일 5회', standard: '일 10회', pro: '일 20회' },
  { label: '체험단 모집 글 게시', lite: '—', standard: '월 1회', pro: '월 2회' },
  { label: '성과 리포트', lite: '—', standard: '월 1회 자동', pro: '월 1회 + 담당자 콜' },
  { label: '응대', lite: '게시판', standard: '카카오톡 채팅', pro: '전담 매니저' },
]

// ── 선택 애드온 (티어 무관) ──
const addons = [
  {
    icon: <Icon.Megaphone s={24} />,
    title: '퍼포먼스 광고 집행 대행',
    desc: '네이버·메타·플레이스 유료광고 운영 대행. 운영 수수료는 광고비의 10~15% 또는 월 10만원 중 큰 금액.',
    price: '수수료 10~15% · 광고비 별도',
  },
  {
    icon: <Icon.Users s={24} />,
    title: '카카오톡 단골 마케팅',
    desc: '재방문·단골을 부르는 알림 메시지 운영. 셀프형부터 대행형까지 단계별로.',
    price: '셀프 9.9만 / 대행 월 5만~12만',
  },
  {
    icon: <Icon.Share s={24} />,
    title: 'Lite 멀티채널 배포 추가',
    desc: 'Lite 요금제에 쇼츠 + 틱톡 동시 배포 추가. (Standard·Pro는 기본 포함)',
    price: '월 30,000원',
  },
]

const steps = [
  { icon: <Icon.Phone s={22} />, num: 'STEP 01', title: '신청 + 매니저 상담', desc: '신청 후 전담 매니저가 연락. 매장 진단 + 티어·셋업 확정.' },
  { icon: <Icon.Target s={22} />, num: 'STEP 02', title: '초기 셋업', desc: '공식 SNS 5종 개설 + 플레이스 예약 + 홍보영상 + 리뷰 키트.' },
  { icon: <Icon.Video s={22} />, num: 'STEP 03', title: '채널 운영 시작', desc: '릴스·쇼츠·블로그·플레이스 배포 시작. 발행 전 카톡 컨펌.' },
  { icon: <Icon.Doc s={22} />, num: 'STEP 04', title: '월간 운영·리포트', desc: '매달 운영 + 성과 리포트. 사장님은 매장만 보세요.' },
]

export function MarketingPackageLanding({
  landingSlots = {},
}: {
  landingSlots?: LandingSlotsByKey
}) {
  const blocks = useBlocks()
  const faqs = marketingPackageFaqsForBlocks(blocks)
  const standard = tiers.find((t) => t.featured) ?? tiers[1]

  // 스티키 CTA 바 — 하단 신청폼이 보이면 숨김
  const applyRef = useRef<HTMLDivElement | null>(null)
  const [stickyHidden, setStickyHidden] = useState(false)
  useEffect(() => {
    const el = applyRef.current
    if (!el || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => setStickyHidden(e.isIntersecting)),
      { rootMargin: '0px 0px -160px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // 편집 가능한 텍스트 헬퍼
  const T = (
    key: string,
    fallback: string,
    opts?: { as?: 'span' | 'p' | 'h2' | 'h3' | 'h4' | 'dd' | 'div'; className?: string },
  ) => (
    <EditableText
      as={opts?.as ?? 'span'}
      blockKey={k(key)}
      fallback={fallback}
      value={pickTextOrUndef(blocks, k(key))}
      pagePath={PAGE_PATH}
      className={opts?.className}
    />
  )

  const renderLandingSlot = (slotKey: string, label: string) => (
    <LandingSlot pagePath={PAGE_PATH} slotKey={slotKey} label={label} items={landingSlots[slotKey]} />
  )

  return (
    <div className="bg-white text-ink-900">
      {/* ════════ HERO ════════ */}
      <section className="relative overflow-hidden bg-surface-dark py-section-tight text-white">
        <div className="pointer-events-none absolute right-[-12%] top-[-35%] h-[620px] w-[620px] rounded-full bg-brand-blue/20 blur-[130px]" />
        <div className="pointer-events-none absolute bottom-[-32%] left-[-15%] h-[460px] w-[460px] rounded-full bg-white/10 blur-[110px]" />
        <div className="container-oz relative">
          <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              {T('hero.eyebrow', '매장 SNS 통째 운영 · 자체 10만 팔로워 네트워크', { className: 'eyebrow-dark' })}
              <h1 className="mt-6 text-display text-white break-keep [text-wrap:balance]">
                <span className="block">
                  <span className="text-white/55 line-through decoration-2">{T('hero.title.strike', '대행사 월 200만원')}</span>
                  {T('hero.title.line1', '짜리를,')}
                </span>
                <span className="mt-1 block">
                  <mark className="hl-solid">{T('hero.title.highlight', '월 9만 9천원')}</mark>
                  {T('hero.title.line2', '부터.')}
                </span>
              </h1>
              <p className="mt-6 max-w-[560px] text-lg-fluid text-white/70 break-keep">
                {T(
                  'hero.sub',
                  '플레이스·인스타·틱톡·블로그·유튜브까지, 매장 SNS를 통째로 맡아 매달 대신 올려드립니다. 사장님은 장사만 하세요.',
                )}
              </p>

              {/* 가격 한눈에 — 3티어 + 셋업 무료 */}
              <div className="mt-8 rounded-xl border border-white/15 bg-white/[0.05] p-5 backdrop-blur">
                <p className="text-xs font-bold text-white/55">월 운영 패키지</p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  {tiers.map((t) => (
                    <div
                      key={t.key}
                      className={`rounded-lg border px-2 py-3 ${
                        t.featured ? 'border-brand-neon/50 bg-brand-blue/15' : 'border-white/10 bg-white/[0.04]'
                      }`}
                    >
                      <p className={`text-xs font-extrabold ${t.featured ? 'text-brand-neon' : 'text-white/70'}`}>
                        {t.name}
                        {t.featured ? ' ★' : ''}
                      </p>
                      <p className="mt-1 font-mono text-base font-extrabold text-white">
                        {formatNum(t.monthly / 10000)}만
                      </p>
                      <p className="text-[10px] text-white/45">원/월</p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-white/60">
                  + 초기 셋업 {formatWon(SETUP_PRICE)}{' '}
                  <span className="font-bold text-brand-neon">→ 1년 약정 시 무료</span> · 부가세 별도
                </p>
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                <a href="#quote" className="btn btn-primary lg">
                  {T('hero.cta.primary', '요금제 한눈에 보기')}
                  <Icon.Arrow s={18} />
                </a>
                <a href={SITE_PHONE_HREF} className="btn btn-ghost lg border-white/20 text-white hover:bg-white/10">
                  <Icon.Phone s={18} />
                  {T('hero.cta.tel', `${SITE_PHONE} 바로 전화`)}
                </a>
              </div>
              <p className="mt-4 text-sm text-white/45 break-keep">
                {T('hero.cta.micro', '신청 즉시 카톡 알림 + 전담 매니저 상담. 계약 강요 없이 매장에 맞는 티어만 안내합니다.')}
              </p>
            </div>

            {/* 히어로 비주얼 슬롯 — 기본: 아이콘 콜라주, 어드민이 이미지로 교체 가능 */}
            <EditableVisualSlot
              modeKey={k('hero.visual.mode')}
              modeValue={pickTextOrUndef(blocks, k('hero.visual.mode'))}
              imageKey={k('hero.visual.image')}
              imageValue={pickImageOrUndef(blocks, k('hero.visual.image'))}
              pagePath={PAGE_PATH}
              label="히어로 비주얼"
              imageLabel="매장 마케팅 대표 이미지"
              imageHint="매장 운영/콘텐츠 작업 화면 등 1200×900 권장"
              aspect="4/3"
              imageTheme="dark"
              imageClassName="rounded-2xl"
              defaultClassName="h-full"
            >
              <div className="grid h-full grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                {[
                  { icon: <Icon.Sparkle s={24} />, label: 'AI 콘텐츠' },
                  { icon: <Icon.Megaphone s={24} />, label: '광고 운영' },
                  { icon: <Icon.Share s={24} />, label: '멀티 채널' },
                  { icon: <Icon.Users s={24} />, label: '인플루언서' },
                ].map((tile, ti) => (
                  <div
                    key={`hero-tile-${ti}`}
                    className="flex flex-col items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-7 text-center"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-blue/20 text-brand-neon">
                      {tile.icon}
                    </span>
                    <span className="text-sm font-extrabold text-white/85">{tile.label}</span>
                  </div>
                ))}
              </div>
            </EditableVisualSlot>
          </div>
        </div>
      </section>

      {renderLandingSlot('package.after_hero', '히어로 아래')}

      {/* ════════ CHAPTER 01 · ABOUT ════════ */}
      <section className="py-section">
        <div className="container-oz">
          <div className="grid gap-10 lg:grid-cols-[1fr_0.85fr] lg:items-center">
            <div>
              {T('about.eyebrow', 'CHAPTER 01 · ABOUT', { className: 'eyebrow' })}
              <h2 className="mt-4 text-h1 text-ink-900 break-keep">
                {T('about.title.line1', '오즈랩페이가 누구냐고요?')}
                <br />
                <mark className="hl-solid">{T('about.title.highlight', '이미 매장 옆에 있던 사람')}</mark>
                {T('about.title.line2', '입니다.')}
              </h2>
              <p className="mt-5 max-w-[680px] text-lg-fluid text-ink-500 break-keep">
                {T(
                  'about.lead',
                  '오즈랩페이는 네이버 공식대행사이자 자체 10만 팔로워 채널 네트워크를 운영합니다. 매장에 필요한 온라인 노출 채널을 한 번에 세팅하고, 매달 콘텐츠를 만들어 대신 운영해 매장이 검색되고 보이게 만드는 게 이 패키지의 본질입니다.',
                )}
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {introStats.map((stat, si) => (
                  <div key={`stat-${si}`} className="rounded-xl border border-ink-150 bg-white p-5 shadow-sm">
                    {T(`about.stats.${si}.label`, stat.label, { as: 'p', className: 'text-xs font-bold text-ink-400' })}
                    {T(`about.stats.${si}.value`, stat.value, {
                      as: 'p',
                      className: 'mt-2 text-2xl font-extrabold text-ink-900',
                    })}
                    {T(`about.stats.${si}.sub`, stat.sub, { as: 'p', className: 'mt-1 text-xs text-ink-400' })}
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-start gap-3 rounded-xl border border-brand-blue/20 bg-brand-tint/50 p-5">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-blue/15 text-brand-deep">
                  <Icon.Shield s={20} />
                </span>
                <p className="text-[15px] leading-relaxed text-ink-700 break-keep">
                  {T(
                    'about.callout',
                    '흩어진 채널을 한 곳에서 — 플레이스·블로그·인스타·유튜브·틱톡·카카오·당근까지, 따로 놀던 채널을 오즈랩페이가 한 번에 세팅하고 매달 운영하며 성과 리포트로 확인시켜 드립니다.',
                  )}
                </p>
              </div>
            </div>

            {/* About 비주얼 슬롯 */}
            <EditableVisualSlot
              modeKey={k('about.visual.mode')}
              modeValue={pickTextOrUndef(blocks, k('about.visual.mode'))}
              imageKey={k('about.visual.image')}
              imageValue={pickImageOrUndef(blocks, k('about.visual.image'))}
              pagePath={PAGE_PATH}
              label="소개 비주얼"
              imageLabel="팀/대시보드/매장 이미지"
              imageHint="오즈랩페이 운영 화면이나 매장 사진 4:5 권장"
              aspect="4/5"
              defaultClassName="h-full"
            >
              <div className="flex h-full flex-col justify-center gap-4 rounded-2xl border border-ink-150 bg-gradient-to-br from-white to-brand-tint p-7">
                {[
                  { icon: <Icon.Search s={22} />, t: '검색되는 매장', d: '플레이스 + 블로그 SEO' },
                  { icon: <Icon.Video s={22} />, t: '보여지는 매장', d: '숏폼 · 릴스 자동 발행' },
                  { icon: <Icon.Chart s={22} />, t: '증명되는 매장', d: '매월 성과 리포트' },
                ].map((row, ri) => (
                  <div key={`about-row-${ri}`} className="flex items-center gap-4 rounded-xl bg-white/70 p-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-blue/12 text-brand-deep">
                      {row.icon}
                    </span>
                    <div>
                      <p className="font-extrabold text-ink-900">{row.t}</p>
                      <p className="text-sm text-ink-500">{row.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </EditableVisualSlot>
          </div>
        </div>
      </section>

      {renderLandingSlot('package.after_about', '회사 소개 아래')}

      {/* ════════ CHAPTER 02 · PROBLEM ════════ */}
      <section className="bg-ink-50 py-section">
        <div className="container-oz">
          <div className="mb-12 max-w-[780px]">
            {T('problem.eyebrow', 'CHAPTER 02 · WHY YOU NEED THIS', { className: 'eyebrow' })}
            <h2 className="mt-4 text-h1 text-ink-900 break-keep">
              {T('problem.title.line1', '가게는 열었는데,')}
              <br />
              <mark className="hl-solid">{T('problem.title.highlight', '손님이 안 옵니다.')}</mark>
            </h2>
            <p className="mt-4 text-lg-fluid text-ink-500 break-keep">
              {T(
                'problem.lead',
                '요즘 손님은 매장에 오기 전에 먼저 검색하고 비교합니다. 플레이스·SNS에 안 보이면 없는 가게나 마찬가지. 그런데 사장님은 이미 4가지 벽을 만나고 계실 겁니다.',
              )}
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {problems.map((p, pi) => (
              <article
                key={`problem-${pi}`}
                className="rounded-xl border border-ink-150 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-blue/40 hover:shadow-md"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink-100 text-ink-600">
                  {p.icon}
                </span>
                {T(`problem.cards.${pi}.quote`, p.quote, {
                  as: 'h3',
                  className: 'mt-5 text-h3 text-ink-900 break-keep',
                })}
                {T(`problem.cards.${pi}.desc`, p.desc, {
                  as: 'p',
                  className: 'mt-3 text-[15px] leading-relaxed text-ink-500 break-keep',
                })}
              </article>
            ))}
          </div>
        </div>
      </section>

      {renderLandingSlot('package.after_problem', '문제 섹션 아래')}

      {/* ════════ CHAPTER 03 · SOLUTION ════════ */}
      <section className="py-section">
        <div className="container-oz">
          <div className="mb-12 max-w-[820px]">
            {T('solution.eyebrow', 'CHAPTER 03 · SOLUTION', { className: 'eyebrow' })}
            <h2 className="mt-4 text-h1 text-ink-900 break-keep">
              {T('solution.title.line1', '사장님 채널을,')}
              <br />
              <mark className="hl-solid">{T('solution.title.highlight', '저희가 직접 키워')}</mark>
              {T('solution.title.line2', '드립니다.')}
            </h2>
            <p className="mt-4 text-lg-fluid text-ink-500 break-keep">
              {T(
                'solution.lead',
                '콘텐츠 제작, 광고 운영, 채널 관리, 인플루언서까지 — 매장 마케팅에 필요한 모든 작업을 오즈랩페이가 통째로 운영합니다. 사장님은 매장만 보세요.',
              )}
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {pillars.map((pillar, pi) => (
              <article key={`pillar-${pi}`} className="rounded-2xl border border-ink-150 bg-white p-7 shadow-sm md:p-8">
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-blue/12 text-brand-deep">
                    {pillar.icon}
                  </span>
                  <div>
                    {T(`solution.pillars.${pi}.num`, pillar.num, {
                      as: 'p',
                      className: 'text-xs font-extrabold tracking-[0.14em] text-brand-deep',
                    })}
                    {T(`solution.pillars.${pi}.title`, pillar.title, {
                      as: 'h3',
                      className: 'mt-1 text-h3 text-ink-900 break-keep',
                    })}
                  </div>
                </div>
                {T(`solution.pillars.${pi}.desc`, pillar.desc, {
                  as: 'p',
                  className: 'mt-4 text-[15px] leading-relaxed text-ink-500 break-keep',
                })}
                <ul className="mt-5 space-y-2.5">
                  {pillar.bullets.map((b, bi) => (
                    <li key={`pillar-${pi}-b-${bi}`} className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-blue/15 text-brand-deep">
                        <Icon.Check s={14} />
                      </span>
                      {T(`solution.pillars.${pi}.bullets.${bi}`, b, {
                        as: 'span',
                        className: 'text-[15px] text-ink-700 break-keep',
                      })}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {renderLandingSlot('package.after_solution', '솔루션(4필러) 아래')}

      {/* ════════ CHAPTER 04 · PRICING ════════ */}
      <section id="quote" className="scroll-mt-20 bg-ink-50 py-section">
        <div className="container-oz">
          <div className="mb-8 max-w-[820px]">
            {T('pricing.eyebrow', '요금 안내', { className: 'eyebrow' })}
            <h2 className="mt-4 text-h1 text-ink-900 break-keep [text-wrap:balance]">
              {T('pricing.title.line1', '초기 셋업 한 번,')}
              <br />
              <mark className="hl-solid">{T('pricing.title.highlight', '매달 알아서 운영')}</mark>
              {T('pricing.title.line2', '됩니다.')}
            </h2>
            <p className="mt-4 text-lg-fluid text-ink-500 break-keep">
              {T(
                'pricing.lead',
                '처음 한 번 채널을 세팅하고, 매달 Lite·Standard·Pro 중 매장에 맞는 요금제로 운영합니다. 1년 약정하면 초기 셋업비가 무료입니다.',
              )}
            </p>
          </div>

          {/* 운영 채널 띠 */}
          <div className="rounded-2xl border border-ink-150 bg-white p-5 shadow-sm">
            {T('pricing.channels.heading', '이런 채널을 직접 운영해 드립니다', {
              as: 'p',
              className: 'mb-4 text-sm font-extrabold text-ink-700',
            })}
            <div className="flex flex-wrap gap-2.5">
              {[
                { icon: <Icon.Pin s={20} />, label: '네이버 플레이스', color: 'text-brand-blue' },
                { icon: <Icon.Blog s={20} />, label: '네이버 블로그', color: 'text-[#03C75A]' },
                { icon: <Icon.Instagram s={20} />, label: '인스타그램', color: 'text-[#E1306C]' },
                { icon: <Icon.Youtube s={20} />, label: '유튜브 쇼츠', color: 'text-[#FF0000]' },
                { icon: <Icon.Tiktok s={20} />, label: '틱톡', color: 'text-ink-900' },
                { icon: <Icon.Sparkle s={20} />, label: '카카오톡 채널', color: 'text-[#FAB000]' },
                { icon: <Icon.Users s={20} />, label: '당근마켓', color: 'text-[#FF6F0F]' },
              ].map((ch, ci) => (
                <span
                  key={`channel-${ci}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-ink-150 bg-ink-50/60 px-3.5 py-2 text-sm font-bold text-ink-800"
                >
                  <span className={ch.color}>{ch.icon}</span>
                  {ch.label}
                </span>
              ))}
            </div>
          </div>

          {/* ① 초기 셋업 */}
          <div className="mt-6 overflow-hidden rounded-2xl border border-ink-150 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-150 bg-brand-tint/50 px-5 py-3">
              <span className="flex items-center gap-2 text-sm font-extrabold text-brand-deep">
                <Icon.Target s={16} /> {T('setup.heading', 'STEP 1 · 초기 셋업 (1회성)')}
              </span>
              <span className="text-xs font-bold text-ink-500">
                정가 <span className="font-mono">{formatWon(SETUP_PRICE)}</span>
                <span className="ml-1.5 rounded-full bg-brand-blue px-2 py-0.5 text-[11px] font-extrabold text-white">1년 약정 시 무료</span>
              </span>
            </div>
            <div className="grid gap-px bg-ink-100 sm:grid-cols-2">
              {setupItems.map((it, i) => (
                <div key={`setup-${i}`} className="flex items-start gap-3 bg-white px-5 py-4">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-deep">
                    {it.icon}
                  </span>
                  <div className="min-w-0">
                    {T(`setup.items.${i}.name`, it.name, { as: 'div', className: 'font-bold text-ink-900 break-keep' })}
                    {T(`setup.items.${i}.desc`, it.desc, {
                      as: 'div',
                      className: 'mt-0.5 text-xs text-ink-400 break-keep',
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ② 월 운영 3티어 */}
          <div className="mt-8">
            <p className="mb-4 flex items-center gap-2 text-sm font-extrabold text-brand-deep">
              <Icon.Clock s={16} /> {T('tiers.heading', 'STEP 2 · 매달 운영 요금제 (3종 중 선택)')}
            </p>

            {/* 모바일 — 티어 카드 */}
            <div className="grid gap-4 sm:hidden">
              {tiers.map((t) => (
                <div
                  key={`m-${t.key}`}
                  className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${
                    t.featured ? 'border-brand-blue/50 ring-2 ring-brand-blue/20' : 'border-ink-150'
                  }`}
                >
                  <div className={`px-5 py-4 ${t.featured ? 'bg-surface-dark text-white' : 'bg-ink-50'}`}>
                    <div className="flex items-baseline justify-between">
                      <span className="text-lg font-extrabold">{t.name}{t.featured ? ' ★' : ''}</span>
                      <span className={`text-xs font-bold ${t.featured ? 'text-brand-neon' : 'text-ink-400'}`}>{t.tagline}</span>
                    </div>
                    <div className="mt-2 flex items-end gap-2">
                      <span className="font-mono text-3xl font-extrabold">{formatNum(t.monthly)}</span>
                      <span className={`pb-1 text-sm ${t.featured ? 'text-white/70' : 'text-ink-500'}`}>원/월</span>
                    </div>
                    <p className={`text-xs ${t.featured ? 'text-white/55' : 'text-ink-400'}`}>연 {formatNum(t.yearly)}원 (선결제)</p>
                  </div>
                  <ul className="divide-y divide-ink-100">
                    {features.map((f, fi) => {
                      const val = f[t.key as 'lite' | 'standard' | 'pro']
                      return (
                        <li key={`m-${t.key}-${fi}`} className="flex items-start justify-between gap-3 px-5 py-2.5">
                          <span className="text-xs text-ink-500 break-keep">{f.label}</span>
                          <span className={`shrink-0 text-right text-xs font-bold break-keep ${val === '—' ? 'text-ink-300' : 'text-ink-900'}`}>
                            {val === '—' ? '미포함' : val}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                  <div className="p-4">
                    <a href="#apply" className={`btn w-full ${t.featured ? 'btn-primary' : 'btn-ghost'}`}>
                      {t.name} 신청
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* 데스크탑 — 비교표 */}
            <div className="hidden overflow-hidden rounded-2xl border border-ink-150 bg-white shadow-sm sm:block">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr>
                    <th className="w-[34%] border-b border-ink-150 px-5 py-4 align-bottom text-xs font-bold text-ink-400">제공 항목</th>
                    {tiers.map((t) => (
                      <th
                        key={`h-${t.key}`}
                        className={`border-b border-ink-150 px-4 py-4 text-center align-bottom ${
                          t.featured ? 'bg-brand-tint/50' : ''
                        }`}
                      >
                        <div className={`text-base font-extrabold ${t.featured ? 'text-brand-deep' : 'text-ink-900'}`}>
                          {t.name}{t.featured ? ' ★' : ''}
                        </div>
                        <div className="text-[11px] font-bold text-ink-400">{t.tagline}</div>
                        <div className="mt-2 font-mono text-xl font-extrabold text-ink-900">{formatNum(t.monthly)}<span className="text-xs font-bold text-ink-400">원/월</span></div>
                        <div className="text-[11px] text-ink-400">연 {formatNum(t.yearly)}원</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {features.map((f, fi) => (
                    <tr key={`r-${fi}`} className="border-b border-ink-100">
                      <td className="px-5 py-3 font-bold text-ink-800 break-keep">{f.label}</td>
                      {tiers.map((t) => {
                        const val = f[t.key as 'lite' | 'standard' | 'pro']
                        return (
                          <td
                            key={`c-${t.key}-${fi}`}
                            className={`px-4 py-3 text-center text-[13px] break-keep ${
                              t.featured ? 'bg-brand-tint/30' : ''
                            } ${val === '—' ? 'text-ink-300' : 'font-semibold text-ink-800'}`}
                          >
                            {val}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                  <tr>
                    <td className="px-5 py-4" />
                    {tiers.map((t) => (
                      <td key={`cta-${t.key}`} className={`px-4 py-4 text-center ${t.featured ? 'bg-brand-tint/50' : ''}`}>
                        <a href="#apply" className={`btn w-full ${t.featured ? 'btn-primary' : 'btn-ghost'}`}>
                          {t.name} 신청
                        </a>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-xs text-ink-400 break-keep">
              {T(
                'tiers.note',
                '연 약정(선결제)은 2개월분 할인 + 초기 셋업 무료 기준입니다. 예: Standard 월 결제 240만원 → 연 약정 200만원. 표시 가격은 모두 부가세 별도입니다.',
              )}
            </p>
          </div>
        </div>
      </section>

      {renderLandingSlot('package.after_pricing', '가격표 아래')}

      {/* ════════ CHAPTER 05 · OPTIONS ════════ */}
      <section className="py-section">
        <div className="container-oz">
          <div className="mb-10 max-w-[780px]">
            {T('options.eyebrow', '선택 애드온', { className: 'eyebrow' })}
            <h2 className="mt-4 text-h1 text-ink-900 break-keep">{T('options.title', '필요할 때 더하는 옵션')}</h2>
            <p className="mt-4 text-lg-fluid text-ink-500 break-keep">
              {T('options.lead', '티어와 무관하게 선택적으로 추가할 수 있는 항목입니다. 매장 상황에 맞춰 매니저가 안내합니다.')}
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {addons.map((opt, oi) => (
              <article key={`addon-${oi}`} className="rounded-2xl border border-ink-150 bg-white p-6 shadow-sm">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-blue/12 text-brand-deep">
                  {opt.icon}
                </span>
                {T(`options.cards.${oi}.title`, opt.title, {
                  as: 'h4',
                  className: 'mt-4 text-base font-extrabold text-ink-900 break-keep',
                })}
                {T(`options.cards.${oi}.desc`, opt.desc, {
                  as: 'p',
                  className: 'mt-2 text-sm leading-relaxed text-ink-500 break-keep',
                })}
                {T(`options.cards.${oi}.price`, opt.price, {
                  as: 'p',
                  className: 'mt-4 font-mono text-sm font-extrabold text-brand-deep break-keep',
                })}
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ CHAPTER 06 · PROCESS ════════ */}
      <section className="bg-ink-50 py-section">
        <div className="container-oz">
          <div className="mb-10 max-w-[780px]">
            {T('process.eyebrow', 'CHAPTER 06 · PROCESS', { className: 'eyebrow' })}
            <h2 className="mt-4 text-h1 text-ink-900 break-keep">{T('process.title', '신청 후 어떻게 진행되나요?')}</h2>
            <p className="mt-4 text-lg-fluid text-ink-500 break-keep">
              {T('process.lead', '신청부터 첫 발행까지 평균 7일. 사장님이 신경 쓸 일은 매장 이미지 소스 1번 전달뿐입니다.')}
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, si) => (
              <div key={`step-${si}`} className="relative rounded-xl border border-ink-150 bg-white p-6 shadow-sm">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-blue/12 text-brand-deep">
                  {step.icon}
                </span>
                {T(`process.steps.${si}.num`, step.num, {
                  as: 'p',
                  className: 'mt-5 text-xs font-extrabold tracking-[0.14em] text-brand-deep',
                })}
                {T(`process.steps.${si}.title`, step.title, {
                  as: 'h3',
                  className: 'mt-1 text-h3 text-ink-900 break-keep',
                })}
                {T(`process.steps.${si}.desc`, step.desc, {
                  as: 'p',
                  className: 'mt-2 text-sm leading-relaxed text-ink-500 break-keep',
                })}
              </div>
            ))}
          </div>
        </div>
      </section>

      {renderLandingSlot('package.after_process', '진행 방식 아래')}

      {renderLandingSlot('package.before_faq', 'FAQ 위')}

      {/* ════════ CHAPTER 07 · FAQ ════════ */}
      <section className="py-section">
        <div className="container-oz">
          <div className="mx-auto mb-10 max-w-[760px] text-center">
            {T('faq.eyebrow', 'CHAPTER 07 · FAQ', { className: 'eyebrow' })}
            <h2 className="mt-4 text-h1 text-ink-900 break-keep">{T('faq.title', '사장님들이 가장 많이 묻는 7가지')}</h2>
          </div>
          <div className="mx-auto max-w-[860px] divide-y divide-ink-150 rounded-2xl border border-ink-150 bg-white shadow-sm">
            {faqs.map((faq, index) => (
              <details key={`package-faq-${index}`} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 p-6 text-left text-base font-bold text-ink-900 break-keep [&::-webkit-details-marker]:hidden">
                  {T(`faq.items.${index}.q`, faq.q)}
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-600 transition-all group-open:rotate-45 group-open:bg-brand-blue group-open:text-white">
                    <Icon.Plus s={18} />
                  </span>
                </summary>
                {T(`faq.items.${index}.a`, faq.a, {
                  as: 'p',
                  className: 'px-6 pb-6 text-[15px] leading-relaxed text-ink-500 break-keep',
                })}
              </details>
            ))}
          </div>
        </div>
      </section>

      {renderLandingSlot('package.before_apply', '신청폼 위')}

      {/* ════════ 최종 CTA — 상담 신청 폼 (/api/consultations 연동) ════════ */}
      <div ref={applyRef}>
        <ApplyForm blocks={blocks} />
      </div>

      {/* ════════ 스티키 CTA 바 ════════ */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 flex border-t border-white/10 bg-surface-dark text-white shadow-[0_-8px_24px_rgba(0,0,0,0.18)] transition-transform duration-200 ${
          stickyHidden ? 'translate-y-full' : 'translate-y-0'
        }`}
      >
        <a
          href={SITE_PHONE_HREF}
          aria-label={`${SITE_PHONE} 전화하기`}
          className="flex flex-1 items-center justify-center gap-1.5 bg-white/[0.06] py-4 text-sm font-extrabold"
        >
          <Icon.Phone s={16} />
          <span className="hidden sm:inline">{SITE_PHONE} </span>전화
        </a>
        <a
          href="#quote"
          className="flex flex-1 items-center justify-center gap-1.5 border-x border-white/10 py-4 text-sm font-extrabold text-brand-neon"
        >
          <Icon.Won s={16} />
          견적 바로보기
        </a>
        <a href="#apply" className="flex flex-1 items-center justify-center gap-1.5 py-4 text-sm font-extrabold">
          상담 신청
          <Icon.Arrow s={16} />
        </a>
      </div>
      <div aria-hidden className="h-14" />
    </div>
  )
}
