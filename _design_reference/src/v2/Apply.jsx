/* global React, Icon */
const { useState: useStateApply } = React;

const Apply = () => {
  const [sent, setSent] = useStateApply(false);
  const submit = (e) => { e.preventDefault(); setSent(true); };
  return (
    <section className="apply" id="apply">
      <div className="container apply-grid">
        <div>
          <span className="eyebrow dark" style={{ marginBottom: 20 }}><span className="dot"/>무료 상담 신청</span>
          <h2 className="t-h1">지금 신청하면,<br/><span className="text-neon">3가지 혜택</span> 모두 받습니다.</h2>
          <p className="t-lead">입력하신 연락처로 담당 매니저가 1영업일 내 연락드립니다. 계약 의무는 없습니다.</p>
          <ul className="apply-benefits">
            <li>오즈랩페이 단말기 무상 지원 (계약 조건 해당 시)</li>
            <li>플레이스 리워드 광고 3개월 무료 제공</li>
            <li>전국 방문 설치 · 기존 POS 연동 · 리뷰 자동화 세팅 포함</li>
            <li>네이버 place+ 마크 등록까지 전 과정 지원</li>
          </ul>
        </div>

        <div className="form-card">
          {sent ? (
            <div className="form-done">
              <div className="icn"><Icon.Check s={32}/></div>
              <h3>신청이 접수됐습니다.</h3>
              <p className="t-sm">담당 매니저가 1영업일 내 연락드립니다. 감사합니다.</p>
            </div>
          ) : (
            <>
              <h3>빠른 상담 신청</h3>
              <p className="t-sm">1~2분이면 끝납니다.</p>
              <form onSubmit={submit}>
                <div className="form-row">
                  <div className="form-field">
                    <label>성함<span className="req">*</span></label>
                    <input required placeholder="홍길동"/>
                  </div>
                  <div className="form-field">
                    <label>연락처<span className="req">*</span></label>
                    <input required type="tel" placeholder="010-0000-0000"/>
                  </div>
                </div>
                <div className="form-field">
                  <label>매장 이름</label>
                  <input placeholder="예: 망원동 파스타공방"/>
                </div>
                <div className="form-row">
                  <div className="form-field">
                    <label>업종</label>
                    <select defaultValue="">
                      <option value="" disabled>선택해주세요</option>
                      <option>카페 · 베이커리</option>
                      <option>음식점 · 주점</option>
                      <option>미용 · 뷰티</option>
                      <option>피트니스 · 필라테스</option>
                      <option>편의점 · 소매</option>
                      <option>병·의원</option>
                      <option>기타</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label>관심 상품</label>
                    <select defaultValue="">
                      <option value="" disabled>선택해주세요</option>
                      <option>단말기 단독</option>
                      <option>3인치 단말기 세트</option>
                      <option>10.1인치 POS 세트</option>
                      <option>15인치 POS 세트</option>
                      <option>상담 후 결정</option>
                    </select>
                  </div>
                </div>
                <div className="form-field">
                  <label>문의 내용</label>
                  <textarea rows={3} placeholder="궁금한 점을 남겨주세요 (선택)"/>
                </div>
                <label className="form-check">
                  <input type="checkbox" required/>
                  <span>개인정보 수집·이용에 동의합니다. 상담 목적으로만 사용되며 1년 후 파기됩니다. <a href="#">자세히</a></span>
                </label>
                <button type="submit" className="btn btn-primary form-submit">무료 상담 신청하기</button>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
};
window.Apply = Apply;
