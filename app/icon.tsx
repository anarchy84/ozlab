import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

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
          background: '#03c75a',
          color: '#fff',
          fontSize: 152,
          fontWeight: 900,
          fontFamily: 'sans-serif',
        }}
      >
        Oz
      </div>
    ),
    size
  )
}
