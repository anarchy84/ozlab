/* global React, OzLogo, Icon */
const Nav = () => (
  <>
    <div className="promo-strip">
      <span className="chip">EVENT</span>
      <span>POS 신규 계약 시 <strong>오즈랩페이 단말기 무상지원</strong> · 플레이스 리워드 광고 <strong>무료</strong></span>
    </div>
    <header className="nav">
      <div className="container nav-inner">
        <a href="#" className="logo-wm">
          <span className="logo-mark">Oz</span>
          <span>오즈랩<span style={{ color: 'var(--green)' }}>페이</span></span>
        </a>
        <nav className="nav-links">
          <a className="nav-link" href="#features">기능</a>
          <a className="nav-link" href="#review">리뷰 자동화</a>
          <a className="nav-link" href="#placeplus">place+</a>
          <a className="nav-link" href="#pricing">상품·가격</a>
          <a className="nav-link" href="#faq">자주 묻는 질문</a>
        </nav>
        <div className="nav-cta">
          <a className="nav-tel" href="tel:1588-0000"><Icon.Phone s={16}/> 1588-0000</a>
          <a className="btn btn-primary sm" href="#apply">무료 상담 신청</a>
        </div>
      </div>
    </header>
  </>
);
window.Nav = Nav;
