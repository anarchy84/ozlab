/* global React, Device, Icon */
const Hero = () => (
  <section className="hero">
    <div className="container hero-grid">
      <div className="hero-copy">
        <span className="eyebrow"><span className="dot"/>결제부터 리뷰·마케팅까지 한 대로</span>
        <h1 className="t-display">
          손님이 <mark className="hl">바글바글</mark>한<br/>
          가게에는 이유가 있죠.
        </h1>
        <p className="t-lead">
          잘 되는 가게는 이미 <b style={{ color: 'var(--ink-900)' }}>오즈랩페이</b>를 씁니다.<br/>
          결제 한 번이면 네이버 리뷰·place+·매장 홍보까지 알아서 따라옵니다.
        </p>
        <div className="hero-cta">
          <a href="#apply" className="btn btn-primary lg">0원으로 시작하기 <Icon.Arrow s={18}/></a>
          <a href="#review" className="btn btn-ghost">리뷰 자동화 원리 보기</a>
        </div>

        <div className="hero-meta">
          <div className="hero-meta-item">
            <span className="num">5,000<span className="unit">+</span></span>
            <span className="lbl">전국 도입 매장</span>
          </div>
          <div className="hero-meta-item">
            <span className="num">3.2<span className="unit">×</span></span>
            <span className="lbl">평균 리뷰 증가율</span>
          </div>
          <div className="hero-meta-item">
            <span className="num">place<span style={{ color: 'var(--green)' }}>+</span></span>
            <span className="lbl">검색 우선 노출 지표</span>
          </div>
        </div>
      </div>

      <div className="hero-visual">
        <div className="hero-halo"/>
        <div className="hero-device"><Device size={360}/></div>

        <div className="hero-tag t1">
          <span className="ic"><Icon.Card s={16}/></span>
          카드·QR·페이 전부
        </div>
        <div className="hero-tag t2">
          <span className="ic"><Icon.Star s={16}/></span>
          네이버 리뷰 자동화
        </div>
        <div className="hero-tag t3">
          <span className="ic"><Icon.Megaphone s={16}/></span>
          대기화면 매장 홍보
        </div>
        <div className="hero-tag t4 dark">
          <span className="ic"><Icon.Shield s={16}/></span>
          place+ 우선 노출
        </div>
      </div>
    </div>
  </section>
);
window.Hero = Hero;
