// ─────────────────────────────────────────────
// ApplyForm — 상담 신청 폼 (다크 배경 2컬럼)
// 원본: _design_reference/src/sections/ApplyForm.jsx
//
// 주의 : 제출 로직은 P6 에서 Supabase consultations 테이블 연결 예정.
// 지금은 UI + 로컬 상태 "접수 완료" 토글만 구현.
// ─────────────────────────────────────────────
'use client'

import { useState, FormEvent } from 'react'
import { EditableText } from '@/components/editable/EditableText'
import { pickTextOrUndef, type ContentBlock } from '@/lib/content-blocks'

interface Props {
  blocks: Record<string, ContentBlock>
}

export function ApplyForm({ blocks }: Props) {
  const [sent, setSent] = useState(false)

  // P6 에서 이 submit 핸들러가 Supabase insert + Slack 알림으로 교체됨
  const submit = (e: FormEvent) => {
    e.preventDefault()
    setSent(true)
  }

  return (
    <section id="apply" className="showcase-dark py-section">
      <div className="container-oz grid lg:grid-cols-[1fr_1.1fr] gap-10 lg:gap-16 items-start">
        {/* 좌측 카피 */}
        <div>
          <span className="eyebrow dark">
            <EditableText
              as="span"
              blockKey="home.apply.eyebrow"
              fallback="무료 상담 신청"
              value={pickTextOrUndef(blocks, 'home.apply.eyebrow')}
              pagePath="/"
            />
          </span>
          <h2 className="text-h1 text-white break-keep mt-4 mb-4">
            <EditableText
              as="span"
              blockKey="home.apply.headline.line1"
              fallback="3분만 투자하세요."
              value={pickTextOrUndef(blocks, 'home.apply.headline.line1')}
              pagePath="/"
            />
            <br />
            <mark className="hl-solid">
              <EditableText
                as="span"
                blockKey="home.apply.headline.mark"
                fallback="0원"
                value={pickTextOrUndef(blocks, 'home.apply.headline.mark')}
                pagePath="/"
              />
            </mark>
            <EditableText
              as="span"
              blockKey="home.apply.headline.post"
              fallback="부터 시작할 수 있어요."
              value={pickTextOrUndef(blocks, 'home.apply.headline.post')}
              pagePath="/"
            />
          </h2>
          <p className="text-ink-300 text-lg-fluid break-keep mb-6">
            <EditableText
              as="span"
              blockKey="home.apply.sub"
              fallback="상담 신청을 남겨주시면 영업일 기준 24시간 내에 담당자가 연락드립니다."
              value={pickTextOrUndef(blocks, 'home.apply.sub')}
              pagePath="/"
            />
          </p>
          <ul className="apply-benefits">
            <li>
              <EditableText
                as="span"
                blockKey="home.apply.benefit1"
                fallback="POS + 오즈랩페이 단말기 무상지원"
                value={pickTextOrUndef(blocks, 'home.apply.benefit1')}
                pagePath="/"
              />
            </li>
            <li>
              <EditableText
                as="span"
                blockKey="home.apply.benefit2"
                fallback="플레이스 리워드 광고 크레딧 무료 제공"
                value={pickTextOrUndef(blocks, 'home.apply.benefit2')}
                pagePath="/"
              />
            </li>
            <li>
              <EditableText
                as="span"
                blockKey="home.apply.benefit3"
                fallback="설치·교육·A/S 전담 매니저 배정"
                value={pickTextOrUndef(blocks, 'home.apply.benefit3')}
                pagePath="/"
              />
            </li>
            <li>
              <EditableText
                as="span"
                blockKey="home.apply.benefit4"
                fallback="기존 장비 반납·이관 지원"
                value={pickTextOrUndef(blocks, 'home.apply.benefit4')}
                pagePath="/"
              />
            </li>
          </ul>
        </div>

        {/* 우측 폼 카드 */}
        <div className="form-card">
          {sent ? (
            <div className="text-center py-10 px-5">
              <div className="text-5xl mb-3">✅</div>
              <h3 className="text-h2">신청이 접수되었습니다</h3>
              <p className="text-ink-500 mt-3 break-keep">
                담당자가 영업일 24시간 내에 연락드릴게요.
                <br />
                감사합니다.
              </p>
              <button
                type="button"
                className="btn btn-ghost mt-5"
                onClick={() => setSent(false)}
              >
                다시 신청하기
              </button>
            </div>
          ) : (
            <form onSubmit={submit}>
              <h3 className="text-h2 text-ink-900">상담 신청하기</h3>
              <p className="text-sm text-ink-500 mt-1 mb-6">
                * 표시는 필수 입력입니다.
              </p>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="form-field">
                  <label>사장님 성함 *</label>
                  <input required placeholder="홍길동" />
                </div>
                <div className="form-field">
                  <label>연락처 *</label>
                  <input required placeholder="010-0000-0000" />
                </div>
              </div>

              <div className="form-field">
                <label>매장명 *</label>
                <input required placeholder="매장 상호명" />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="form-field">
                  <label>업종</label>
                  <select defaultValue="">
                    <option value="" disabled>
                      선택해주세요
                    </option>
                    <option>음식점 · 카페</option>
                    <option>소매 · 판매</option>
                    <option>서비스 · 뷰티</option>
                    <option>기타</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>지역</label>
                  <select defaultValue="">
                    <option value="" disabled>
                      선택해주세요
                    </option>
                    <option>서울</option>
                    <option>경기·인천</option>
                    <option>부산·경남</option>
                    <option>대구·경북</option>
                    <option>광주·전라</option>
                    <option>대전·충청</option>
                    <option>강원</option>
                    <option>제주</option>
                  </select>
                </div>
              </div>

              <div className="form-field">
                <label>원하시는 구성 / 남기실 말씀</label>
                <textarea rows={3} placeholder="예) 10.1인치 POS 세트 견적 궁금합니다" />
              </div>

              <label className="form-check">
                <input type="checkbox" required />
                <span>
                  (필수) 개인정보 수집·이용에 동의합니다. 수집된 정보는 상담 목적으로만
                  활용됩니다.
                </span>
              </label>

              <button type="submit" className="btn btn-primary form-submit">
                무료 상담 신청하기
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
