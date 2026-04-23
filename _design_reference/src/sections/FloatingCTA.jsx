/* global React, Icon */
const { useState: useStateCTA, useEffect: useEffectCTA } = React;
const FloatingCTA = () => {
  const [show, setShow] = useStateCTA(false);
  const [dismissed, setDismissed] = useStateCTA(false);
  useEffectCTA(() => {
    const onScroll = () => setShow(window.scrollY > 600 && !dismissed);
    window.addEventListener('scroll', onScroll);
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [dismissed]);
  return (
    <div className={`floating-cta ${show ? 'show' : ''}`}>
      <div className="msg">
        <strong>🎁 지금 신청 시</strong> POS + 오즈랩페이 <span className="hide-sm">단말기</span> 0원 · <strong>플레이스 광고 무료</strong>
      </div>
      <a href="#apply" className="btn btn-primary">지금 신청하기 <Icon.Arrow s={16}/></a>
      <button className="close" onClick={() => setDismissed(true)} aria-label="닫기">×</button>
    </div>
  );
};
window.FloatingCTA = FloatingCTA;
