/* global React, Device */

// Small POS icon for price cards
const PosIcon = () => (
  <svg width="120" height="86" viewBox="0 0 120 86" fill="none">
    <defs>
      <linearGradient id="pos-g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fafafa"/>
        <stop offset="1" stopColor="#d8d8d8"/>
      </linearGradient>
    </defs>
    <rect x="10" y="12" width="66" height="50" rx="4" fill="url(#pos-g)" stroke="#bbb"/>
    <rect x="14" y="16" width="58" height="36" rx="2" fill="#0a0a0a"/>
    <rect x="10" y="62" width="66" height="14" rx="2" fill="#eee" stroke="#bbb"/>
    <circle cx="80" cy="68" r="2" fill="#888"/>
    {/* device */}
    <path d="M 84 62 L 112 62 L 108 20 L 88 20 Z" fill="url(#pos-g)" stroke="#bbb"/>
    <path d="M 88 20 L 108 20 L 106 54 L 90 54 Z" fill="#0a0a0a"/>
    <ellipse cx="98" cy="30" rx="7" ry="2" fill="#17e06d" opacity="0.7"/>
    <circle cx="98" cy="38" r="4" fill="none" stroke="#17e06d"/>
    <ellipse cx="98" cy="46" rx="8" ry="2" fill="#17e06d"/>
  </svg>
);

const tiers = [
  { tag: '구성 1', title: '3인치 단말기 세트', orig: '583,000원', now: '66,000', feat: false },
  { tag: '구성 2', title: '10.1인치 안드로이드 POS 세트', orig: '1,012,000원', now: '195,800', feat: false },
  { tag: '구성 3', title: '15인치 윈도우 POS Basic 세트', orig: '1,117,000원', now: '424,600', feat: true },
  { tag: '구성 4', title: '15인치 윈도우 POS 프리미엄 세트', orig: '1,315,000원', now: '622,600', feat: false },
  { tag: '구성 5', title: '15인치 윈도우 오더 POS Lite 세트', orig: '940,500원', now: '315,700', feat: false },
  { tag: '구성 6', title: '15인치 윈도우 오더 POS Basic 세트', orig: '1,038,500원', now: '371,800', feat: false },
];

const Pricing = () => (
  <section className="pricing" id="pricing">
    <div className="container">
      <div className="s-head">
        <span className="eyebrow"><span className="dot"/>상품 구성 · 가격</span>
        <h2 className="t-h1">필요한 만큼, <mark className="hl">합리적으로.</mark></h2>
        <p className="t-lead">매장 크기와 업종에 맞춰 6가지 구성으로 준비했습니다. 계약 조건에 따라 <strong>오즈랩페이 단말기는 무상 제공</strong>됩니다.</p>
        <div className="price-note">* VAT 포함가 · 프로모션가는 조건부 할인 적용가입니다.</div>
      </div>

      <div className="price-grid">
        {tiers.map((t, i) => (
          <div key={i} className={`price-card ${t.feat ? 'featured' : ''}`}>
            <div className="price-tag">{t.tag}</div>
            <h3>{t.title}</h3>
            <div className="price-visual"><PosIcon/></div>
            <div>
              <div className="price-orig">정상가 {t.orig}</div>
              <div className="price-promo-label">프로모션가</div>
              <div className="price-now">{t.now}<small>원</small></div>
            </div>
            <div className="price-color">
              <span><span className="sw"/>White</span>
              <span><span className="sw black"/>Black</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);
window.Pricing = Pricing;
