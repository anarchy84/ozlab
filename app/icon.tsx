import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

// 리브랜드 — 신규 로고 컬러 (인디고 → 퍼플 그라데이션)
//   "Oz" 워드마크는 흰색. 라운드 코너 (iOS/Android 홈 아이콘 친화)
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 112,
          background: 'linear-gradient(135deg, #3A7BFF 0%, #5670FF 50%, #7861FF 100%)',
          color: '#fff',
          fontSize: 192,
          fontWeight: 900,
          fontFamily: 'sans-serif',
          letterSpacing: -8,
        }}
      >
        OZ
      </div>
    ),
    size
  )
}
