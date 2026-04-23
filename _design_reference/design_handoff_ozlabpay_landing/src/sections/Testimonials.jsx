/* global React */
const Testimonials = () => {
  const quotes = [
    { stars: 5, q: '매장에 단말기만 뒀을 뿐인데 네이버 리뷰가 알아서 쌓이더라고요. 3개월만에 리뷰 300건 넘었어요.', name: '박○○ 사장님', role: '홍대 카페' },
    { stars: 5, q: '결제, 쿠폰, 홍보까지 한 번에 되니까 다른 프로그램을 쓸 필요가 없어요. 운영이 훨씬 편해졌습니다.', name: '이○○ 사장님', role: '강남 음식점' },
    { stars: 5, q: 'place+ 마크 생기고 나서 지도 검색으로 들어오는 신규 손님이 눈에 띄게 늘었어요.', name: '정○○ 사장님', role: '성수 베이커리' },
  ];
  return (
    <section className="testimonials">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">사장님들의 진짜 후기</span>
          <h2 className="h-1" style={{ marginTop: 16 }}>
            이미 <mark className="hl-green">5,000+</mark> 매장이<br/>효과를 경험했습니다
          </h2>
        </div>
        <div className="quote-grid">
          {quotes.map((q, i) => (
            <div key={i} className="quote-card">
              <div className="stars">{'★'.repeat(q.stars)}</div>
              <blockquote>"{q.q}"</blockquote>
              <div className="quote-author">
                <div className="quote-avatar">{q.name[0]}</div>
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
};
window.Testimonials = Testimonials;
