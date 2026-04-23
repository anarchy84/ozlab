/* global React */
const Pricing = () => {
  const items = [
    { name: '3인치 단말기 세트', orig: '583,000', now: '66,000', colors: ['White','Black'], featured: false },
    { name: '10.1인치 안드로이드 POS 세트', orig: '1,012,000', now: '195,800', colors: ['White','Black'], featured: true, tag: 'BEST' },
    { name: '15인치 윈도우 POS Basic', orig: '1,117,000', now: '424,600', colors: ['White','Black'] },
    { name: '15인치 윈도우 POS Premium', orig: '1,315,000', now: '622,600', colors: ['White','Black'] },
    { name: '15인치 오더 POS Lite', orig: '940,500', now: '315,700', colors: ['White','Black'] },
    { name: '15인치 오더 POS Basic', orig: '1,038,500', now: '371,800', colors: ['White','Black'] },
    { name: '15인치 오더 POS Premium', orig: '1,138,500', now: '513,700', colors: ['White','Black'] },
  ];
  return (
    <section id="pricing" className="pricing">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">상품 구성 안내</span>
          <h2 className="h-1" style={{ marginTop: 16 }}>
            우리 매장에 맞는<br/><mark className="hl-green">구성</mark>으로 시작하세요
          </h2>
          <p>모든 가격은 VAT 포함 · 프로모션가는 신규 가입 시 적용됩니다.</p>
        </div>
        <img src="assets/product-grid.png" alt="오즈랩페이 상품 라인업" style={{ display: 'block', width: '100%', maxWidth: 520, margin: '0 auto 48px', borderRadius: 20, boxShadow: '0 20px 40px -12px rgba(0,0,0,.12)' }}/>
        <div className="price-grid">
          {items.map((it, i) => (
            <div key={i} className={`price-card ${it.featured ? 'featured' : ''}`}>
              <div className="price-tag">{it.tag || `구성 ${i+1}`}</div>
              <h3>{it.name}</h3>
              <div className="price-img">
                <img src="assets/device-netpay.png" alt=""/>
              </div>
              <div className="price-orig">정상가 {it.orig}원</div>
              <div className="price-now"><small>프로모션가</small>{it.now}원</div>
              <div className="price-color">
                {it.colors.map(c => <span key={c}><span className="sw" style={{ background: c === 'Black' ? '#1a1a1a' : 'white' }}/> {c}</span>)}
              </div>
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', marginTop: 32, fontSize: 13, color: '#9a9a9a' }}>* 제휴 POS사 신규 계약 시 오즈랩페이 단말기는 <b>0원으로 제공</b>됩니다.</p>
      </div>
    </section>
  );
};
window.Pricing = Pricing;
