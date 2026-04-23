/* global React, Icon */
const Showcase = () => (
  <section className="showcase">
    <div className="container">
      <div className="section-head">
        <span className="eyebrow">One Device · All-in-One</span>
        <h2 className="h-1" style={{ marginTop: 16 }}>
          결제만 하던 단말기 시대는<br/>
          <mark className="hl-green">끝났습니다.</mark>
        </h2>
        <p>오즈랩페이는 결제·리뷰·마케팅·홍보를 한 대에 담은, 완전히 새로운 단말기입니다.</p>
      </div>

      <div className="showcase-main">
        <div>
          <span className="eyebrow dark">NEW · 신제품 출시</span>
          <h2 className="h-1" style={{ marginTop: 16 }}>
            <span style={{ color: '#17e06d' }}>한 대로 연결</span><br/>
            차별화된 카드단말기
          </h2>
          <p>카드·QR·페이사인·삼성페이까지, 손님의 모든 결제를 받으면서<br/>네이버 리뷰와 place+ 연동까지 자동으로 이어집니다.</p>
          <a href="#apply" className="btn btn-primary lg" style={{ background: '#17e06d', color: '#0a0a0a' }}>
            0원으로 시작하기 <Icon.Arrow s={18}/>
          </a>
        </div>
        <div className="showcase-img">
          <img src="assets/device-dark-standing.png" alt="오즈랩페이 단말기"/>
        </div>
      </div>
    </div>
  </section>
);
window.Showcase = Showcase;
