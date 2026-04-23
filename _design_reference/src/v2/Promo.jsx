/* global React, Icon */
const Promo = () => (
  <section className="promo-banner">
    <div className="container">
      <div className="promo-box">
        <div>
          <span className="eyebrow dark" style={{ marginBottom: 20 }}><span className="dot"/>한정 프로모션 진행 중</span>
          <h2 className="t-h1" style={{ color: 'white' }}>
            지금 신청하면,<br/>
            <mark className="hl-solid">플레이스 리워드 광고</mark>까지 무료.
          </h2>
          <p className="t-lead">
            POS 신규 계약 시 오즈랩페이 단말기 무상 지원 +<br/>
            3개월치 리워드 광고 비용 0원. 이번 달 한정 혜택입니다.
          </p>
          <a href="#apply" className="btn btn-neon lg">지금 바로 무료 상담 <Icon.Arrow s={18}/></a>
        </div>
        <div className="promo-zero">
          0<span className="w">원</span>
          <small>으로 시작하기</small>
        </div>
      </div>
    </div>
  </section>
);
window.Promo = Promo;
