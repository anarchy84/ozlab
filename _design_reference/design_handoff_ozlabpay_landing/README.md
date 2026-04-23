# Handoff: 오즈랩페이(Ozlabpay) 랜딩페이지

## Overview
네이버페이 연동 POS/카드 단말기 서비스 "오즈랩페이(Ozlabpay)"의 원페이지 롱폼 랜딩페이지입니다.

**핵심 메시지**
- 손님이 바글바글한 가게는 모두 오즈랩페이를 씁니다
- 결제 + 네이버 리뷰 자동화 + 마케팅 + 홍보를 한 대로
- place+ 마크 = 오즈랩페이 단말기만 받을 수 있는 검색 신뢰도 지표
- 지금 신청 시 POS + 단말기 0원, 플레이스 리워드 광고 무료

**목적**: 방문자를 **상담 신청 폼**(or 전화/카톡)으로 전환.

---

## About the Design Files
이 번들에 포함된 `index.html`, `styles.css`, `src/**` 파일들은 **디자인 레퍼런스**입니다 — React + Babel(in-browser) + Vanilla CSS로 만든 프로토타입으로, "최종적으로 이렇게 보이고 동작했으면 한다"를 전달하기 위한 목업이에요.

**실제 프로덕션 구현 시**에는 이 HTML을 그대로 배포하지 말고, 타겟 코드베이스(Next.js / Nuxt / Astro / Remix 등)의 기존 패턴 · 컴포넌트 라이브러리 · SEO · 폼 처리 · 분석 추적에 맞춰 **다시 조립**해주세요. 없다면 Next.js(App Router) + Tailwind 추천.

---

## Fidelity
**High-fidelity (hifi)** — 컬러·타이포·간격·섹션 리듬·인터랙션까지 픽셀 가깝게 잡았습니다.
- 기준 뷰포트: 1280–1440px (데스크탑), 375–480px (모바일). 둘 다 반응형 동작.
- 단, **카피는 임시**입니다. 마케팅팀/Claude Code에서 재정돈 예정.

---

## 페이지 구조 (섹션 순서 = 스크롤 순서)

| # | 섹션 | 파일 | 목적 |
|---|---|---|---|
| 1 | Promo Strip | `src/sections/Hero.jsx` | 상단 검정 바. 무상지원 프로모션 |
| 2 | Nav (sticky) | `src/sections/Nav.jsx` | 로고/앵커링크/전화/CTA |
| 3 | Hero | `src/sections/Hero.jsx` | 메인 카피 + 단말기 이미지 + 플로팅 태그 |
| 4 | Visual Band | `src/sections/Hero.jsx` (하단) | 3컷 이미지 쇼케이스 |
| 5 | Showcase | `src/sections/Showcase.jsx` | 다크 배경 + 큰 단말기 1컷 |
| 6 | Painpoints | `src/sections/Painpoints.jsx` | "사장님 이런 고민 있으시죠?" 3카드 |
| 7 | Features | `src/sections/Features.jsx` | 결제·리뷰·마케팅·홍보 4행 교차 |
| 8 | Review Automation | `src/sections/ReviewAutomation.jsx` | 다크. 4단계 플로우 + 리뷰 목업 |
| 9 | place+ | `src/sections/PlacePlus.jsx` | 플레이스 검색결과 목업으로 차별점 |
| 10 | Mechanism | `src/sections/Mechanism.jsx` | 상위노출 원리 3개 아이콘 |
| 11 | Pricing | `src/sections/Pricing.jsx` | 상품 7구성 카드 그리드 |
| 12 | Promotion | `src/sections/Promotion.jsx` | 0원 시작 배너 |
| 13 | Testimonials | `src/sections/Testimonials.jsx` | 3개 고객 후기 카드 |
| 14 | FAQ | `src/sections/FAQ.jsx` | 6개 아코디언 |
| 15 | Apply Form | `src/sections/ApplyForm.jsx` | 상담신청 폼 (다크) |
| 16 | Footer | `src/sections/Footer.jsx` | 로고/링크/연락처 |
| 17 | Floating CTA | `src/sections/FloatingCTA.jsx` | 스크롤 600px 이후 하단 고정 |

---

## Design Tokens

### Colors
```css
/* Brand */
--naver-green:      #03c75a;   /* primary */
--naver-green-dark: #02b350;   /* hover */
--naver-green-deep: #019544;   /* eyebrow text */
--naver-green-soft: #e6faed;   /* eyebrow bg */
--naver-green-tint: #f1fbf4;   /* section wash */
--neon-green:       #17e06d;   /* dark-bg accent */

/* Ink (neutrals) */
--ink-900: #0a0a0a;  /* primary text, dark bg */
--ink-800: #1a1a1a;
--ink-700: #2a2a2a;
--ink-600: #404040;  /* body text */
--ink-500: #6b6b6b;  /* muted */
--ink-400: #9a9a9a;
--ink-300: #c9c9c9;
--ink-200: #e5e5e5;  /* borders */
--ink-150: #efefef;
--ink-100: #f5f5f5;
--ink-50:  #fafafa;  /* soft bg */

/* Accent */
--place-blue: #3b7eef;  /* place+ mark */

/* Surfaces */
--bg:        #ffffff;
--bg-soft:   #fafafa;
--bg-dark:   #0f1211;
```

### Typography
- **Font**: Pretendard Variable (`https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css`)
- **Base size**: 16px, `line-height: 1.55`, `letter-spacing: -0.01em`
- **Scale**:
  - `.h-display` → `clamp(40px, 6.2vw, 76px)`, weight 800, line-height 1.08, tracking -0.035em
  - `.h-1` → `clamp(32px, 4.4vw, 52px)`, weight 800, line-height 1.15, tracking -0.03em
  - `.h-2` → `clamp(24px, 3vw, 36px)`, weight 700, line-height 1.25
  - `.h-3` → `clamp(18px, 1.6vw, 22px)`, weight 700
  - Body → 16px / 1.6
  - `.text-lg` → `clamp(16px, 1.3vw, 19px)` / 1.6

### Radii
`8 / 12 / 20 / 28 / 999(pill)` — CSS vars `--r-sm/md/lg/xl/pill`

### Shadows
- `--shadow-sm`: `0 1px 2px rgba(0,0,0,.04), 0 1px 3px rgba(0,0,0,.06)`
- `--shadow-md`: `0 4px 12px rgba(0,0,0,.06), 0 2px 6px rgba(0,0,0,.04)`
- `--shadow-lg`: `0 20px 40px -12px rgba(0,0,0,.12), 0 8px 20px -8px rgba(0,0,0,.08)`
- `--shadow-green`: `0 12px 30px -8px rgba(3,199,90,.35)` (primary button)

### Spacing
- Container: `max-width: 1160px`, padding 24px
- Section vertical: `--section-y: clamp(64px, 8vw, 120px)`

---

## Key Components

### `OzLogo` (icons.jsx)
동그란 녹색(#03c75a) 배경 원 안에 "Oz" + "lab**pay**" 워드마크. Size prop 지원, `dark` prop으로 다크 배경용.

### `.eyebrow`
섹션 상단 pill 라벨. `background: #e6faed; color: #019544; padding: 6px 12px; border-radius: 999px; font-size: 13px; font-weight: 600`. `.dark` variant는 다크 섹션용(`background: rgba(23,224,109,.12); color: #17e06d`).

### `mark.hl-green`
하이라이트 텍스트 — 58% 지점부터 녹색 tint 언더라인 같은 효과: `background: linear-gradient(transparent 58%, rgba(3,199,90,.25) 58%)`.

### `.btn-primary`
Pill 버튼. `background: #03c75a; color: white; padding: 14px 26px; shadow: --shadow-green`. `.lg`(18px 텍스트, 18px 34px 패딩) / `.sm` variants.

### Hero floating tags
4개의 흰 pill (+ 1개 다크 pill)이 단말기 주변을 떠다님. `@keyframes float` 5초 ease-in-out infinite, 8px 위아래.

### FAQ accordion
단일 오픈. 오픈 시 `data-open="true"` attr 기준 스타일. `+` → `×` 회전(45deg).

### Floating CTA
`position: fixed; bottom: 0`, `scrollY > 600`일 때 `translateY(0)` slide-in. 닫기 버튼으로 dismiss state 유지.

---

## Form (Apply)
필드: `이름*`, `연락처*`, `매장명*`, `업종`(select), `지역`(select), `문의내용`(textarea), `개인정보 동의*`.
- 제출 시 현재는 클라이언트 state만 토글 (`setSent(true)`) → 완료 화면 표시.
- **프로덕션 구현**: 실제 엔드포인트(e.g. `/api/lead`)로 POST, 연락처 형식 검증, UTM 파라미터 저장, GA/GTM 이벤트.

---

## Assets (단말기 이미지)
`assets/` 폴더에 다음 8개 PNG:
- `hero-vertical.png` — 히어로 메인 단말기 (세로형)
- `device-dark-standing.png` — 다크 배경 단말기 (쇼케이스용)
- `device-netpay.png` — 카페 배경 세로형
- `device-netpay-hero.png` — 밝은 배경 단말기
- `device-bodycodi.png` — 매장 설치 장면
- `device-okpos-pointing.png` — 터치 장면
- `device-with-features.png` — 기능 스크린샷 겹침
- `ok-pair.png` — 녹색 배경 POS+단말기
- `hanwool-hero.png`, `feature-stack.png`, `review-auto-img.png`, `zero-promo.png`, `product-grid.png`, `green-circle.png` — 보조 이미지

**주의**: 이미지들은 벤치마킹 사이트에서 참고용으로 캡처한 것으로, **프로덕션에는 실제 제품 사진/렌더로 교체 필요**. 누끼(배경 제거)가 되어 있지 않은 컷들이 있어 이상적으로는 투명 배경 PNG로 재작업 권장.

---

## Interactions & Behavior
- **Anchor navigation**: 네비 링크는 `#features`, `#review`, `#placeplus`, `#pricing`, `#faq` 등으로 스무스 스크롤 (`html { scroll-behavior: smooth }`).
- **FAQ 아코디언**: 첫 번째만 디폴트 오픈(`useState(0)`). 열린 걸 다시 클릭하면 닫힘.
- **Floating CTA**: scroll 600px 초과 시 show, 닫기 버튼으로 세션 내 dismiss.
- **Form submit**: `preventDefault` → `setSent(true)` → 완료 화면.
- **Hero tags**: CSS keyframe float, 각 태그 delay 다르게 (0 / 1 / 2 / 1.5s).

---

## Responsive Breakpoints
- `1000px` → Pricing 4열 → 2열
- `880px` → Features/PlacePlus/Apply 2열 → 1열, Hero 2열 → 1열
- `760px` → Nav 링크/ghost 버튼 숨김, Painpoints 3열 → 1열, Footer 3열 → 1열
- `600px` → Floating CTA 축약
- `520px` → Pricing 1열
- `480px` → Flow 4스텝 1열

---

## TODO for Production
1. **카피 재정돈** — 현재는 임시 문구. 마케팅 톤 확정 후 전면 교체.
2. **이미지 교체** — 실제 제품 컷 + 투명 배경 + 2x/3x 대응 (Next/Image 등).
3. **폼 연동** — API endpoint, validation(정규식), reCAPTCHA, 성공/실패 토스트.
4. **SEO** — `<meta>` description/og/twitter, JSON-LD LocalBusiness/Product.
5. **애널리틱스** — GA4 + GTM, 주요 CTA 클릭 이벤트 추적.
6. **A11y** — `aria-expanded` on FAQ button, form label 연결, 포커스 링 확인.
7. **법적 페이지** — 이용약관/개인정보처리방침 실제 문서 링크.
8. **전화번호/상호** — 하드코딩된 `1588-0000`, `partner@example.com`, `© 2026 오즈랩페이` 확정값으로 교체.

---

## Files in this bundle
```
index.html                              # 엔트리
styles.css                              # 전체 스타일 (design tokens + 섹션별)
src/
  App.jsx                               # 루트 composition
  icons.jsx                             # OzLogo + Icon set
  sections/
    Nav.jsx
    Hero.jsx                            # Hero + Visual Band
    Showcase.jsx
    Painpoints.jsx
    Features.jsx                        # 4행 교차 레이아웃
    ReviewAutomation.jsx
    PlacePlus.jsx
    Mechanism.jsx
    Pricing.jsx
    Promotion.jsx
    Testimonials.jsx
    FAQ.jsx
    ApplyForm.jsx
    Footer.jsx
    FloatingCTA.jsx
assets/                                 # 단말기 이미지 PNG 14개
```

로컬에서 열기: `python -m http.server 8000` 같은 정적 서버 띄우고 `index.html` 접근 (react/babel CDN 사용 중이라 `file://`로는 CORS 이슈 있을 수 있음).
