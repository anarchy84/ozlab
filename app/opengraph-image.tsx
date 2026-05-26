import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = '오즈랩페이 - 네이버페이 연동 POS · 카드 단말기'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// 리브랜드 — 인디고-퍼플 그라데이션 배경 + 브랜드 컬러 적용
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: 'linear-gradient(135deg, #1A2A3A 0%, #2A3A5A 60%, #3A2A6A 100%)',
          color: '#fff',
          fontFamily: 'sans-serif',
        }}
      >
        {/* 좌상단 로고 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 36, fontWeight: 900 }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #3A7BFF 0%, #7861FF 100%)',
              color: '#fff',
              letterSpacing: -2,
            }}
          >
            OZ
          </div>
          <span>labPay</span>
        </div>

        {/* 메인 카피 */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontSize: 82,
              lineHeight: 1.06,
              fontWeight: 900,
              letterSpacing: -1,
            }}
          >
            <span>네이버페이 연동 POS</span>
            <span style={{ background: 'linear-gradient(90deg, #7C8CFF 0%, #B58CFF 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
              카드 단말기 0원
            </span>
          </div>
          <div style={{ marginTop: 28, fontSize: 30, color: 'rgba(255,255,255,0.78)' }}>
            결제부터 리뷰 자동화 · 플레이스 마케팅까지 한 번에
          </div>
        </div>

        {/* 하단 키워드 */}
        <div style={{ display: 'flex', gap: 14, fontSize: 24, fontWeight: 800, color: '#7C8CFF' }}>
          <span>POS</span>
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
          <span>리뷰 자동화</span>
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
          <span>플레이스 최적화</span>
        </div>
      </div>
    ),
    size
  )
}
