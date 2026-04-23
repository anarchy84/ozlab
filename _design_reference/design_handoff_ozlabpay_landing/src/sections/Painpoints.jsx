/* global React */
const Painpoints = () => {
  const items = [
    { num: '01', bubble: '"리뷰 달아주세요"… 말하기 민망하고', title: '리뷰는 부탁하기 어려워요', desc: '손님께 직접 요청하기 어색하고, 부탁해도 반응은 시큰둥.' },
    { num: '02', bubble: '결제만 하고 그냥 나가는 손님', title: '한 번 온 손님이 다시 오지 않아요', desc: '데이터가 없으니 재방문 유도도, 단골 관리도 어렵습니다.' },
    { num: '03', bubble: '쿠폰, 홍보, 리뷰… 다 따로따로', title: '관리할 게 너무 많아요', desc: '여러 서비스 왔다 갔다 하다 지쳐서 결국 아무것도 못합니다.' },
  ];
  return (
    <section className="painpoints">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">사장님, 이런 고민 있으시죠?</span>
          <h2 className="h-1" style={{ marginTop: 16 }}>
            결제만 되는 단말기 시대는<br/><mark className="hl-green">끝났습니다.</mark>
          </h2>
          <p>장사에 집중하기도 벅찬데, 마케팅까지 혼자 하기는 어렵잖아요.</p>
        </div>
        <div className="painpoints-grid">
          {items.map(it => (
            <div key={it.num} className="pain-card">
              <div className="num">{it.num}</div>
              <h3>{it.title}</h3>
              <p>{it.desc}</p>
              <div className="pain-bubble">💬 {it.bubble}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
window.Painpoints = Painpoints;
