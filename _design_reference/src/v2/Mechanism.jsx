/* global React, Icon */
const Mechanism = () => (
  <section className="mechanism">
    <div className="container">
      <div className="s-head">
        <span className="eyebrow"><span className="dot"/>상위노출 원리</span>
        <h2 className="t-h1">플레이스 상위 노출,<br/>오즈랩페이가 <mark className="hl">가점</mark>을 만듭니다.</h2>
        <p className="t-lead">
          네이버 플레이스는 "손님이 실제로 오는 가게"를 상위에 보여줍니다.
          오즈랩페이는 그 신호를 자동으로 만들어냅니다.
        </p>
      </div>

      <div className="mech-grid">
        <div className="mech-card">
          <span className="mech-num">01</span>
          <div className="mech-icon"><Icon.Star s={28}/></div>
          <h4>꾸준한 영수증 리뷰</h4>
          <p>실구매자 리뷰가 매일 자동으로 쌓이는 매장이 최상위 신호를 받습니다.</p>
        </div>
        <div className="mech-card">
          <span className="mech-num">02</span>
          <div className="mech-icon"><Icon.Chart s={28}/></div>
          <h4>높은 클릭·방문 전환</h4>
          <p>place+ 마크가 붙은 매장은 클릭률이 최대 1.8배 높게 측정됩니다.</p>
        </div>
        <div className="mech-card">
          <span className="mech-num">03</span>
          <div className="mech-icon"><Icon.Shield s={28}/></div>
          <h4>실시간 영업 신뢰도</h4>
          <p>결제 · 영업시간 · 정보가 네이버와 동기화되어 '믿을 수 있는 매장'으로 분류됩니다.</p>
        </div>
      </div>
    </div>
  </section>
);
window.Mechanism = Mechanism;
