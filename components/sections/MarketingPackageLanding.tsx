'use client'

// ─────────────────────────────────────────────
// MarketingPackageLanding — /marketing-package
//
// "월 12만 5천원, 매장 마케팅 본부 통째로" 오즈랩페이 마케팅 패키지 랜딩.
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

const pricingInitial = [
  { name: '네이버 플레이스 최적화 + SEO 설계', desc: '검색 노출 알고리즘 분석 + 키워드·해시태그 매칭', monthly: '₩150,000' },
  { name: 'AI 콘텐츠 생성 엔진·API 환경 연동', desc: '업체 전용 클라우드 + 프롬프트 커스텀 세팅', monthly: '₩150,000' },
  { name: '광고 매체 초기 계정 연동 + 픽셀 설치', desc: 'Meta·TikTok·네이버 광고 계정 + 트래킹 픽셀', monthly: '₩150,000' },
  { name: '인플루언서 매칭 + 타겟 데이터 인프라', desc: '체험단 모집 폼 + 지역 세그먼트 데이터 구축', monthly: '₩150,000' },
]

const pricingMonthly = [
  { name: 'AI 숏폼 영상 기획·제작', desc: '매장 맞춤 릴스/틱톡/쇼츠 주 1회 · 월 4건', monthly: '₩400,000', yearly: '₩4,800,000' },
  { name: '지역 인근 AI 타겟팅 광고 운영', desc: '매체 최적화·머신러닝 모니터링 (실비 별도)', monthly: '₩50,000', yearly: '₩600,000' },
  { name: '로컬 최적화 블로그 콘텐츠 발행', desc: '지역 상권 검색 노출 키워드 원고 · 월 4건', monthly: '₩200,000', yearly: '₩2,400,000' },
  { name: 'SNS 멀티 채널 업로드·브랜드 관리', desc: '인스타·틱톡·유튜브 쇼츠 채널 케어', monthly: '₩250,000', yearly: '₩3,000,000' },
  { name: '바이럴 체험단 + 마이크로 인플루언서 모집', desc: '지역 기반 상시 모집 + 신청 명단 전달', monthly: '₩200,000', yearly: '₩2,400,000' },
  { name: '네이버 플레이스 최적화 관리', desc: '월 1회 새 소식·이미지 + SEO 순위 최적화', monthly: '₩150,000', yearly: '₩1,800,000' },
  { name: '플레이스 리워드 광고 운영 대행', desc: '트래픽·저장·알림 받기 활성화 (실비 별도)', monthly: '₩100,000', yearly: '₩1,200,000' },
  { name: '소상공인·플레이스 검색 광고 운영 대행', desc: '지역 검색 광고 최적화 (광고 실비 별도)', monthly: '₩100,000', yearly: '₩1,200,000' },
]

const options = [
  { premium: false, tag: '실비 부담', title: '인스타·틱톡 매체 광고비', desc: '지역 타겟팅 광고 집행에 쓰이는 순수 광고 매체비.', price: '광고주 실비' },
  { premium: false, tag: '실비 부담', title: '플레이스 리워드 광고 실비', desc: '플레이스 리워드 유입에 쓰이는 현금성 실비.', price: '광고주 실비' },
  { premium: false, tag: '실비 부담', title: '플레이스 소상공인 광고 실비', desc: '네이버 검색·플레이스 노출 CPC 광고 실비.', price: '광고주 실비' },
  { premium: true, tag: '프리미엄', title: '현장 출장 기획·촬영·편집', desc: '전문 마케터 방문 촬영 + 고해상도 장비 + 콘티 기획 + 고급 편집. 패키지 외 별도.', price: '₩500,000 / 건' },
]

const steps = [
  { icon: <Icon.Phone s={22} />, num: 'STEP 01', title: '신청 + 매니저 콜백', desc: '24시간 내 전담 매니저가 직접 연락. 매장 진단·견적 확정.' },
  { icon: <Icon.Target s={22} />, num: 'STEP 02', title: '초기 세팅 (4종)', desc: '플레이스 SEO + AI 엔진 + 광고 계정 + 데이터 인프라.' },
  { icon: <Icon.Video s={22} />, num: 'STEP 03', title: '콘텐츠 첫 발행', desc: '매장 이미지 1회 전달 → 7일 내 첫 숏폼 + 블로그.' },
  { icon: <Icon.Doc s={22} />, num: 'STEP 04', title: '월간 운영·리포트', desc: '자동 운영 + 매월 카톡 리포트. 사장님은 매장만.' },
]

export function MarketingPackageLanding({ landingSlots = {} }: { landingSlots?: LandingSlotsByKey }) {
  const blocks = useBlocks()
  const faqs = marketingPackageFaqsForBlocks(blocks)

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
              {T('hero.eyebrow', '📐 N페이커넥트 사장님 한정 제안', { className: 'eyebrow-dark' })}
              <h1 className="mt-6 text-display text-white break-keep [text-wrap:balance]">
                <span className="block">{T('hero.title.line1', '혼자 하는 마케팅은 그만.')}</span>
                <span className="mt-1 block">
                  <mark className="hl-solid">{T('hero.title.highlight', '월 12만 5천원')}</mark>
                  {T('hero.title.line2', '이면')}
                </span>
                <span className="mt-1 block">
                  <span className="text-white/55 line-through decoration-2">
                    {T('hero.title.strike', '2,005만원짜리')}
                  </span>{' '}
                  {T('hero.title.line3', '마케팅 본부가 매장에.')}
                </span>
              </h1>
              <p className="mt-6 max-w-[640px] text-lg-fluid text-white/70 break-keep">
                {T(
                  'hero.sub',
                  '단말기·인터넷·CCTV·키오스크 다 갖추셨으니, 이제 매출 만들 시간입니다. 오즈랩페이가 매장 마케팅 본부가 되어드립니다.',
                )}
              </p>

              {/* 쇼크 가격 카드 */}
              <div className="mt-8 rounded-xl border border-white/15 bg-white/[0.05] p-6 backdrop-blur">
                <div className="flex items-baseline justify-between border-b border-white/10 pb-3">
                  {T('hero.price.originalLabel', '정상가 (연간)', { className: 'text-sm font-bold text-white/55' })}
                  {T('hero.price.original', '₩20,050,000', {
                    className: 'font-mono text-xl font-extrabold text-white/55 line-through',
                  })}
                </div>
                <div className="flex items-baseline justify-between border-b border-white/10 py-3">
                  {T('hero.price.discountLabel', '연간 계약 특가', { className: 'text-sm font-bold text-white/70' })}
                  {T('hero.price.discount', '₩1,500,000', {
                    className: 'font-mono text-3xl font-extrabold text-brand-neon',
                  })}
                </div>
                <div className="flex items-baseline justify-between pt-3">
                  {T('hero.price.saveLabel', '✓ 절약', { className: 'text-sm font-extrabold text-white' })}
                  {T('hero.price.save', '₩18,550,000 · 92.5% 할인', {
                    className: 'font-mono text-base font-extrabold text-white',
                  })}
                </div>
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                <a href="#apply" className="btn btn-primary lg">
                  {T('hero.cta.primary', '1분만에 견적 받기')}
                  <Icon.Arrow s={18} />
                </a>
                <a href={SITE_PHONE_HREF} className="btn btn-ghost lg border-white/20 text-white hover:bg-white/10">
                  <Icon.Phone s={18} />
                  {T('hero.cta.tel', `${SITE_PHONE} 바로 전화`)}
                </a>
              </div>
              <p className="mt-4 text-sm text-white/45 break-keep">
                {T('hero.cta.micro', '신청 즉시 카톡 알림 + 24시간 내 전담 매니저 콜백. 광고비·계약 강요 없음.')}
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
                  '단말기 가맹사를 넘어 매장 통합 운영 파트너로 성장한 오즈랩페이. 카드단말기·인터넷·CCTV·키오스크에 이어, 매장 매출까지 책임지는 마케팅 본부를 월 12만 5천원에 사장님 매장에 들이는 게 이 제안의 본질입니다.',
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
                    '풀스택 구조 — 오즈랩페이(OZ labPay)는 결제 인프라(단말기·간편결제)부터 매장 운영·마케팅까지 하나로 책임집니다. 단말기 하나로 시작해 매장 전체를 키웁니다.',
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
              {T('problem.title.line1', '단말기 바꿨으니 끝?')}
              <br />
              <mark className="hl-solid">{T('problem.title.highlight', '진짜 매출은 그 다음부터.')}</mark>
            </h2>
            <p className="mt-4 text-lg-fluid text-ink-500 break-keep">
              {T(
                'problem.lead',
                '결제 인프라는 끝났지만, 매출은 매장 안에서 일어나지 않습니다. 매출은 매장이 검색되는 순간 결정됩니다. 사장님은 이미 4가지 벽을 만나고 계실 겁니다.',
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
              {T('solution.title.line1', '매장 마케팅 본부,')}
              <br />
              <mark className="hl-solid">{T('solution.title.highlight', '풀스택 12종 패키지')}</mark>
              {T('solution.title.line2', '로 끝.')}
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
            {T('pricing.eyebrow', 'CHAPTER 04 · 견적', { className: 'eyebrow' })}
            <h2 className="mt-4 text-h1 text-ink-900 break-keep [text-wrap:balance]">
              {T('pricing.title.line1', '한 장으로 끝내는 견적,')}
              <br />
              <mark className="hl-solid">{T('pricing.title.highlight', '월 12만 5천원')}</mark>
              {T('pricing.title.line2', '이 전부입니다.')}
            </h2>
            <p className="mt-4 text-lg-fluid text-ink-500 break-keep">
              {T(
                'pricing.lead',
                '초기 세팅 4종 + 월 정기 관리 8종, 총 12종을 하나로 묶었습니다. 통합 패키지로 가입하면 92.5% 할인.',
              )}
            </p>
          </div>

          {/* ① 핵심 견적 요약 — 가장 먼저 보이는 답 */}
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-surface-dark text-white shadow-lg">
            <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue/20 px-3 py-1 text-xs font-extrabold text-brand-neon">
                  ⭐ {T('pricing.summary.badge', '연간 계약 특가 · 통합 패키지')}
                </span>
                <div className="mt-5 flex items-end gap-3">
                  <span className="font-mono text-5xl font-extrabold leading-none text-white sm:text-6xl">
                    {T('pricing.summary.monthly', '125,000')}
                  </span>
                  <span className="pb-1 text-lg font-bold text-white/70">{T('pricing.summary.monthlyUnit', '원 / 월')}</span>
                </div>
                <p className="mt-2 text-sm text-white/60">
                  {T('pricing.summary.yearly', '연 1,500,000원 · 부가세 별도 · 광고 실비/현장 촬영 제외')}
                </p>
                <a href="#apply" className="btn btn-primary lg mt-6 w-full sm:w-auto">
                  {T('pricing.summary.cta', '이 가격으로 견적 신청')}
                  <Icon.Arrow s={18} />
                </a>
              </div>

              {/* 정상가 대비 절약 — 한눈에 */}
              <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 text-center">
                <div className="bg-surface-dark px-3 py-5">
                  <p className="text-[11px] font-bold text-white/50">정상가</p>
                  <p className="mt-1.5 font-mono text-sm font-extrabold text-white/50 line-through sm:text-base">₩20,050,000</p>
                </div>
                <div className="bg-surface-dark px-3 py-5">
                  <p className="text-[11px] font-bold text-white/50">패키지가</p>
                  <p className="mt-1.5 font-mono text-sm font-extrabold text-white sm:text-base">₩1,500,000</p>
                </div>
                <div className="bg-brand-blue/20 px-3 py-5">
                  <p className="text-[11px] font-extrabold text-brand-neon">절약</p>
                  <p className="mt-1.5 font-mono text-sm font-extrabold text-brand-neon sm:text-base">92.5%↓</p>
                  <p className="mt-0.5 text-[10px] text-white/55">1,855만원</p>
                </div>
              </div>
            </div>
          </div>

          {/* 운영 채널 행 — 어떤 채널을 다뤄주는지 직관적으로 */}
          <div className="mt-6 rounded-2xl border border-ink-150 bg-white p-5 shadow-sm">
            {T('pricing.channels.heading', '이런 채널을 직접 운영해 드립니다', {
              as: 'p',
              className: 'mb-4 text-sm font-extrabold text-ink-700',
            })}
            <div className="flex flex-wrap gap-2.5">
              {[
                { icon: <Icon.Blog s={20} />, label: '네이버 블로그', color: 'text-[#03C75A]' },
                { icon: <Icon.Instagram s={20} />, label: '인스타그램', color: 'text-[#E1306C]' },
                { icon: <Icon.Youtube s={20} />, label: '유튜브', color: 'text-[#FF0000]' },
                { icon: <Icon.Tiktok s={20} />, label: '틱톡', color: 'text-ink-900' },
                { icon: <Icon.Pin s={20} />, label: '네이버 플레이스', color: 'text-brand-blue' },
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

          {/* ② 포함 내역 12종 — 모바일에서 줄바꿈되는 카드형 리스트 */}
          <div className="mt-6">
            <p className="mb-3 text-sm font-extrabold text-ink-700">
              {T('pricing.detail.heading', '이 가격에 포함된 것 — 12종 전체 내역')}
            </p>
            <div className="overflow-hidden rounded-2xl border border-ink-150 bg-white shadow-sm">
              {/* 초기 세팅 4종 */}
              <div className="flex items-center gap-2 bg-brand-tint/50 px-4 py-2.5 sm:px-5">
                <Icon.Target s={16} />
                <span className="text-xs font-extrabold tracking-wide text-brand-deep">초기 인프라 세팅 · 1회성 4종</span>
              </div>
              <div className="divide-y divide-ink-100">
                {pricingInitial.map((row, ri) => (
                  <div
                    key={`pi-${ri}`}
                    className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                  >
                    <div className="min-w-0">
                      {T(`pricing.initial.${ri}.name`, row.name, {
                        as: 'div',
                        className: 'font-bold text-ink-900 break-keep',
                      })}
                      {T(`pricing.initial.${ri}.desc`, row.desc, {
                        as: 'div',
                        className: 'mt-0.5 text-xs text-ink-400 break-keep',
                      })}
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 self-start rounded-lg bg-ink-50 px-2.5 py-1.5 text-xs font-bold text-ink-600 sm:self-auto">
                      <span className="font-mono text-ink-800">{row.monthly}</span>
                      <span className="text-ink-400">· 1회성</span>
                    </span>
                  </div>
                ))}
              </div>

              {/* 월 정기 8종 */}
              <div className="flex items-center gap-2 border-t border-ink-150 bg-brand-tint/50 px-4 py-2.5 sm:px-5">
                <Icon.Clock s={16} />
                <span className="text-xs font-extrabold tracking-wide text-brand-deep">월 정기 관리 · 8종</span>
              </div>
              <div className="divide-y divide-ink-100">
                {pricingMonthly.map((row, ri) => (
                  <div
                    key={`pm-${ri}`}
                    className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                  >
                    <div className="min-w-0">
                      {T(`pricing.monthly.${ri}.name`, row.name, {
                        as: 'div',
                        className: 'font-bold text-ink-900 break-keep',
                      })}
                      {T(`pricing.monthly.${ri}.desc`, row.desc, {
                        as: 'div',
                        className: 'mt-0.5 text-xs text-ink-400 break-keep',
                      })}
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-1.5 self-start sm:self-auto">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-ink-50 px-2.5 py-1.5 text-xs font-bold text-ink-600">
                        <span className="text-ink-400">월</span>
                        <span className="font-mono text-ink-800">{row.monthly}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-lg bg-ink-50 px-2.5 py-1.5 text-xs font-bold text-ink-500">
                        <span className="text-ink-400">연</span>
                        <span className="font-mono text-ink-700">{row.yearly}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* 정상가 합계 */}
              <div className="flex items-center justify-between gap-3 border-t-2 border-ink-200 px-4 py-4 sm:px-5">
                <span className="text-sm font-extrabold text-ink-900 break-keep">정상가 합계 (따로 계약 시)</span>
                <span className="whitespace-nowrap font-mono text-base font-extrabold text-ink-400 line-through">₩20,050,000</span>
              </div>
              {/* 패키지가 강조 */}
              <div className="flex items-center justify-between gap-3 bg-surface-dark px-4 py-4 text-white sm:px-5">
                <div>
                  <p className="text-sm font-extrabold">⭐ 통합 패키지 (연간)</p>
                  <p className="mt-0.5 text-[11px] text-white/55">초기 세팅 + 월 정기 전체 포함</p>
                </div>
                <div className="text-right">
                  <span className="block whitespace-nowrap font-mono text-lg font-extrabold text-brand-neon">₩1,500,000</span>
                  <span className="block text-[11px] text-white/60">월 125,000원</span>
                </div>
              </div>
            </div>
          </div>

          {/* ③ 왜 싼가 */}
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-ink-150 bg-white p-5 shadow-sm">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-blue/12 text-brand-deep">
              <Icon.Shield s={20} />
            </span>
            <p className="text-[15px] leading-relaxed text-ink-700 break-keep">
              {T(
                'pricing.callout',
                '왜 이렇게 쌉니까? — 오즈랩페이는 단말기 가맹 수수료 기반으로 운영되어 마케팅 운영비를 별도 마진으로 받지 않습니다. 사장님 매출이 늘면 결제 건수가 늘고, 결제 건수가 늘면 오즈랩페이도 함께 성장하기 때문입니다. 매장과 오즈랩페이가 같은 배에 탄 구조입니다.',
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
            {T('options.eyebrow', 'CHAPTER 05 · OPTIONS', { className: 'eyebrow' })}
            <h2 className="mt-4 text-h1 text-ink-900 break-keep">{T('options.title', '실비 + 프리미엄 옵션')}</h2>
            <p className="mt-4 text-lg-fluid text-ink-500 break-keep">
              {T('options.lead', '위 패키지에 포함되지 않는 별도 항목. 사장님이 선택적으로 추가할 수 있습니다.')}
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {options.map((opt, oi) => (
              <article
                key={`option-${oi}`}
                className={
                  opt.premium
                    ? 'rounded-xl border-2 border-brand-blue/40 bg-gradient-to-br from-white to-brand-tint p-6 shadow-sm'
                    : 'rounded-xl border border-ink-150 bg-white p-6 shadow-sm'
                }
              >
                <span
                  className={
                    opt.premium
                      ? 'inline-block rounded-full bg-brand-blue px-2.5 py-1 text-[11px] font-extrabold text-white'
                      : 'inline-block rounded-full bg-ink-100 px-2.5 py-1 text-[11px] font-extrabold text-ink-600'
                  }
                >
                  {T(`options.cards.${oi}.tag`, opt.premium ? `⭐ ${opt.tag}` : opt.tag)}
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
                  className: 'mt-4 font-mono text-sm font-extrabold text-brand-deep',
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
