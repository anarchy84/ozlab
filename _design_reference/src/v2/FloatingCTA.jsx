/* global React */
const { useState: useStateFCTA, useEffect: useEffectFCTA } = React;
const FloatingCTA = () => {
  const [show, setShow] = useStateFCTA(false);
  const [hide, setHide] = useStateFCTA(false);
  useEffectFCTA(() => {
    const onScroll = () => setShow(window.scrollY > 700);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  if (hide) return null;
  return (
    <div className={`floating-cta ${show ? 'show' : ''}`}>
      <span className="msg">
        <strong>지금 신청</strong>하면 오즈랩페이 <span className="hide-sm">단말기 + 리워드 광고</span> 무료
      </span>
      <a href="#apply" className="btn btn-neon">무료 상담 받기</a>
      <button className="close" onClick={() => setHide(true)}>×</button>
    </div>
  );
};
window.FloatingCTA = FloatingCTA;
