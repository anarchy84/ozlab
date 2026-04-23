/* global React, Icon */
const PlacePlus = () => (
  <section className="placeplus" id="placeplus">
    <div className="container pp-grid">
      <div className="pp-copy">
        <span className="eyebrow"><span className="dot"/>place+ 인증 마크</span>
        <h2 className="t-h1">네이버 플레이스의<br/><mark className="hl">파란 place+ 마크</mark>,<br/>오즈랩페이만 받습니다.</h2>
        <p className="t-lead">
          손님이 가게를 고를 때 맨 먼저 보는 신뢰 지표.
          place+ 마크는 오즈랩페이 단말기를 쓰는 매장에만 붙습니다.
        </p>
        <div className="pp-highlight">
          <strong>place+</strong>는 "결제·리뷰·정보가 네이버에 실시간 연결된 매장"이라는 뜻이에요.
          손님은 이 마크 하나로 가게의 기본 신뢰도를 확인합니다.
        </div>
      </div>

      <div className="pp-mock">
        <div className="pp-searchbar">
          <Icon.Search s={16}/>
          <span>망원동 파스타</span>
        </div>
        <div className="pp-tabs">
          <span className="pp-tab active">플레이스</span>
          <span className="pp-tab">지도</span>
          <span className="pp-tab">VIEW</span>
          <span className="pp-tab">이미지</span>
        </div>

        <div className="pp-item featured">
          <div className="pp-thumb a"/>
          <div className="pp-body">
            <div className="pp-title">
              파스타 공방 <span className="pp-mark">place+</span>
            </div>
            <div className="pp-meta">
              <span className="pp-rating">★ 4.9</span>
              <span>리뷰 1,284</span>
              <span>양식당</span>
            </div>
            <div className="pp-desc">망원역 3분 · 영업 중 · 오즈랩페이 인증 매장</div>
          </div>
        </div>

        <div className="pp-item">
          <div className="pp-thumb b"/>
          <div className="pp-body">
            <div className="pp-title">이웃 식당</div>
            <div className="pp-meta">
              <span className="pp-rating">★ 4.2</span>
              <span>리뷰 87</span>
              <span>양식당</span>
            </div>
            <div className="pp-desc">망원역 5분</div>
          </div>
        </div>

        <div className="pp-item">
          <div className="pp-thumb c"/>
          <div className="pp-body">
            <div className="pp-title">다른 식당</div>
            <div className="pp-meta">
              <span className="pp-rating">★ 3.8</span>
              <span>리뷰 24</span>
              <span>양식당</span>
            </div>
            <div className="pp-desc">망원역 7분</div>
          </div>
        </div>
      </div>
    </div>
  </section>
);
window.PlacePlus = PlacePlus;
