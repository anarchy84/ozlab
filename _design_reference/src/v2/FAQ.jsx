/* global React, Icon */
const { useState } = React;

const items = [
  { q: '기존 단말기를 바꿔야 하나요?', a: '네, 네이버와 연동되는 오즈랩페이 전용 단말기를 사용합니다. 기존 단말기 해지·이전 절차는 담당 매니저가 대신 처리해 드리니 걱정 없이 맡기세요.' },
  { q: '진짜 0원 맞나요? 숨은 비용이 있진 않나요?', a: 'POS 신규 계약 조건에 해당하면 오즈랩페이 단말기는 무상 지급됩니다. VAN 수수료·가맹점 수수료는 일반 카드단말기 수준과 동일하며, 별도의 월 구독료는 없습니다.' },
  { q: 'place+ 마크는 언제부터 노출되나요?', a: '설치 및 네이버 연동 완료 후 평균 3~7일 내에 플레이스 검색 결과에 place+ 마크가 붙습니다.' },
  { q: '리뷰가 자동으로 쌓인다는 건 무슨 뜻인가요?', a: '손님이 결제를 마치면 네이버에서 영수증 리뷰 요청 알림을 자동으로 발송합니다. 사장님이 직접 부탁하지 않아도 실구매자 리뷰가 꾸준히 쌓입니다.' },
  { q: '설치는 얼마나 걸리나요?', a: '상담 후 최단 3영업일 내에 설치·개통 가능합니다. 전국 방문 설치 지원.' },
  { q: '기존 POS와 같이 쓸 수 있나요?', a: '네. 오더엔·한울·오케이포스 등 주요 POS와 연동됩니다. 기존 운영 방식 그대로 사용하실 수 있어요.' },
];

const FAQ = () => {
  const [open, setOpen] = useState(0);
  return (
    <section className="faq" id="faq">
      <div className="container">
        <div className="s-head">
          <span className="eyebrow"><span className="dot"/>자주 묻는 질문</span>
          <h2 className="t-h1">궁금한 건 다 물어보세요.</h2>
          <p className="t-lead">도입 전에 가장 많이 받는 질문을 모았습니다.</p>
        </div>
        <div className="faq-list">
          {items.map((it, i) => (
            <div key={i} className="faq-item" data-open={open === i}>
              <button className="faq-q" onClick={() => setOpen(open === i ? -1 : i)}>
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  <span className="q-mark">Q</span>{it.q}
                </span>
                <span className="ic"><Icon.Plus s={20}/></span>
              </button>
              <div className="faq-a">{it.a}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
window.FAQ = FAQ;
