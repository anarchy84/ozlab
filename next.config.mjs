/** @type {import('next').NextConfig} */
const nextConfig = {
  // 이미지 최적화 설정
  // Supabase Storage public-content 버킷에서 이미지를 가져오니까 remotePatterns 허용
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    // WebP/AVIF 자동 변환
    formats: ['image/webp'],
  },

  // 프로덕션에서 `X-Powered-By` 헤더 제거 (보안)
  poweredByHeader: false,

  // 컴파일러 최적화
  compiler: {
    // 프로덕션 빌드에서 console.* 제거 (error는 유지)
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },

  // 디자인 레퍼런스 폴더는 빌드에서 완전히 제외
  // (Next.js 는 기본적으로 _ prefix 를 제외하지만 명시적으로 처리)
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
}

export default nextConfig
