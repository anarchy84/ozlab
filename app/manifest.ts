import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '오즈랩페이',
    short_name: '오즈랩페이',
    description:
      '네이버 카드 단말기, 네이버 POS, 포스단말기, 애플페이 결제 단말기와 리뷰 자동화, 플레이스 마케팅을 한 번에 연결하는 매장 운영 솔루션입니다.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#03c75a',
    lang: 'ko-KR',
    icons: [
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
