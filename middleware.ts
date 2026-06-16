import { NextRequest, NextResponse } from 'next/server'

/**
 * URL 슬러그 공백 정규화 미들웨어
 *
 * 목적: 슬러그 앞뒤(또는 중간)에 공백이 낀 깨진 URL을 깨끗한 URL로 301 영구 이동.
 *   예) /blog/%20toss-vs-naver-connect-terminal  (앞에 공백 = %20)
 *     → /blog/toss-vs-naver-connect-terminal
 *
 * 이유:
 *   - 과거 데이터 오염으로 공백 낀 슬러그가 구글/네이버에 색인된 경우,
 *     그 색인 URL의 잔여 SEO 자산을 정상 URL로 이전(301)하기 위함.
 *   - 데이터(DB slug)는 이미 trim 처리했고, DB CHECK 제약으로 재발도 차단됨.
 *     이 미들웨어는 "이미 밖에 퍼진 깨진 링크"를 회수하는 안전망 역할.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // 1) %20 등 인코딩을 실제 문자로 풀어서 공백 여부를 검사
  let decoded: string
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    // 잘못된 인코딩이면 그대로 통과 (괜히 손대지 않음)
    return NextResponse.next()
  }

  // 2) 경로에 공백 문자(스페이스/탭 등)가 하나도 없으면 정상 → 통과
  if (!/\s/.test(decoded)) {
    return NextResponse.next()
  }

  // 3) 각 경로 조각의 앞뒤 공백을 제거해서 깨끗한 경로 재조립
  const clean = decoded
    .split('/')
    .map((seg) => seg.trim()) // " toss-vs..." → "toss-vs..."
    .join('/')

  // 4) 실제로 바뀐 게 있을 때만 301 (무한 리다이렉트 방지)
  if (clean !== decoded && clean.length > 0) {
    const url = req.nextUrl.clone()
    url.pathname = clean
    return NextResponse.redirect(url, 301) // 301 = 영구 이동, SEO 자산 이전
  }

  return NextResponse.next()
}

/**
 * 블로그 경로에만 적용.
 * 다른 경로에서도 같은 보호가 필요하면 matcher를 넓히면 됨.
 */
export const config = {
  matcher: ['/blog/:path*'],
}
