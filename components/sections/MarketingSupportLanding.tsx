'use client'

import Link from 'next/link'
import { Icon } from '@/components/icons'

const partners = [
  'TOSS',
  'NAVER',
  'GOOGLE',
  'META',
  'SK planet',
  'KAKAO',
  'TABOOLA',
  'Daangn',
  'MOBON',
  '11번가',
  'OK캐시백',
  'SYRUP',
]

const capabilities = [
  {
    no: '01',
    label: 'TRIPLE MEDIA',
    title: '트리플 미디어, 편하게',
    desc: '검색·성과형·리워드·체험단까지. 채널마다 따로 부탁하지 않으셔도 됩니다. 고객 한 명의 여정으로 엮어, 우리편이 대신 편하게 굴려드립니다.',
    bullets: [
      '네이버 · 구글 · 메타 · 카카오 · 당근 · 타불라 · 모비온',
      '토스애즈 · SK플래닛 리워드 · 11번가 공식 대행',
      '블로그 / 인스타 체험단까지 한 곳에서',
    ],
  },
  {
    no: '02',
    label: 'DATA MINING',
    title: '데이터, 집요하게',
    desc: '분석은 모두가 합니다. 우리편은 캡니다. 외부 데이터와 내부 시그널을 섞어 숨어있는 패턴까지 끄집어내고, 블루모아이가 24시간 대신 판단합니다.',
    bullets: [
      '자체 MMP 연동 · 이벤트 추적 세팅까지',
      '머신러닝 입찰 · 크리에이티브 자동화',
      '사장님도 읽을 수 있는 AI 리포트',
    ],
  },
  {
    no: '03',
    label: 'SEO · GEO',
    title: '검색 위에서, 오래',
    desc: '광고를 껐을 때도 계속 찾아오시도록. 화이트햇 원칙을 지키며 네이버·구글의 최신 로직을 연구하고, 이제는 LLM에게도 선택받는 브랜드를 만듭니다.',
    bullets: [
      '테크니컬 SEO · 콘텐츠 SEO 동시 운영',
      '생성형 검색(GEO) 노출 리서치',
      '알고리즘 변동, 매일 살펴보고 알려드림',
    ],
  },
]

const coreFeatures = [
  {
    no: '/01',
    title: '데이터는 한 판으로',
    desc: '매체 API·자사몰·CRM 이벤트를 한 줄기로 모아드려요. 여러 탭을 오가지 않아도, 한 화면에서 같이 봅니다.',
  },
  {
    no: '/02',
    title: '입찰·소재, 쉬지 않고',
    desc: '캠페인 목표에 맞춰 입찰가와 소재 조합을 실시간으로 바꿉니다. 사장님이 주무실 때도 블루모아이는 일합니다.',
  },
  {
    no: '/03',
    title: 'AI가 다음 한 수를',
    desc: '클릭 한 번에, 무엇이 성과를 움직였고 다음엔 무엇을 해야 할지. 어려운 단어 없이, 편하게 알려드립니다.',
  },
  {
    no: '/04',
    title: '화이트햇 · 투명 로깅',
    desc: '자동화가 내린 모든 판단을 로그로 남깁니다. 에이전시와 사장님이 같은 편, 같은 화면을 봅니다.',
  },
]

const products = [
  {
    no: '01',
    tag: '공식대행',
    title: '네이버 검색광고',
    subtitle: '파워링크·브랜드검색·쇼핑검색 통합 운영',
    desc: '네이버 공식 (대)대행사. 키워드 1,000개 단위 자동 입찰 룰셋을 우리편이 직접 짜드립니다.',
  },
  {
    no: '02',
    tag: '공식대행',
    title: '네이버 성과형 배너광고',
    subtitle: 'GFA · 신디케이션 · 리타겟팅',
    desc: 'GFA 머신러닝이 잘 학습하도록 픽셀·이벤트 세팅부터 같이 봐드립니다. 시작이 다릅니다.',
  },
  {
    no: '03',
    tag: '지역·플레이스',
    title: '네이버 플레이스 광고',
    subtitle: '지도 · 플레이스 상위 노출',
    desc: '동네 상권 데이터를 마이닝해, 가게 반경 3km 안 손님이 진짜 검색하는 키워드만 골라드려요.',
  },
  {
    no: '04',
    tag: '지역·플레이스',
    title: '네이버 지역소상공인광고',
    subtitle: '상권 타겟 노출, 저예산 친화',
    desc: '월 30만원대 작은 사장님도 부담없이. 예산이 작아도 운영 정성은 똑같이 들어갑니다.',
  },
  {
    no: '05',
    tag: '검색·쇼핑',
    title: '네이버 쇼핑광고',
    subtitle: '쇼핑검색·브랜딩·카탈로그 운영',
    desc: '스마트스토어 매출과 광고비를 한 화면에서 보며, 손익이 맞는 키워드만 살리고 정리합니다.',
  },
  {
    no: '06',
    tag: '공식대행',
    title: '구글애즈',
    subtitle: '검색·P맥스·디스커버리·유튜브',
    desc: '구글 공식대행사. P-MAX 블랙박스를 우리편 데이터로 풀어, 어디서 매출이 나는지 보여드립니다.',
  },
  {
    no: '07',
    tag: '성과형·배너',
    title: '메타애즈',
    subtitle: 'Facebook · Instagram 퍼포먼스',
    desc: '소재 30종 A/B를 매주 굴립니다. 광고 피로도가 쌓이기 전에 미리 교체해드려요.',
  },
  {
    no: '08',
    tag: '지역·플레이스',
    title: '당근애즈',
    subtitle: '하이퍼로컬 · 상권 기반',
    desc: '당근 동네 단위 노출 데이터를 모아, 우리 가게 반경에서 통하는 카피를 골라드립니다.',
  },
  {
    no: '09',
    tag: '공식대행',
    title: '토스애즈',
    subtitle: '토스 앱 인벤토리 네이티브 광고',
    desc: '토스 공식광고대행사. 금융·핀테크 업종에서 검수 통과율을 높이는 카피 가이드를 드립니다.',
  },
  {
    no: '10',
    tag: '공식대행',
    title: '토스 리워드광고',
    subtitle: '전환 기반 리워드 집행',
    desc: '전환당 정산 구조라 위험은 낮고, 우리편이 KPI를 직접 잡아드려 광고비 새지 않게 운영합니다.',
  },
  {
    no: '11',
    tag: '공식대행',
    title: 'SK플래닛 리워드광고',
    subtitle: 'OK캐시백 · 오락 · 시럽 · 11번가',
    desc: 'SK플래닛 공식대행사. 4개 인벤토리 통합 운영으로, 한 번 세팅에 노출 영역을 4배 확장합니다.',
  },
  {
    no: '12',
    tag: '성과형·배너',
    title: '카카오모먼트',
    subtitle: '비즈보드·톡채널·다음 통합',
    desc: '비즈보드·톡채널·다음을 한 캠페인으로 묶어 운영. 광고비 단위 매출이 달라집니다.',
  },
  {
    no: '13',
    tag: '성과형·배너',
    title: '타불라 광고',
    subtitle: '글로벌 네이티브 디스커버리',
    desc: '프리미엄 매체 인벤토리 우선 협의. 브랜드 안전성과 CTR을 동시에 잡아드려요.',
  },
  {
    no: '14',
    tag: '성과형·배너',
    title: '모비온 광고',
    subtitle: '리타겟팅·디스플레이 네트워크',
    desc: '이미 방문한 잠재고객을 다시 데려옵니다. 우리편 자체 룰로 빈도를 조절해 광고 피로를 최소화합니다.',
  },
  {
    no: '15',
    tag: '체험단',
    title: '인스타 체험단',
    subtitle: '마이크로 인플루언서 매칭',
    desc: '팔로워 수가 아니라 진짜 반응률로 인플루언서를 매칭합니다. 후기 한 건의 가치가 다릅니다.',
  },
  {
    no: '16',
    tag: '체험단',
    title: '네이버 블로그 체험단',
    subtitle: '방문·배송 체험단 운영',
    desc: '검색 노출까지 책임지는 SEO형 체험단. 광고가 아니라 자산이 되는 콘텐츠를 만듭니다.',
  },
  {
    no: '17',
    tag: '자체솔루션',
    title: '블루모아이 BlueMoai',
    subtitle: '데이터 마이닝 기반 자동화 솔루션',
    desc: '우리편이 직접 만들고 직접 굴리는 자체 솔루션. 엔터프라이즈 기능을 사장님 속도로 드립니다.',
  },
  {
    no: '18',
    tag: '자체솔루션',
    title: '더셀프 TheSelf',
    subtitle: '중소상공인 전용 셀프마케팅 SaaS',
    desc: '대행을 맡기기 부담스러운 작은 사장님도, 우리편이 만든 가이드대로 직접 운영하실 수 있어요.',
  },
  {
    no: '19',
    tag: 'SEO · GEO',
    title: 'SEO · GEO 최적화',
    subtitle: '검색엔진 + 생성형 검색 대응',
    desc: '네이버·구글에 더해 ChatGPT·Perplexity 같은 LLM에까지 노출. 광고를 꺼도 찾아오시도록.',
  },
]

const audiences = [
  {
    no: '01',
    title: '동네 사장님',
    desc: '카페·미용실·식당·네일샵까지. 플레이스·당근·지역형 광고로, 가게 반경 3km 안의 손님부터 편하게 모셔옵니다.',
    chips: ['플레이스', '당근', '지역 소상공인'],
  },
  {
    no: '02',
    title: '온라인 쇼핑몰',
    desc: 'D2C 브랜드와 스마트스토어. 네이버쇼핑·메타·구글 P-MAX를 하나로 엮어, 광고비가 매출로 이어지는 구조를 설계합니다.',
    chips: ['네이버쇼핑', '메타', 'P-MAX'],
  },
  {
    no: '03',
    title: '병원 · 학원 · 로펌',
    desc: '표현 하나에도 민감한 규제 업종. 화이트햇 SEO와 검색광고로, 꾸준히 문의가 쌓이는 길을 만들어드립니다.',
    chips: ['검색광고', 'SEO', '블로그 체험단'],
  },
  {
    no: '04',
    title: '중견 · 엔터프라이즈',
    desc: '블루모아이 엔진과 MMP 세팅으로 다채널을 한 판에서 운영. 내부 데이터팀의 손을 덜어드리는 파트너가 됩니다.',
    chips: ['블루모아이', '통합 운영', 'MMP'],
  },
]

export function MarketingSupportLanding() {
  return (
    <div className="bg-white text-ink-900">
      <section className="relative overflow-hidden bg-surface-dark py-section-tight text-white">
        <div className="pointer-events-none absolute right-[-10%] top-[-30%] h-[620px] w-[620px] rounded-full bg-naver-green/20 blur-[130px]" />
        <div className="pointer-events-none absolute bottom-[-35%] left-[-15%] h-[460px] w-[460px] rounded-full bg-white/10 blur-[110px]" />
        <div className="container-oz relative">
          <div className="max-w-[860px]">
            <span className="eyebrow-dark">LIVE · APR 23, 2026 · MINING v.2026.Q2</span>
            <h1 className="mt-6 text-display text-white break-keep">
              데이터를
              <br />
              <mark className="hl-solid">마이닝합니다.</mark>
            </h1>
            <p className="mt-6 text-2xl font-bold text-white break-keep">
              같은 편이니까, 남다르게 합니다.
            </p>
            <p className="mt-4 max-w-[720px] text-lg-fluid text-white/65 break-keep">
              모두가 데이터 분석이라고 말할 때, 우리편은 데이터를 마이닝 합니다.
              검색 한 줄, 클릭 한 번에 숨어있는 고객의 신호까지 집요하게 파고들어요.
              엔터프라이즈만의 무기를, 동네 상점도 편하게 쓸 수 있도록.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="#marketing-consult" className="btn btn-primary lg">
                무료 상담 신청
                <Icon.Arrow s={18} />
              </Link>
              <Link href="#bluemoai" className="btn btn-ghost lg border-white/20 text-white hover:bg-white/10">
                블루모아이 살펴보기
              </Link>
            </div>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: '운영 광고주', value: '1,240+' },
              { label: '연간 운영 예산', value: '184억+' },
              { label: '평균 ROAS 개선', value: '+43%' },
              { label: '데이터 포인트/일', value: '12.6M' },
            ].map((item, index) => (
              <div key={item.label} className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
                <p className="text-xs font-bold text-naver-neon">0{index + 1} / {item.label}</p>
                <p className="mt-3 text-3xl font-extrabold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-ink-150 bg-white py-8">
        <div className="container-oz">
          <p className="text-center text-xs font-extrabold tracking-[0.18em] text-ink-400">
            OFFICIAL ADVERTISING AGENCY PARTNERS
          </p>
          <p className="mt-2 text-center text-sm font-semibold text-ink-700 break-keep">
            토스 · SK플래닛 · 네이버 공식(대)대행사 자격 보유
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {partners.map((partner) => (
              <span key={partner} className="rounded-pill border border-ink-150 bg-ink-50 px-4 py-2 text-xs font-bold text-ink-600">
                {partner}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="py-section">
        <div className="container-oz">
          <div className="mb-14 max-w-[760px]">
            <span className="eyebrow">What We Do · 핵심 역량</span>
            <h2 className="mt-4 text-h1 text-ink-900 break-keep">
              세 가지만, 잘합니다.
              <br />
              대신, 끝까지 합니다.
            </h2>
            <p className="mt-4 text-lg-fluid text-ink-500 break-keep">
              BTL 중심의 종합 대행사에서 출발해, 데이터·AI·자동화를 내재화한 테크 컴퍼니로.
              2026년의 우리편마케팅이 일하는 방식입니다.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {capabilities.map((item) => (
              <article key={item.label} className="rounded-xl border border-ink-150 bg-white p-7 shadow-sm">
                <p className="text-xs font-extrabold text-naver-deep">{item.no} / {item.label}</p>
                <h3 className="mt-5 text-h3 text-ink-900 break-keep">{item.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-500 break-keep">{item.desc}</p>
                <ul className="mt-5 space-y-2.5">
                  {item.bullets.map((bullet, index) => (
                    <li key={bullet} className="flex items-start gap-2 text-sm text-ink-600 break-keep">
                      <span className="text-xs font-extrabold text-naver-deep">0{index + 1}</span>
                      {bullet}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="bluemoai" className="bg-ink-50 py-section">
        <div className="container-oz grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <span className="eyebrow">FLAGSHIP PRODUCT · 대표 솔루션</span>
            <h2 className="mt-4 text-h1 text-ink-900 break-keep">
              BlueMoai
              <br />
              빅데이터 마케팅 자동화를,
              <br />
              우리 동네 사장님도.
            </h2>
            <p className="mt-5 text-lg-fluid text-ink-500 break-keep">
              블루모아이는 우리편이 직접 개발·운영하는 데이터 마케팅 자동화 솔루션이에요.
              Dfinery, Tradingworks 같은 엔터프라이즈급 기능을 꼭 필요한 것만 꺼내,
              광고 예산 월 300만원대의 작은 상점도 부담없이 쓸 수 있도록 만들었습니다.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="#marketing-products" className="btn btn-primary lg">
                제품 살펴보기
                <Icon.Arrow s={18} />
              </Link>
              <Link href="#marketing-consult" className="btn btn-ghost lg">
                데모 요청
              </Link>
            </div>
          </div>

          <div className="rounded-xl bg-surface-dark p-5 text-white shadow-lg md:p-7">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-naver-neon">
                  Live Dashboard · 실시간 성과
                </p>
                <h3 className="mt-2 text-2xl font-extrabold text-white break-keep">
                  한 화면에서, 실시간 성과가 보입니다.
                </h3>
              </div>
              <span className="rounded-pill bg-white/10 px-3 py-1.5 text-xs font-bold text-white">
                app.bluemoai.io / dashboard
              </span>
            </div>
            <p className="text-white/65 break-keep">
              채널 통합 ROAS · 자동 입찰 · 코호트 분석 · LTV 예측. 마케터 · 사장님 · AI가
              같은 화면을 보면서 같은 편에서 결정합니다.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {['자동 입찰', '코호트 분석', 'LTV 예측'].map((module) => (
                <span key={module} className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-sm font-bold">
                  {module}
                </span>
              ))}
            </div>
            <div className="mt-5 rounded-lg bg-white p-5 text-ink-900">
              <p className="text-xs font-extrabold text-naver-deep">AI · LIVE</p>
              <p className="mt-2 text-lg font-bold break-keep">
                네이버 쇼핑 클릭 전환율이 전일 대비 18% 상승했어요.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  { label: '채널 통합 ROAS', value: '487%' },
                  { label: '노출', value: '12.8M' },
                  { label: '클릭', value: '384K' },
                  { label: 'CVR', value: '5.8%' },
                ].map((metric) => (
                  <div key={metric.label} className="rounded-md bg-ink-50 p-3">
                    <p className="text-xs text-ink-500">{metric.label}</p>
                    <p className="mt-1 text-xl font-extrabold text-ink-900">{metric.value}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-sm font-bold text-naver-deep">CPA ₩4,210 · ▲ 43.2% vs. 전월</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-section">
        <div className="container-oz">
          <div className="mb-14 max-w-[760px]">
            <span className="eyebrow">Core Features · 네 가지 핵심 기능</span>
            <h2 className="mt-4 text-h1 text-ink-900 break-keep">
              엔터프라이즈 기능을,
              <br />
              사장님 속도에 맞춰.
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {coreFeatures.map((feature) => (
              <article key={feature.title} className="rounded-lg border border-ink-150 bg-white p-6 shadow-sm">
                <p className="text-sm font-extrabold text-naver-deep">{feature.no}</p>
                <h3 className="mt-5 text-xl font-bold text-ink-900 break-keep">{feature.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-500 break-keep">{feature.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="marketing-products" className="bg-ink-50 py-section">
        <div className="container-oz">
          <div className="mb-10 max-w-[760px]">
            <span className="eyebrow">What We Operate · 운영 상품</span>
            <h2 className="mt-4 text-h1 text-ink-900 break-keep">
              광고 상품 19개,
              <br />
              일하는 원칙은 하나.
            </h2>
            <p className="mt-4 text-lg-fluid text-ink-500 break-keep">
              채널은 많아도 운영하는 마음은 같아요. 데이터로 의사결정하고, 사람이 판단하고,
              같은 편의 입장에서 한 번 더 검수합니다.
            </p>
          </div>
          <div className="mb-8 flex flex-wrap gap-2">
            {['전체', '자체 솔루션 3', '검색·쇼핑 3', '성과형·배너 5', '지역·플레이스 3', '리워드·토스·SK 3', '체험단 2'].map((filter) => (
              <span key={filter} className="rounded-pill bg-white px-3 py-1.5 text-xs font-bold text-ink-600 shadow-sm">
                {filter}
              </span>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <article
                key={product.no}
                className="rounded-lg border border-ink-150 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-naver-green/40 hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-extrabold text-ink-400">{product.no}</p>
                  <span className="rounded-pill bg-naver-soft px-2.5 py-1 text-[11px] font-bold text-naver-deep">
                    {product.tag}
                  </span>
                </div>
                <h3 className="mt-5 text-xl font-bold text-ink-900 break-keep">{product.title}</h3>
                <p className="mt-2 text-sm font-semibold text-ink-600 break-keep">{product.subtitle}</p>
                <p className="mt-4 text-sm leading-relaxed text-ink-500 break-keep">{product.desc}</p>
                <p className="mt-5 text-sm font-extrabold text-naver-deep">자세히</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-section">
        <div className="container-oz">
          <div className="mb-14 max-w-[760px]">
            <span className="eyebrow">For Whom · 광고주</span>
            <h2 className="mt-4 text-h1 text-ink-900 break-keep">
              동네 사장님부터 엔터프라이즈까지.
              <br />
              규모가 아니라, 구조를 바꿔드립니다.
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {audiences.map((audience) => (
              <article key={audience.title} className="rounded-lg border border-ink-150 bg-white p-7 shadow-sm">
                <p className="text-sm font-extrabold text-naver-deep">{audience.no}</p>
                <h3 className="mt-4 text-h3 text-ink-900 break-keep">{audience.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-500 break-keep">{audience.desc}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {audience.chips.map((chip) => (
                    <span key={chip} className="rounded-pill bg-ink-100 px-3 py-1.5 text-xs font-bold text-ink-600">
                      {chip}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-surface-dark py-section text-white">
        <div className="container-oz">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <span className="eyebrow-dark">By the Numbers · 성과 지표</span>
              <h2 className="mt-4 text-h1 text-white break-keep">
                의심하세요,
                <br />
                증명해드립니다.
              </h2>
              <p className="mt-4 text-lg-fluid text-white/65 break-keep">
                말만큼 운영도 잘해야 같은 편이잖아요. 케이스별 성과와 월간 리포트를
                투명하게 열어둡니다. 숫자는 주장이 아니라, 약속입니다.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { value: '2.4× 상승', label: '평균 문의 전환 · 도입 3개월 기준' },
                { value: '−38%', label: '광고비 낭비 절감 · 자동 입찰 적용 후' },
                { value: '−92%', label: '리포트 제작 시간 · AI 리포팅' },
                { value: '487%', label: '채널 통합 ROAS · 최근 30일 기준' },
              ].map((metric) => (
                <div key={metric.label} className="rounded-lg border border-white/10 bg-white/[0.04] p-6">
                  <p className="text-3xl font-extrabold text-white">{metric.value}</p>
                  <p className="mt-2 text-sm text-white/60 break-keep">{metric.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="marketing-consult" className="py-section">
        <div className="container-oz">
          <div className="rounded-xl border border-ink-150 bg-gradient-to-br from-white to-naver-tint p-8 shadow-sm md:p-12">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-xs font-extrabold tracking-[0.18em] text-naver-deep">READY TO MINE?</p>
                <h2 className="mt-4 text-h1 text-ink-900 break-keep">
                  상담은 30분. 그 사이에
                  <br />
                  다음 달 운영안까지, 같이 그려드립니다.
                </h2>
                <p className="mt-4 max-w-[760px] text-lg-fluid text-ink-500 break-keep">
                  지금 돌리고 계신 광고 계정, 잠깐만 열어봐 주세요. 30분이면 새는 광고비와
                  다음 달 운영 제안까지 같은 편의 입장에서 정리해 드릴게요.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 lg:justify-end">
                <Link href="/#apply" className="btn btn-primary lg">
                  무료 상담 신청
                  <Icon.Arrow s={18} />
                </Link>
                <Link href="#bluemoai" className="btn btn-ghost lg">
                  블루모아이 데모 요청
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <div className="rounded-lg border border-ink-150 bg-white p-6">
              <h3 className="text-lg font-bold text-ink-900">우리편마케팅 WOORIPYOEN MKT</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-500 break-keep">
                우리편마케팅은 (주)우리편이 운영하는 데이터 드리븐 광고대행 브랜드입니다.
                같은 편이니까, 남다르게 합니다.
              </p>
            </div>
            <div className="rounded-lg border border-ink-150 bg-white p-6">
              <h3 className="text-lg font-bold text-ink-900">Contact</h3>
              <p className="mt-3 text-sm text-ink-500">1600-6116</p>
              <p className="mt-1 text-sm text-ink-500">ourteam.kr@gmail.com</p>
              <p className="mt-1 text-sm text-ink-500">평일 10:00-19:00</p>
            </div>
            <div className="rounded-lg border border-ink-150 bg-white p-6">
              <h3 className="text-lg font-bold text-ink-900">Office</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-500 break-keep">
                서울특별시 강서구 공항대로 209 507호 · 508호 · 509호
              </p>
              <p className="mt-3 text-xs leading-relaxed text-ink-400 break-keep">
                업체명 : 우리편마케팅 | (주)우리편 · 대표이사 : 구본청 · 사업자등록번호 : 197-86-03789
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
