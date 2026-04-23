/* global React, Icon */
const { useState: useStateFAQ } = React;
const FAQ = () => {
  const [open, setOpen] = useStateFAQ(0);
  const items = [
    { q: '오즈랩페이 단말기를 무료로 받을 수 있는 조건은?', a: '제휴 POS사 신규 계약 시 오즈랩페이 단말기를 무상으로 제공해드립니다. 가맹 심사 후 설치까지 평균 3~5일 소요됩니다.' },
    { q: '기존 POS를 쓰고 있어도 추가로 사용할 수 있나요?', a: '네, 가능합니다. 기존 POS와 병행 사용할 수 있으며, 결제·리뷰·홍보 기능만 오즈랩페이로 이용하실 수 있습니다.' },
    { q: '리뷰는 정말 자동으로 쌓이나요?', a: '네. 손님이 네이버페이·카드 등으로 결제하면 네이버가 영수증 리뷰 요청 알림을 자동으로 보냅니다. 손님은 포인트를 받고, 매장은 리뷰가 쌓입니다.' },
    { q: 'place+ 마크는 어떻게 붙나요?', a: '오즈랩페이 단말기를 설치하고 정상적으로 운영하면 네이버 플레이스 검색결과에 place+ 마크가 자동으로 부여됩니다.' },
    { q: '설치비와 월 이용료가 따로 있나요?', a: '프로모션 기간 중에는 설치비가 전액 지원되며, 기본 이용료는 결제 수수료에 포함되어 추가 부담이 없습니다. 자세한 사항은 상담에서 안내드립니다.' },
    { q: '상담 후 바로 계약해야 하나요?', a: '아닙니다. 상담은 무료이며, 혜택·견적 안내만 받아보시고 천천히 결정하셔도 괜찮습니다.' },
  ];
  return (
    <section id="faq" className="faq">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">자주 묻는 질문</span>
          <h2 className="h-1" style={{ marginTop: 16 }}>궁금한 점이 있으신가요?</h2>
        </div>
        <div className="faq-list">
          {items.map((it, i) => (
            <div key={i} className="faq-item" data-open={open === i}>
              <button className="faq-q" onClick={() => setOpen(open === i ? -1 : i)}>
                <span>{it.q}</span>
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
