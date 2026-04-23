/* global React */
const { useState: useStateForm } = React;
const ApplyForm = () => {
  const [sent, setSent] = useStateForm(false);
  const submit = (e) => { e.preventDefault(); setSent(true); };
  return (
    <section id="apply" className="apply">
      <div className="container apply-grid">
        <div>
          <span className="eyebrow dark">무료 상담 신청</span>
          <h2 className="h-1" style={{ marginTop: 16 }}>
            3분만 투자하세요.<br/>
            <mark className="hl-solid">0원</mark>부터 시작할 수 있어요.
          </h2>
          <p className="subtitle">상담 신청을 남겨주시면 영업일 기준 24시간 내에 담당자가 연락드립니다.</p>
          <ul className="apply-benefits">
            <li>POS + 오즈랩페이 단말기 무상지원</li>
            <li>플레이스 리워드 광고 크레딧 무료 제공</li>
            <li>설치·교육·A/S 전담 매니저 배정</li>
            <li>기존 장비 반납·이관 지원</li>
          </ul>
        </div>

        <div className="form-card">
          {sent ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <h3 className="h-2">신청이 접수되었습니다</h3>
              <p style={{ color: '#6b6b6b', marginTop: 12 }}>담당자가 영업일 24시간 내에 연락드릴게요.<br/>감사합니다.</p>
              <button className="btn btn-ghost" style={{ marginTop: 20 }} onClick={() => setSent(false)}>다시 신청하기</button>
            </div>
          ) : (
            <form onSubmit={submit}>
              <h3 className="h-2">상담 신청하기</h3>
              <p className="h3-sub">* 표시는 필수 입력입니다.</p>

              <div className="form-row">
                <div className="form-field">
                  <label>사장님 성함 *</label>
                  <input required placeholder="홍길동"/>
                </div>
                <div className="form-field">
                  <label>연락처 *</label>
                  <input required placeholder="010-0000-0000"/>
                </div>
              </div>

              <div className="form-field">
                <label>매장명 *</label>
                <input required placeholder="매장 상호명"/>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label>업종</label>
                  <select defaultValue="">
                    <option value="" disabled>선택해주세요</option>
                    <option>음식점 · 카페</option>
                    <option>소매 · 판매</option>
                    <option>서비스 · 뷰티</option>
                    <option>기타</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>지역</label>
                  <select defaultValue="">
                    <option value="" disabled>선택해주세요</option>
                    <option>서울</option><option>경기·인천</option><option>부산·경남</option>
                    <option>대구·경북</option><option>광주·전라</option><option>대전·충청</option>
                    <option>강원</option><option>제주</option>
                  </select>
                </div>
              </div>

              <div className="form-field">
                <label>원하시는 구성 / 남기실 말씀</label>
                <textarea rows="3" placeholder="예) 10.1인치 POS 세트 견적 궁금합니다"/>
              </div>

              <label className="form-check">
                <input type="checkbox" required/>
                <span>(필수) 개인정보 수집·이용에 동의합니다. 수집된 정보는 상담 목적으로만 활용됩니다.</span>
              </label>

              <button type="submit" className="btn btn-primary form-submit">무료 상담 신청하기</button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};
window.ApplyForm = ApplyForm;
