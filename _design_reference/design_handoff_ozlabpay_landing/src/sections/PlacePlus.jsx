/* global React */
const PlacePlus = () => (
  <section id="placeplus" className="placeplus">
    <div className="container placeplus-grid">
      <div>
        <span className="eyebrow">place+ 마크</span>
        <h2 className="h-1" style={{ marginTop: 16 }}>
          손님이 믿고 찾는 가게에만<br/>
          <mark className="hl-green">place+</mark>가 붙습니다.
        </h2>
        <p style={{ color: '#6b6b6b', fontSize: 17, marginTop: 20 }}>
          네이버 플레이스 검색결과에서 <b>place+ 마크</b>는 <b>오즈랩페이 단말기를 쓰는 매장만</b> 받을 수 있습니다.
          손님에게는 "믿을 수 있는 가게"라는 신호가 되고, 매장은 클릭률이 올라갑니다.
        </p>
        <ul className="feature-bullets" style={{ marginTop: 24 }}>
          <li>오즈랩페이 단말기 사용 매장에만 자동 부여</li>
          <li>플레이스 검색결과 눈에 띄는 위치에 강조 노출</li>
          <li>손님의 신뢰도 ↑, 클릭률 ↑, 방문율 ↑</li>
        </ul>
      </div>

      <div>
        <div className="place-badge-demo">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 14, borderBottom: '1px solid #efefef', marginBottom: 14 }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#03c75a', color: 'white', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>N</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>네이버 플레이스 · "홍대 맛집"</div>
          </div>

          <div className="place-item">
            <div className="place-thumb a"/>
            <div className="place-body">
              <div className="place-title">단골식당 <span className="place-plus-mark">place+</span></div>
              <div className="place-meta"><span className="rating">★ 4.8</span> <span>리뷰 1,284</span> <span>· 한식</span></div>
              <div style={{ fontSize: 12, color: '#6b6b6b', marginTop: 4 }}>홍대입구역 3번 출구 · 도보 3분</div>
            </div>
          </div>
          <div className="place-item">
            <div className="place-thumb b"/>
            <div className="place-body">
              <div className="place-title">초록집밥 <span className="place-plus-mark">place+</span></div>
              <div className="place-meta"><span className="rating">★ 4.7</span> <span>리뷰 932</span> <span>· 분식</span></div>
              <div style={{ fontSize: 12, color: '#6b6b6b', marginTop: 4 }}>홍대입구역 9번 출구 · 도보 5분</div>
            </div>
          </div>
          <div className="place-item" style={{ opacity: .55 }}>
            <div className="place-thumb c"/>
            <div className="place-body">
              <div className="place-title">○○식당</div>
              <div className="place-meta"><span style={{ color: '#9a9a9a' }}>★ 4.6</span> <span>리뷰 212</span> <span>· 한식</span></div>
              <div style={{ fontSize: 12, color: '#9a9a9a', marginTop: 4 }}>place+ 없음 · 낮은 노출</div>
            </div>
          </div>
        </div>
        <p style={{ textAlign: 'center', fontSize: 13, color: '#6b6b6b', marginTop: 16 }}>
          ↑ place+ 가 붙은 매장은 <b>같은 조건에서 상위</b>로 표시됩니다.
        </p>
      </div>
    </div>
  </section>
);
window.PlacePlus = PlacePlus;
