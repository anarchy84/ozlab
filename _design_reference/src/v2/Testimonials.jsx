/* global React */
const quotes = [
  { stars: 5, q: '리뷰 달아달라고 말하는 게 스트레스였는데, 단말기 바꾸고 나서 <span class="hl">알아서 리뷰가 쌓이는 게</span> 신기해요.', name: '김사장님', role: '망원 카페', init: '김' },
  { stars: 5, q: 'place+ 마크 붙고 나서 플레이스 노출이 달라졌어요. <span class="hl">평일 낮 유입</span>이 확실히 늘었습니다.', name: '이대표님', role: '역삼 파스타', init: '이' },
  { stars: 5, q: '대기화면에 이벤트 걸어두니까 손님들이 물어보세요. <span class="hl">광고판이 따로 없더라고요</span>.', name: '박사장님', role: '홍대 주점', init: '박' },
];

const Testimonials = () => (
  <section className="testimonials">
    <div className="container">
      <div className="s-head">
        <span className="eyebrow"><span className="dot"/>도입 매장 이야기</span>
        <h2 className="t-h1">이미 <mark className="hl">5,000+ 매장</mark>이 달라졌습니다.</h2>
        <p className="t-lead">전국의 잘 되는 가게들이 오즈랩페이를 쓰는 이유.</p>
      </div>

      <div className="quote-grid">
        {quotes.map((q, i) => (
          <div key={i} className="quote-card">
            <div className="stars">{'★'.repeat(q.stars)}</div>
            <blockquote dangerouslySetInnerHTML={{__html: `"${q.q}"`}}/>
            <div className="quote-author">
              <div className="quote-avatar">{q.init}</div>
              <div>
                <div className="quote-name">{q.name}</div>
                <div className="quote-role">{q.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);
window.Testimonials = Testimonials;
