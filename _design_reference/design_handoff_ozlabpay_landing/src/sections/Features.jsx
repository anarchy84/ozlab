/* global React, Icon */
const Features = () => {
  const rows = [
    {
      eyebrow: '01. 결제',
      icon: <Icon.Card s={20}/>,
      title: <>손님이 원하는<br/><mark className="hl-green">모든 결제 수단</mark> 지원</>,
      desc: '카드 · QR · 페이사인 · 삼성페이 · 제로페이까지. 손님이 꺼낸 결제 수단, 뭐든 받을 수 있습니다.',
      bullets: ['신용·체크카드, IC/무선', 'QR 결제 (네이버페이·카카오페이·제로페이)', '페이사인·삼성페이·애플페이', '현금영수증 자동 발행'],
      visual: 'assets/ok-pair.png',
      visualClass: 'green',
      reverse: false,
    },
    {
      eyebrow: '02. 리뷰',
      icon: <Icon.Star s={20}/>,
      title: <>결제 끝, 바로<br/><mark className="hl-green">네이버 리뷰</mark>로 연결</>,
      desc: '사장님이 따로 부탁하지 않아도, 결제와 동시에 네이버가 손님에게 알아서 리뷰를 요청합니다.',
      bullets: ['결제 즉시 네이버 플레이스 리뷰 작성 유도', '영수증 리뷰 자동 누적', '리뷰 포인트로 재방문율 UP', '네이버 지도 검색 상위 노출에 기여'],
      visual: 'assets/review-auto-img.png',
      visualClass: 'dark',
      reverse: true,
    },
    {
      eyebrow: '03. 마케팅',
      icon: <Icon.Megaphone s={20}/>,
      title: <>한 번 온 손님을<br/><mark className="hl-green">자주 오는 단골</mark>로</>,
      desc: '결제 데이터로 고객 취향을 파악해 쿠폰·적립·맞춤 혜택을 자동으로 제공합니다.',
      bullets: ['구매 이력 기반 맞춤 쿠폰', '자동 적립 & 리워드', '네이버 스마트플레이스 연동', '재방문율·객단가 리포트'],
      visual: 'assets/device-bodycodi.png',
      visualClass: 'dark',
      reverse: false,
    },
    {
      eyebrow: '04. 홍보',
      icon: <Icon.Chart s={20}/>,
      title: <>매장 소식·이벤트를<br/><mark className="hl-green">실시간 홍보</mark></>,
      desc: '손님이 매장에 머무는 동안, 대기화면이 우리 가게의 광고판이 됩니다.',
      bullets: ['대기화면에 이벤트·신메뉴 노출', '영상·이미지 광고 스케줄링', 'place+ 배지 자동 적용', '리뷰 이벤트 실시간 공지'],
      visual: 'assets/device-with-features.png',
      visualClass: 'dark',
      reverse: true,
    },
  ];
  return (
    <section id="features" className="features">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">오즈랩페이 4가지 핵심 가치</span>
          <h2 className="h-1" style={{ marginTop: 16 }}>
            결제 · 리뷰 · 마케팅 · 홍보<br/>
            <mark className="hl-green">한 대로</mark> 다 됩니다.
          </h2>
        </div>
        {rows.map((r, i) => (
          <div key={i} className={`feature-row ${r.reverse ? 'reverse' : ''}`}>
            <div className="feature-copy">
              <span className="eyebrow">{r.icon}{r.eyebrow}</span>
              <h2 className="h-1" style={{ marginTop: 16 }}>{r.title}</h2>
              <p>{r.desc}</p>
              <ul className="feature-bullets">
                {r.bullets.map((b, j) => <li key={j}>{b}</li>)}
              </ul>
            </div>
            <div className={`feature-visual ${r.visualClass}`}>
              <img src={r.visual} alt=""/>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
window.Features = Features;
