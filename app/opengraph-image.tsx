import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = '오즈랩페이 - 네이버페이 연동 POS · 카드 단말기'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

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
          background: '#071f14',
          color: '#fff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 34, fontWeight: 900 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#03c75a',
              color: '#fff',
            }}
          >
            Oz
          </div>
          <span>labpay</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontSize: 78,
              lineHeight: 1.06,
              fontWeight: 900,
              letterSpacing: 0,
            }}
          >
            <span>네이버페이 연동 POS</span>
            <span>카드 단말기 0원</span>
          </div>
          <div style={{ marginTop: 28, fontSize: 30, color: 'rgba(255,255,255,0.72)' }}>
            결제부터 리뷰 자동화 · 플레이스 마케팅까지 한 번에
          </div>
        </div>
        <div style={{ display: 'flex', gap: 14, fontSize: 24, fontWeight: 800, color: '#03c75a' }}>
          <span>POS</span>
          <span>·</span>
          <span>리뷰 자동화</span>
          <span>·</span>
          <span>플레이스 최적화</span>
        </div>
      </div>
    ),
    size
  )
}
