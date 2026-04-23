/* global React, Device */

// Row 1: receipt + payment methods
const PayIcon = ({ label, bg, code }) => (
  <div className="vis-pay">
    <span className="ic" style={{ background: bg }}>{code}</span>
    {label}
  </div>
);

// Mini sparkline for Row 2
const Spark = ({ trend = 'up' }) => (
  <svg viewBox="0 0 100 36" preserveAspectRatio="none">
    <defs>
      <linearGradient id="sp-g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#03c75a" stopOpacity=".25"/>
        <stop offset="1" stopColor="#03c75a" stopOpacity="0"/>
      </linearGradient>
    </defs>
    <path d="M 0 30 L 15 26 L 30 22 L 45 23 L 60 16 L 75 10 L 100 4 L 100 36 L 0 36 Z" fill="url(#sp-g)"/>
    <path d="M 0 30 L 15 26 L 30 22 L 45 23 L 60 16 L 75 10 L 100 4" fill="none" stroke="#03c75a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    {[0,15,30,45,60,75,100].map((x,i) => {
      const y = [30,26,22,23,16,10,4][i];
      return <circle key={i} cx={x} cy={y} r="2" fill="#03c75a"/>;
    })}
  </svg>
);

// Row 3: Donut chart
const Donut = ({ size = 96 }) => {
  const r = size / 2 - 10;
  const c = 2 * Math.PI * r;
  const segs = [
    { pct: 0.45, color: '#03c75a' },   // 단골
    { pct: 0.30, color: '#17e06d' },   // 신규
    { pct: 0.15, color: '#ffc107' },   // 휴면
    { pct: 0.10, color: '#e5e5e5' },   // 기타
  ];
  let off = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f3f4f5" strokeWidth="14"/>
      {segs.map((s, i) => {
        const len = c * s.pct;
        const dash = `${len} ${c - len}`;
        const dashoffset = -off * c;
        off += s.pct;
        return (
          <circle key={i} cx={size/2} cy={size/2} r={r} fill="none"
            stroke={s.color} strokeWidth="14"
            strokeDasharray={dash} strokeDashoffset={dashoffset}
            strokeLinecap="butt"/>
        );
      })}
    </svg>
  );
};

const Features = () => (
  <section className="features" id="features">
    <div className="container">
      <div className="s-head">
        <span className="eyebrow"><span className="dot"/>결제만 하던 단말기 시대는 끝났습니다</span>
        <h2 className="t-h1">한 대로 <mark className="hl">결제·리뷰·마케팅·홍보</mark><br/>전부 해결합니다.</h2>
        <p className="t-lead">
          따로 쓰던 걸 더하지 않았습니다.<br/>손님의 결제 한 번으로, 뒤의 모든 일이 자동으로 이어집니다.
        </p>
      </div>

      {/* Row 1 — Payment: receipt + pay methods */}
      <div className="feat-row">
        <div className="feat-copy">
          <span className="eyebrow"><span className="dot"/>01 결제</span>
          <h2 className="t-h1">손님이 꺼내는<br/><mark className="hl">모든 결제수단</mark>을 받습니다.</h2>
          <p className="t-lead">카드·QR·페이사인·삼성페이·네이버페이까지. 결제 방식을 두고 실랑이할 일이 사라집니다.</p>
          <ul className="feat-bullets">
            <li>IC카드 · MSR · NFC 동시 지원</li>
            <li>네이버페이 · 카카오페이 · 삼성페이 · 제로페이</li>
            <li>QR · 페이스사인 · 지류상품권 처리</li>
          </ul>
        </div>
        <div className="feat-visual light">
          <div className="inner">
            <div className="vis-receipt">
              <div className="r-head">
                <span>파스타 공방 · 2026-04-23</span>
                <span>#00827</span>
              </div>
              <div className="r-row"><span>트러플 크림 파스타</span><span>18,000</span></div>
              <div className="r-row"><span>바질 페스토 파스타</span><span>16,000</span></div>
              <div className="r-row"><span>하우스 와인 2잔</span><span>16,000</span></div>
              <div className="r-total"><span>합계</span><span className="amt">₩ 50,000</span></div>
              <div className="r-done">✓ 네이버페이 결제 완료</div>
            </div>
            <div className="vis-paygrid tl">
              <PayIcon label="카드 결제" bg="#1a1a1a" code="IC"/>
              <PayIcon label="네이버페이" bg="#03c75a" code="N"/>
            </div>
            <div className="vis-paygrid br">
              <div className="vis-pay d2">
                <span className="ic" style={{ background: '#ffc107', color: '#000' }}>K</span>
                카카오페이
              </div>
              <div className="vis-pay d3">
                <span className="ic" style={{ background: '#0064ff' }}>QR</span>
                QR 결제
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2 — Review: phone notifications + star growth chart */}
      <div className="feat-row reverse">
        <div className="feat-copy">
          <span className="eyebrow"><span className="dot"/>02 리뷰</span>
          <h2 className="t-h1">영수증 리뷰,<br/><mark className="hl">네이버가 알아서</mark> 받아옵니다.</h2>
          <p className="t-lead">
            "리뷰 좀 달아주세요" 더는 안 해도 됩니다.
            결제 직후 네이버가 손님에게 자동으로 리뷰 요청을 보냅니다.
          </p>
          <ul className="feat-bullets">
            <li>결제 완료 → 손님 알림 자동 발송</li>
            <li>네이버 영수증 리뷰에 바로 적립</li>
            <li>가게 대신 부탁할 필요 없이 꾸준히 쌓임</li>
          </ul>
        </div>
        <div className="feat-visual dark">
          <div className="inner">
            <div className="vis-phone">
              <div className="notch"/>
              <div className="status"><span>9:41</span><span>●●●●</span></div>
              <div className="screen">
                <div className="vis-notif d1">
                  <div className="nh">
                    <span className="logo">N</span>
                    <span className="app">네이버</span>
                    <span className="time">방금</span>
                  </div>
                  <div className="nt">파스타 공방 영수증 리뷰 요청</div>
                  <div className="nd">오늘 방문해주셔서 감사합니다. 리뷰 남기고 포인트 받으세요.</div>
                </div>
                <div className="vis-notif d2">
                  <div className="nh">
                    <span className="logo">N</span>
                    <span className="app">네이버페이</span>
                    <span className="time">1분 전</span>
                  </div>
                  <div className="nt">50,000원 결제 완료</div>
                  <div className="nd">네이버페이 · 파스타 공방</div>
                </div>
                <div className="vis-notif d3">
                  <div className="nh">
                    <span className="logo" style={{ background: '#f5a623' }}>★</span>
                    <span className="app">네이버 리뷰</span>
                    <span className="time">3분 전</span>
                  </div>
                  <div className="nt">리뷰 적립 완료 +50P</div>
                  <div className="nd">소중한 리뷰 남겨주셔서 감사합니다.</div>
                </div>
              </div>
            </div>
            <div className="vis-graph tr">
              <div className="ghead">이번 달 신규 리뷰</div>
              <div className="gnum">128<span className="up">↑ 3.2×</span></div>
              <Spark/>
            </div>
            <div className="vis-graph bl">
              <div className="ghead">자동 리뷰 요청 발송</div>
              <div className="gnum">1,042건<span className="up">↑ 이번 달</span></div>
              <Spark/>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3 — Marketing: dashboard analytics */}
      <div className="feat-row">
        <div className="feat-copy">
          <span className="eyebrow"><span className="dot"/>03 마케팅</span>
          <h2 className="t-h1">한 번 온 손님을<br/><mark className="hl">자주 오는 단골</mark>로.</h2>
          <p className="t-lead">
            결제 데이터로 손님 취향을 파악하고,<br/>
            쿠폰·적립·맞춤 혜택을 자동으로 제공합니다.
          </p>
          <ul className="feat-bullets">
            <li>재방문 시점에 자동 쿠폰 발송</li>
            <li>메뉴별 결제 패턴 분석 리포트</li>
            <li>고객 세분화 마케팅 (신규 · 단골 · 휴면)</li>
          </ul>
        </div>
        <div className="feat-visual softgray">
          <div className="inner">
            <div className="vis-dash">
              <div className="dh">
                <h5>고객 구성 분석</h5>
                <span className="tag">4월 리포트</span>
              </div>
              <div className="donut">
                <Donut size={110}/>
                <div className="leg">
                  <div className="leg-row"><span className="sw" style={{ background: '#03c75a' }}/><span className="lbl">단골 고객</span><span className="v">45%</span></div>
                  <div className="leg-row"><span className="sw" style={{ background: '#17e06d' }}/><span className="lbl">신규 고객</span><span className="v">30%</span></div>
                  <div className="leg-row"><span className="sw" style={{ background: '#ffc107' }}/><span className="lbl">휴면 고객</span><span className="v">15%</span></div>
                  <div className="leg-row"><span className="sw" style={{ background: '#e5e5e5' }}/><span className="lbl">기타</span><span className="v">10%</span></div>
                </div>
              </div>
              <div className="bars">
                <div className="bar-row">
                  <span className="lbl">트러플 파스타</span>
                  <div className="bar"><div className="fill" style={{ width: '88%' }}/></div>
                  <span className="v">142</span>
                </div>
                <div className="bar-row">
                  <span className="lbl">바질 페스토</span>
                  <div className="bar"><div className="fill" style={{ width: '68%' }}/></div>
                  <span className="v">96</span>
                </div>
                <div className="bar-row">
                  <span className="lbl">하우스 와인</span>
                  <div className="bar"><div className="fill" style={{ width: '52%' }}/></div>
                  <span className="v">74</span>
                </div>
                <div className="bar-row">
                  <span className="lbl">티라미수</span>
                  <div className="bar"><div className="fill" style={{ width: '38%' }}/></div>
                  <span className="v">58</span>
                </div>
              </div>
            </div>

            <div className="vis-coupon tl">
              <div className="cbd">%20</div>
              <div>
                <div className="clbl">재방문 쿠폰 발송됨</div>
                <div className="ctxt">단골 손님 20% 할인</div>
              </div>
            </div>
            <div className="vis-coupon br">
              <div className="cbd">＋P</div>
              <div>
                <div className="clbl">적립 알림</div>
                <div className="ctxt">1,000P 자동 적립</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4 — Promotion: store event banner */}
      <div className="feat-row reverse">
        <div className="feat-copy">
          <span className="eyebrow"><span className="dot"/>04 홍보</span>
          <h2 className="t-h1">손님이 매장에 있는 동안,<br/>단말기가 <mark className="hl">가게를 알립니다.</mark></h2>
          <p className="t-lead">
            대기화면은 광고판입니다.<br/>
            신메뉴·이벤트·계절 한정 소식을 실시간으로 노출하세요.
          </p>
          <ul className="feat-bullets">
            <li>대기화면 매장 배너 자유 편집</li>
            <li>이벤트 포스터 · 영상 노출</li>
            <li>포인트 적립 안내로 재방문 유도</li>
          </ul>
        </div>
        <div className="feat-visual green">
          <div className="inner">
            <div className="vis-store">
              <div className="banner">
                <span className="tag">OPEN EVENT</span>
                <h3>봄맞이 신메뉴<br/>오픈 기념 할인</h3>
                <div className="sub">4월 한정 · 전 메뉴 대상</div>
                <div className="pct">20<small>%</small></div>
              </div>
            </div>
            <div className="vis-alt-banner tl">
              <span className="dot"/>신메뉴 포스터 노출 중
            </div>
            <div className="vis-alt-banner br">
              <span className="dot" style={{ background: '#f5a623' }}/>포인트 2배 적립 이벤트
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);
window.Features = Features;
