/* global React */
const Footer = () => (
  <footer className="footer">
    <div className="container">
      <div className="footer-top">
        <div>
          <a href="#" className="logo-wm">
            <span className="logo-mark">Oz</span>
            <span style={{ color: 'white' }}>오즈랩<span style={{ color: 'var(--green)' }}>페이</span></span>
          </a>
          <p style={{ marginTop: 8 }}>결제부터 리뷰·마케팅·홍보까지, 한 대로 연결되는 사장님을 위한 단말기 플랫폼.</p>
          <p style={{ marginTop: 16 }}>고객센터 <strong style={{ color: 'white' }}>1588-0000</strong><br/>평일 09:00 ~ 18:00</p>
        </div>
        <div>
          <h5>제품</h5>
          <ul>
            <li><a href="#features">기능</a></li>
            <li><a href="#review">리뷰 자동화</a></li>
            <li><a href="#placeplus">place+</a></li>
            <li><a href="#pricing">가격</a></li>
          </ul>
        </div>
        <div>
          <h5>회사</h5>
          <ul>
            <li><a href="#">소개</a></li>
            <li><a href="#">파트너</a></li>
            <li><a href="#">공지사항</a></li>
            <li><a href="#">채용</a></li>
          </ul>
        </div>
        <div>
          <h5>고객지원</h5>
          <ul>
            <li><a href="#faq">자주 묻는 질문</a></li>
            <li><a href="#apply">무료 상담</a></li>
            <li><a href="#">설치 문의</a></li>
            <li><a href="#">이용약관</a></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <div>© 2026 OzlabPay Inc. All rights reserved.</div>
        <div>사업자등록번호 000-00-00000 · 대표 홍길동 · 서울 강남구</div>
      </div>
    </div>
  </footer>
);
window.Footer = Footer;
