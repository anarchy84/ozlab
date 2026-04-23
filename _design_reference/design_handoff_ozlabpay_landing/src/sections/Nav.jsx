/* global React, NPayLogo, Icon */
const Nav = () => {
  const links = [
    { href: '#features', label: '기능' },
    { href: '#review', label: '리뷰 자동화' },
    { href: '#placeplus', label: 'place+' },
    { href: '#pricing', label: '가격' },
    { href: '#faq', label: 'FAQ' },
  ];
  return (
    <nav className="nav">
      <div className="container nav-inner">
        <a href="#" className="logo" aria-label="오즈랩페이">
          <OzLogo size={28} />
        </a>
        <div className="nav-links">
          {links.map(l => <a key={l.href} href={l.href} className="nav-link">{l.label}</a>)}
        </div>
        <div className="nav-cta">
          <a href="tel:1588-0000" className="btn btn-ghost sm" style={{ padding: '10px 16px', fontSize: 14 }}>
            <Icon.Phone s={16}/> 1588-0000
          </a>
          <a href="#apply" className="btn btn-primary sm">지금 신청하기</a>
        </div>
      </div>
    </nav>
  );
};
window.Nav = Nav;
