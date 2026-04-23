/* global React, Icon */
const Promotion = () => (
  <section className="promo-banner">
    <div className="container">
      <div className="promo-box">
        <div>
          <span className="eyebrow dark">🎁 지금만 제공되는 특별 혜택</span>
          <h2 style={{ marginTop: 16 }}>
            지금 신청하면<br/>
            <span style={{ color: '#17e06d' }}>플레이스 리워드 광고</span><br/>
            완전 무료!
          </h2>
          <p>POS 신규 계약 시 오즈랩페이 단말기 무상지원 +<br/>플레이스 리워드 광고 크레딧까지 함께 드립니다.</p>
          <a href="#apply" className="btn btn-primary lg">지금 신청하기 <Icon.Arrow s={18}/></a>
        </div>
        <div style={{ position: 'relative' }}>
          <img src="assets/zero-promo.png" alt="0원 프로모션" style={{ width: '100%', maxWidth: 360, margin: '0 auto', display: 'block', filter: 'drop-shadow(0 30px 50px rgba(0,0,0,.4))' }}/>
        </div>
      </div>
    </div>
  </section>
);
window.Promotion = Promotion;
