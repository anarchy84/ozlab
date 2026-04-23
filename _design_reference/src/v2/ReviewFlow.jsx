/* global React, Icon */
const ReviewFlow = () => (
  <section className="review-flow" id="review">
    <div className="container">
      <div className="s-head">
        <span className="eyebrow dark"><span className="dot"/>리뷰 자동화 메커니즘</span>
        <h2 className="t-h1">부탁 안 해도, 리뷰는 이렇게 쌓입니다.</h2>
        <p className="t-lead">
          손님께 "리뷰 좀…"이라고 말하는 건 이제 그만.<br/>
          결제 한 번이면, 네이버가 알아서 리뷰 요청까지 보내드립니다.
        </p>
      </div>

      <div className="flow-steps">
        <div className="flow-step">
          <div className="step-num">1</div>
          <h4>손님이 결제</h4>
          <p>카드·페이·QR 어떤 방식이든 오즈랩페이로 결제하면 시작됩니다.</p>
        </div>
        <div className="flow-step">
          <div className="step-num">2</div>
          <h4>네이버에 자동 연결</h4>
          <p>결제 정보가 네이버 영수증 시스템과 실시간 연동됩니다.</p>
        </div>
        <div className="flow-step">
          <div className="step-num">3</div>
          <h4>손님에게 요청 발송</h4>
          <p>사장님 대신 네이버가 알림으로 영수증 리뷰 작성을 안내합니다.</p>
        </div>
        <div className="flow-step">
          <div className="step-num">4</div>
          <h4>리뷰가 쌓임</h4>
          <p>꾸준하게 쌓이는 진짜 리뷰. place+ 지표에도 반영됩니다.</p>
        </div>
      </div>

      <div className="review-phone">
        <div className="review-phone-left">
          <span className="eyebrow dark" style={{ marginBottom: 16 }}><span className="dot"/>결과</span>
          <h3 className="t-h2" style={{ color: 'white' }}>부탁 없이도,<br/><span className="text-neon">매일 새 리뷰가 쌓입니다.</span></h3>
          <p>
            도입 매장의 90% 이상이 3개월 안에 리뷰 수가 2배 이상 증가했습니다.
            꾸준히 쌓이는 영수증 리뷰는 네이버 플레이스 상위 노출의 핵심 신호입니다.
          </p>
        </div>
        <div className="review-phone-visual">
          <div className="rv-item">
            <div className="rv-head">
              <div className="rv-avatar a">김</div>
              <div>
                <div className="rv-name">김** <span className="rv-auto-tag">자동요청</span></div>
              </div>
              <div className="rv-date">방금 전</div>
            </div>
            <div className="rv-stars">★★★★★</div>
            <div className="rv-txt">파스타 진짜 맛있어요. 분위기도 좋고 재방문 의사 100% 입니다!</div>
          </div>
          <div className="rv-item">
            <div className="rv-head">
              <div className="rv-avatar b">이</div>
              <div>
                <div className="rv-name">이** <span className="rv-auto-tag">자동요청</span></div>
              </div>
              <div className="rv-date">5분 전</div>
            </div>
            <div className="rv-stars">★★★★★</div>
            <div className="rv-txt">사장님 친절하시고 원두도 좋은 거 쓰시는 게 느껴져요 :)</div>
          </div>
          <div className="rv-item">
            <div className="rv-head">
              <div className="rv-avatar c">박</div>
              <div>
                <div className="rv-name">박** <span className="rv-auto-tag">자동요청</span></div>
              </div>
              <div className="rv-date">12분 전</div>
            </div>
            <div className="rv-stars">★★★★★</div>
            <div className="rv-txt">동네 맛집이에요. 식구끼리 자주 올 것 같습니다.</div>
          </div>
        </div>
      </div>
    </div>
  </section>
);
window.ReviewFlow = ReviewFlow;
