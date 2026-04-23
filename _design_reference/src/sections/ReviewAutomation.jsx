/* global React, Icon */
const ReviewAutomation = () => {
  const steps = [
    { idx: 'STEP 1', title: '손님이 결제', desc: '카드·QR·페이 어떤 수단으로든 결제하면' },
    { idx: 'STEP 2', title: '리뷰 요청 자동 전송', desc: '네이버가 손님에게 영수증 리뷰 요청을 자동으로 보냅니다' },
    { idx: 'STEP 3', title: '리뷰 작성 (포인트 지급)', desc: '손님은 네이버페이 포인트를 받고, 매장은 리뷰가 쌓입니다' },
    { idx: 'STEP 4', title: '검색 상위 노출', desc: '리뷰가 쌓이면 플레이스 검색에서 상위로 올라갑니다' },
  ];
  return (
    <section id="review" className="review-auto">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow dark">✨ 오즈랩페이만의 핵심 차별점</span>
          <h2 className="h-1" style={{ marginTop: 16 }}>
            "리뷰 달아달라" 말하지 마세요.<br/>
            <mark className="hl-solid">네이버가 알아서</mark> 요청합니다.
          </h2>
          <p className="subtitle">영수증 리뷰, 사장님이 직접 부탁하기 어려우셨죠?<br/>오즈랩페이만 있으면 결제와 동시에 리뷰가 자동으로 쌓입니다.</p>
        </div>

        <div className="flow">
          {steps.map((s, i) => (
            <div key={i} className="flow-step">
              <div className="idx">{s.idx}</div>
              <h4>{s.title}</h4>
              <p>{s.desc}</p>
              {i < steps.length - 1 && (
                <div className="flow-arrow"><Icon.Arrow s={24}/></div>
              )}
            </div>
          ))}
        </div>

        <div style={{ maxWidth: 520, margin: '60px auto 0' }}>
          <div className="review-mock">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#ffd8a0,#ff9d5c)' }}/>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>김○○ 님</div>
                  <div className="stars">★★★★★</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#9a9a9a' }}>방금 전</div>
            </div>
            <div style={{ fontSize: 14, color: '#404040', lineHeight: 1.6 }}>
              메뉴가 정말 맛있어요! 사장님이 직접 설명해주셔서 더 좋았네요. 다음에 또 방문할게요 😊
            </div>
            <div style={{ marginTop: 12, padding: 10, background: '#f1fbf4', borderRadius: 8, fontSize: 12, color: '#019544', fontWeight: 600 }}>
              💰 네이버페이 포인트 지급완료 · 영수증 리뷰 1건 추가
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
window.ReviewAutomation = ReviewAutomation;
