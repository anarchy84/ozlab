/* global React, OzLogo, Icon */
const Hero = () => (
  <>
    <div className="promo-strip">
      <span className="chip">EVENT</span>
      <span>POS 신규 가입 시 <strong>오즈랩페이 단말기 무상지원</strong> + <strong>플레이스 리워드 광고 무료</strong></span>
    </div>
    <section className="hero">
      <div className="container hero-grid">
        <div className="hero-copy">
          <span className="eyebrow">결제부터 리뷰·마케팅까지 한 대로</span>
          <h1 className="h-display" style={{ marginTop: 16 }}>
            손님이 <mark className="hl-green">바글바글</mark>한<br/>
            가게에는 이유가 있죠.
          </h1>
          <p>
            결제부터 리뷰·마케팅까지 한 대로 연결.<br/>
            지금 잘 되는 가게들은 모두 <b>오즈랩페이</b>를 씁니다.
          </p>
          <div className="hero-cta">
            <a href="#apply" className="btn btn-primary lg">0원으로 시작하기 <Icon.Arrow s={18}/></a>
            <a href="#review" className="btn btn-ghost">리뷰 자동화 보기</a>
          </div>
          <div className="hero-meta">
            <span><strong>5,000+</strong> 매장 도입</span>
            <span><strong>평균 리뷰 3.2배</strong> 증가</span>
            <span><strong>place+</strong> 검색 우선 노출</span>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-device-bg"/>
          <img className="hero-device" src="assets/hero-vertical.png" alt="오즈랩페이 단말기"/>
          <div className="hero-tag t1"><span className="dot"/> 네이버 리뷰 자동 작성</div>
          <div className="hero-tag t2"><span className="dot"/> 카드·QR·페이 전부</div>
          <div className="hero-tag t3"><span className="dot"/> place+ 검색 상위 노출</div>
          <div className="hero-tag t4"><span className="dot"/> 대기화면 매장 홍보</div>
        </div>
      </div>
    </section>

    {/* Big visual band */}
    <section className="visual-band">
      <div className="container">
        <div className="visual-band-inner">
          <div className="visual-card"><img src="assets/hanwool-hero.png" alt="매장 설치 이미지"/></div>
          <div className="visual-card"><img src="assets/device-okpos-pointing.png" alt="오즈랩페이 단말기"/></div>
          <div className="visual-card"><img src="assets/feature-stack.png" alt="기능 소개"/></div>
        </div>
      </div>
    </section>
  </>
);
window.Hero = Hero;
