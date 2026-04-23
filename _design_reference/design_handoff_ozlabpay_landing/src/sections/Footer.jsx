/* global React, OzLogo */
const Footer = () => (
  <footer className="footer">
    <div className="container">
      <div>
        <div className="logo" style={{ color: 'white' }}>
          <OzLogo size={28} dark/>
        </div>
        <p>결제부터 리뷰·마케팅·홍보까지 한 대로 연결.</p>
        <p>© 2026 오즈랩페이 (Ozlabpay). All rights reserved.</p>
        <p style={{ marginTop: 16, fontSize: 12 }}>본 페이지는 네이버페이·플레이스와 연동되는 제휴 가맹 프로모션 안내 페이지입니다.</p>
      </div>
      <div>
        <h5>서비스</h5>
        <a href="#features">기능 소개</a>
        <a href="#review">리뷰 자동화</a>
        <a href="#placeplus">place+ 마크</a>
        <a href="#pricing">가격 안내</a>
      </div>
      <div>
        <h5>고객센터</h5>
        <a href="tel:1588-0000">1588-0000 (평일 9–18시)</a>
        <a href="#apply">상담 신청</a>
        <a href="#faq">자주 묻는 질문</a>
        <a href="#">이용약관 · 개인정보처리방침</a>
      </div>
    </div>
    <div className="footer-bottom container">
      제휴문의 · 가맹 · 언론 : partner@example.com
    </div>
  </footer>
);
window.Footer = Footer;
