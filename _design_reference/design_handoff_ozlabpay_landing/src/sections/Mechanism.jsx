/* global React, Icon */
const Mechanism = () => {
  const items = [
    { icon: <Icon.Star s={28}/>, title: '영수증 리뷰 수', desc: '네이버 알고리즘은 리뷰 수·빈도를 핵심 지표로 봅니다.' },
    { icon: <Icon.Search s={28}/>, title: '검색 클릭률', desc: 'place+ 매장은 눈에 띄어 자연스럽게 클릭률이 올라갑니다.' },
    { icon: <Icon.Shield s={28}/>, title: '네이버 인증 가맹', desc: '오즈랩페이 단말기는 공식 인증 가맹 지표로 반영됩니다.' },
  ];
  return (
    <section className="mechanism">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">검색 상위 노출의 원리</span>
          <h2 className="h-1" style={{ marginTop: 16 }}>
            오즈랩페이만 써도<br/><mark className="hl-green">자동으로 가점</mark>이 쌓입니다.
          </h2>
          <p>플레이스 검색 알고리즘은 <b>리뷰 수</b>와 <b>클릭률</b>을 중요하게 봅니다. 오즈랩페이는 이 두 지표 모두를 자연스럽게 끌어올립니다.</p>
        </div>
        <div className="mech-diagram">
          {items.map((it, i) => (
            <div key={i} className="mech-item">
              <div className="mech-icon">{it.icon}</div>
              <h4>{it.title}</h4>
              <p>{it.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
window.Mechanism = Mechanism;
