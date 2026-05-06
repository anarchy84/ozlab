export type ServiceCard = {
  title: string
  desc: string
  meta?: string
  bullets?: string[]
}

export type ServiceMetric = {
  value: string
  label: string
}

export type ServiceLandingData = {
  eyebrow: string
  hero: {
    line1: string
    highlight: string
    line3: string
    description: string
  }
  primaryCta: string
  secondaryCta: string
  secondaryHref?: string
  stats: ServiceMetric[]
  intro: {
    eyebrow: string
    title: string
    description?: string
    cards: ServiceCard[]
  }
  catalog: {
    eyebrow: string
    title: string
    description?: string
    cards: ServiceCard[]
  }
  proof: {
    eyebrow: string
    title: string
    description?: string
    cards: ServiceMetric[]
  }
  guide: {
    eyebrow: string
    title: string
    description?: string
    cards: ServiceCard[]
  }
  process: ServiceCard[]
  faqs: { q: string; a: string }[]
  consultChips: string[]
}

export const servicePages = {
  internet: {
    eyebrow: '사업자 인터넷',
    hero: {
      line1: 'SKT · KT · LG U+',
      highlight: '사업자 인터넷 요금',
      line3: '한눈에 비교',
      description:
        '3사 사업자 전용 요금제를 비교하고, 매장에 가장 유리한 조건을 찾아드려요. POS, CCTV, 손님 Wi-Fi까지 끊기지 않게 설계합니다.',
    },
    primaryCta: '요금 비교 상담',
    secondaryCta: '전화 상담',
    secondaryHref: 'tel:1588-0000',
    stats: [
      { value: '3사', label: '통신사 비교' },
      { value: '고정 IP', label: '원격 접속 안내' },
      { value: '3~5일', label: '평균 설치 일정' },
    ],
    intro: {
      eyebrow: 'Why Biz Internet',
      title: '가정용과 다른 이유가 분명합니다.',
      description:
        '매장 인터넷은 결제, 주문, 보안 장비가 동시에 붙습니다. 가격만 보지 않고 운영 안정성까지 같이 봐야 합니다.',
      cards: [
        {
          title: '고정 IP 제공',
          desc: 'CCTV 원격 접속, POS 연동, 서버 운영에 필요한 고정 IP를 안내합니다. 유동 IP로 생기는 접속 오류를 줄일 수 있습니다.',
        },
        {
          title: '안정적인 회선',
          desc: '사업자 전용 회선은 피크타임에도 결제와 주문이 끊기지 않도록 회선 품질과 공유기 구성을 함께 점검합니다.',
        },
        {
          title: '세금계산서 발행',
          desc: '사업자 명의 요금제로 부가세 환급과 비용 처리를 챙길 수 있습니다. 월 통신비를 운영비 관점에서 정리합니다.',
        },
      ],
    },
    catalog: {
      eyebrow: 'Plans',
      title: '통신사별 사업자 요금제',
      description: '100M부터 1G까지, 매장 규모와 장비 수에 맞춰 추천합니다.',
      cards: [
        {
          meta: 'SKT',
          title: 'Biz 광랜 라인업',
          desc: '100M 월 22,000원 · 500M 월 27,500원 · 1G 월 33,000원',
          bullets: ['고정 IP 1~2개', '기업용 Wi-Fi', '약정 3년 기준'],
        },
        {
          meta: 'KT',
          title: '올레 Biz 라인업',
          desc: '100M 월 22,000원 · 500M 월 27,500원 · 1G 월 33,000원',
          bullets: ['GiGA Wi-Fi', '고정 IP 옵션', '전화/IPTV 결합 가능'],
        },
        {
          meta: 'LG U+',
          title: 'U+ Biz 라인업',
          desc: '100M 월 22,000원 · 500M 월 27,500원 · 1G 월 33,000원',
          bullets: ['AI Wi-Fi 구성', '매장형 공유기', '결합 할인 비교'],
        },
      ],
    },
    proof: {
      eyebrow: 'Use Case',
      title: '이런 매장에 특히 필요합니다.',
      cards: [
        { value: '100M', label: 'POS + CCTV 기본 운영' },
        { value: '500M', label: '키오스크 + 손님 Wi-Fi 동시 운영' },
        { value: '1G', label: 'PC 다수 + 영상/업무 트래픽' },
      ],
    },
    guide: {
      eyebrow: 'Setup',
      title: '신청부터 개통까지 흐름도 단순하게.',
      cards: [
        { meta: '01', title: '전화 상담', desc: '매장 면적, 장비 수, 기존 약정을 먼저 확인합니다.' },
        { meta: '02', title: '서류 접수', desc: '사업자등록증 기준으로 가장 유리한 가입 방식을 정리합니다.' },
        { meta: '03', title: '설치 일정', desc: '통신사 설치 기사 일정과 매장 영업 시간을 맞춥니다.' },
        { meta: '04', title: '개통 확인', desc: '속도, Wi-Fi 범위, POS/CCTV 접속까지 확인합니다.' },
      ],
    },
    process: [
      { title: '기존 약정 분석', desc: '위약금과 신규 혜택을 같이 계산해 바꾸는 게 유리한 시점을 잡습니다.' },
      { title: '장비 동시 점검', desc: '단말기, 테이블오더, CCTV까지 같은 네트워크에서 안정적으로 묶습니다.' },
      { title: '운영비 리포트', desc: '월 요금, 설치비, 결합 할인, 환급 가능 항목을 한 장으로 정리합니다.' },
    ],
    faqs: [
      {
        q: '가정용 인터넷으로 매장을 운영하면 안 되나요?',
        a: '불가능하진 않지만 고정 IP가 없고 상업 목적 사용이 제한될 수 있습니다. CCTV 원격 접속, POS 연동이 필요하면 사업자 인터넷을 권장합니다.',
      },
      {
        q: '기존 인터넷을 사업자용으로 전환할 수 있나요?',
        a: '네. 통신사에 따라 약정 승계 또는 신규 가입 방식이 달라지며, 상담 시 가장 유리한 방법을 안내합니다.',
      },
      {
        q: '인터넷과 전화도 같이 할인되나요?',
        a: '인터넷 + 전화 + IPTV 결합 할인이 가능합니다. 사업자 전화까지 포함하면 통신비를 줄일 수 있습니다.',
      },
      {
        q: 'Wi-Fi가 잘 안 터지면 인터넷을 바꿔야 하나요?',
        a: '속도와 Wi-Fi 커버리지는 별개입니다. 넓은 매장은 공유기 추가 설치나 메시 Wi-Fi 구성이 필요할 수 있습니다.',
      },
    ],
    consultChips: ['인터넷', '전화', 'IPTV', '결합할인'],
  },
  tableOrder: {
    eyebrow: '테이블오더',
    hero: {
      line1: '인건비는 줄이고',
      highlight: '매출은 올리는',
      line3: '스마트 주문',
      description:
        '키오스크부터 테이블오더까지. 비대면 주문 시스템으로 주문 오류를 줄이고, 바쁜 시간 회전율을 높입니다.',
    },
    primaryCta: '도입 상담',
    secondaryCta: '전화 상담',
    secondaryHref: 'tel:1588-0000',
    stats: [
      { value: '30%', label: '인건비 절감 기대' },
      { value: '25%', label: '객단가 상승 기대' },
      { value: '40%', label: '주문 속도 향상 기대' },
    ],
    intro: {
      eyebrow: 'Products',
      title: '매장에 맞는 주문 시스템을 고릅니다.',
      description:
        '입구, 카운터, 테이블, 모바일 주문까지 운영 동선에 맞춰 조합합니다.',
      cards: [
        {
          meta: '가장 인기',
          title: '스탠드형 키오스크',
          desc: '입구와 카운터에 두는 대형 터치 스크린입니다. 메뉴 선택부터 결제까지 고객이 직접 완료합니다.',
          bullets: ['21.5~27인치 터치 디스플레이', '카드·QR·간편결제 통합', '프린터 내장형'],
        },
        {
          meta: '비대면',
          title: '테이블오더',
          desc: '각 테이블의 태블릿이나 QR코드로 주문합니다. 추가 주문과 직원 호출이 훨씬 편해집니다.',
          bullets: ['QR코드 / 태블릿 선택', '추가 주문 자유', '주방 자동 연동'],
        },
        {
          meta: '소형 매장',
          title: '벽걸이형 키오스크',
          desc: '별도 스탠드 없이 벽면에 고정하는 콤팩트한 방식입니다. 좁은 매장에도 부담이 적습니다.',
          bullets: ['공간 절약형', '벽면 고정 설치', '15.6인치 터치'],
        },
        {
          meta: '초간편',
          title: '모바일 오더',
          desc: '고객 스마트폰에서 바로 주문과 결제가 가능합니다. 앱 설치 없이 QR코드 하나로 시작합니다.',
          bullets: ['앱 설치 불필요', 'QR코드 스캔 주문', '원격 사전 주문'],
        },
      ],
    },
    catalog: {
      eyebrow: 'Why Us',
      title: '기기만 놓고 끝내지 않습니다.',
      cards: [
        {
          title: '메뉴 디자인 지원',
          desc: '매장 메뉴를 주문 화면에 맞는 이미지와 카테고리로 세팅합니다. 사진이 부족해도 기본 템플릿으로 시작할 수 있습니다.',
        },
        {
          title: 'POS 연동 설정',
          desc: '주문, 조리, 결제 흐름이 끊기지 않도록 기존 POS와 연동 가능 여부를 먼저 확인합니다.',
        },
        {
          title: '운영 교육 + A/S',
          desc: '설치 후 직원 교육과 원격/방문 A/S까지 이어집니다. 처음 쓰는 매장도 부담 없이 운영하게 만듭니다.',
        },
      ],
    },
    proof: {
      eyebrow: 'Effect',
      title: '도입 후 바뀌는 숫자',
      description: '* 업종과 매장 규모에 따라 효과는 달라질 수 있습니다.',
      cards: [
        { value: '30%', label: '인건비 절감' },
        { value: '25%', label: '객단가 상승' },
        { value: '40%', label: '주문 속도 향상' },
        { value: '0원', label: '초기 설치비 프로모션' },
      ],
    },
    guide: {
      eyebrow: 'Setup',
      title: '주문 동선부터 먼저 설계합니다.',
      cards: [
        { meta: '01', title: '매장 동선 확인', desc: '입구, 카운터, 테이블 간 주문 흐름을 확인합니다.' },
        { meta: '02', title: '기기 방식 선택', desc: '키오스크, 테이블 태블릿, QR오더 중 필요한 방식을 고릅니다.' },
        { meta: '03', title: '메뉴 세팅', desc: '메뉴판, 옵션, 이미지, 결제 방식을 실제 운영 기준으로 세팅합니다.' },
        { meta: '04', title: '직원 교육', desc: '주문 취소, 품절, 정산, 장애 대응까지 현장에서 교육합니다.' },
      ],
    },
    process: [
      { title: 'POS 호환성 체크', desc: '만나, 포스뱅크, 오케이포스, 포스피드 등 주요 POS 연동 가능 여부를 확인합니다.' },
      { title: '인터넷 안정성 점검', desc: '주문 장비가 늘어나는 만큼 공유기와 회선 구성을 함께 점검합니다.' },
      { title: '프로모션 적용', desc: '월 렌탈, 설치비, 도입 할인 조건을 비교해 초기 부담을 낮춥니다.' },
    ],
    faqs: [
      {
        q: '키오스크 도입 비용이 부담되는데 월 렌탈이 되나요?',
        a: '네. 월 렌탈 방식으로 초기 비용 부담을 낮출 수 있습니다. 약정 기간과 프로모션에 따라 월 비용이 달라집니다.',
      },
      {
        q: '우리 매장 POS랑 연동이 되나요?',
        a: '주요 POS 시스템과 연동 가능합니다. 사용 중인 POS를 알려주시면 호환 여부를 먼저 확인합니다.',
      },
      {
        q: '메뉴가 바뀌면 직접 수정할 수 있나요?',
        a: '관리자 페이지에서 메뉴 추가, 수정, 삭제를 직접 할 수 있습니다. 사진과 가격 변경도 실시간 반영됩니다.',
      },
      {
        q: '인터넷이 안 되면 주문이 안 되나요?',
        a: '오프라인 모드를 지원하는 구성도 있습니다. 네트워크가 복구되면 데이터가 자동 동기화됩니다.',
      },
    ],
    consultChips: ['키오스크', '테이블오더', 'QR오더', 'POS 연동'],
  },
  cctv: {
    eyebrow: 'CCTV',
    hero: {
      line1: '매장을 24시간',
      highlight: '스마트하게 지키는',
      line3: 'CCTV',
      description:
        '매장 크기와 구조에 맞는 CCTV 구성을 추천합니다. 스마트폰으로 언제든 실시간 확인할 수 있게 설치까지 연결합니다.',
    },
    primaryCta: 'CCTV 구성 상담',
    secondaryCta: '전화 상담',
    secondaryHref: 'tel:1588-0000',
    stats: [
      { value: '4ch', label: '소형 매장 기본' },
      { value: '8ch', label: '중형 매장 추천' },
      { value: '16ch+', label: '대형 매장 대응' },
    ],
    intro: {
      eyebrow: 'Products',
      title: '용도에 맞는 CCTV를 고릅니다.',
      description:
        '실내, 실외, 넓은 공간, 무선 설치까지 위치와 목적에 따라 장비가 달라집니다.',
      cards: [
        {
          meta: '실내 추천',
          title: '실내 돔 카메라',
          desc: '천장 부착형 반구 디자인입니다. 매장과 사무실 실내 감시에 적합하고 인테리어를 크게 해치지 않습니다.',
          bullets: ['200만~500만 화소', '야간 적외선 자동 전환', '넓은 시야각 120도'],
        },
        {
          meta: '실외 추천',
          title: '실외 불릿 카메라',
          desc: '방수·방진 설계로 주차장, 출입구, 건물 외벽 감시에 적합합니다.',
          bullets: ['IP67 방수방진', '야간 30m 감시', '알루미늄 하우징'],
        },
        {
          meta: '대형 매장',
          title: 'PTZ 카메라',
          desc: '상하좌우 회전과 줌 기능으로 넓은 공간을 하나의 카메라로 커버할 수 있습니다.',
          bullets: ['360도 회전', '최대 30배 줌', '자동 추적 기능'],
        },
        {
          meta: '간편 설치',
          title: '무선 Wi-Fi 카메라',
          desc: '배선 공사 부담을 줄이는 방식입니다. 소규모 매장이나 사무실에서 간편하게 시작할 수 있습니다.',
          bullets: ['배선 공사 최소화', '앱으로 간편 설치', '양방향 오디오'],
        },
      ],
    },
    catalog: {
      eyebrow: 'Features',
      title: '설치하면 이런 관리가 가능해집니다.',
      cards: [
        {
          title: '스마트폰 원격 확인',
          desc: '전용 앱으로 언제 어디서든 매장 화면을 실시간 확인할 수 있습니다. 여러 매장도 한 앱에서 관리합니다.',
        },
        {
          title: '로컬 + 클라우드 저장',
          desc: 'NVR 로컬 저장과 클라우드 백업을 선택할 수 있습니다. 영상 보관 기간도 운영 목적에 맞춥니다.',
        },
        {
          title: '이상 감지 알림',
          desc: '움직임 감지, 침입 알림, 소리 감지 기능으로 이상 상황 발생 시 스마트폰 알림을 받을 수 있습니다.',
        },
      ],
    },
    proof: {
      eyebrow: 'Guide',
      title: '매장 크기별 추천 채널 수',
      description: '* 정확한 채널 수는 매장 구조를 확인한 뒤 안내합니다.',
      cards: [
        { value: '4채널', label: '10평 이하 · 카페, 네일샵' },
        { value: '8채널', label: '10~30평 · 음식점, 미용실' },
        { value: '16채널+', label: '30평 이상 · 마트, 학원' },
      ],
    },
    guide: {
      eyebrow: 'Process',
      title: '상담부터 설치까지 3단계면 충분합니다.',
      cards: [
        { meta: '01', title: '전화 상담', desc: '매장 규모, 구조, 예산을 확인하고 최적 구성을 안내합니다.' },
        { meta: '02', title: '현장 방문', desc: '설치 위치와 사각지대를 직접 확인한 뒤 정확한 견적을 냅니다.' },
        { meta: '03', title: '설치 완료', desc: '배선과 앱 연동까지 영업에 지장 없는 시간에 설치합니다.' },
      ],
    },
    process: [
      { title: '기존 배선 활용', desc: '기존 CCTV 교체 시 가능한 배선을 살려 추가 비용을 줄입니다.' },
      { title: '원격 확인 세팅', desc: '스마트폰 앱 로그인, 알림, 저장 기간까지 실제 사용 기준으로 세팅합니다.' },
      { title: '인터넷 동시 점검', desc: '원격 확인이 끊기지 않도록 공유기, 회선, 포트 구성까지 확인합니다.' },
    ],
    faqs: [
      {
        q: 'CCTV 설치비는 얼마인가요?',
        a: '매장 규모와 카메라 수에 따라 다릅니다. 4채널 기본 설치는 설치비 무료 프로모션이 적용되는 경우가 많습니다.',
      },
      {
        q: '스마트폰으로 영상을 볼 수 있나요?',
        a: '네. 대부분의 CCTV 시스템이 스마트폰 앱 실시간 확인을 지원합니다. 앱 설정까지 설치 기사가 도와드립니다.',
      },
      {
        q: '기존 CCTV를 교체할 수 있나요?',
        a: '네. 기존 배선을 최대한 활용해 교체 설치하므로 추가 비용을 줄일 수 있습니다.',
      },
      {
        q: '몇 대가 적당한가요?',
        a: '10평 미만은 2~3대, 10~30평은 4~6대를 많이 권장합니다. 정확한 구성은 현장 구조를 봐야 합니다.',
      },
    ],
    consultChips: ['실내 CCTV', '실외 CCTV', '무선 카메라', '기존 교체'],
  },
} satisfies Record<string, ServiceLandingData>
