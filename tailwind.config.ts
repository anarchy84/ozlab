import type { Config } from 'tailwindcss'

// ─────────────────────────────────────────────
// 오즈랩페이 Tailwind 설정 (P4 디자인 토큰 번역판)
//
// 원본 : _design_reference/design_handoff_ozlabpay_landing/styles.css 의 :root CSS 변수
// 번역 원칙 :
//   - 컬러·쉐도우·라운드·컨테이너·섹션패딩·타이포 를 Tailwind 네임스페이스로 매핑
//   - 컴포넌트 클래스(.btn-primary 등)는 번역 안 함 — P5 섹션 포팅 때 유틸로 직접 기술
//   - extend 로만 구성 (Tailwind 기본 유틸 유지)
// ─────────────────────────────────────────────
const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      // ── 컬러 ─────────────────────────────────────
      colors: {
        // ⭐ 오즈랩페이 신규 브랜드 (2026-05-26 로고 리브랜드)
        //    OZ 심볼: 인디고→퍼플 그라데이션, labPay: 미드나잇 네이비
        brand: {
          blue:    '#3A7BFF', // OZ 시작 — 인디고 블루 (CTA·링크·프라이머리)
          mid:     '#5670FF', // 그라데이션 중간
          violet:  '#7861FF', // OZ 끝 — 보라 (액센트·하이라이트)
          dark:    '#2E63E0', // hover (blue 의 deep)
          deep:    '#1F4DBD', // 강조 텍스트
          soft:    '#EDF1FF', // soft 배경 (eyebrow 칩)
          tint:    '#F6F8FF', // 섹션 그라데이션 끝
          neon:    '#7C8CFF', // 다크 배경 액센트 (밝은 인디고)
          ink:     '#1A2A3A', // 워드마크 차콜 네이비
        },
        // 하위호환 alias — 묶음 2 에서 grep 치환 후 제거 예정
        // 현재는 brand 와 동일 값으로 매핑 (즉시 톤 변경 효과)
        naver: {
          green:   '#3A7BFF', // → brand.blue
          dark:    '#2E63E0', // → brand.dark
          deep:    '#1F4DBD', // → brand.deep
          soft:    '#EDF1FF', // → brand.soft
          tint:    '#F6F8FF', // → brand.tint
          neon:    '#7C8CFF', // → brand.neon
        },
        // 잉크 그레이스케일 — 11단
        ink: {
          50:  '#fafafa',
          100: '#f5f5f5',
          150: '#efefef',
          200: '#e5e5e5',
          300: '#c9c9c9',
          400: '#9a9a9a',
          500: '#6b6b6b',
          600: '#404040',
          700: '#2a2a2a',
          800: '#1a1a1a',
          900: '#0a0a0a',
        },
        // 보조 색상
        accent: {
          blue: '#3b7eef', // --place-blue (플레이스+ 뱃지)
          red:  '#ff3b30', // --warn-red
        },
        // 서피스 — 배경 톤
        surface: {
          DEFAULT:  '#ffffff', // --bg
          soft:     '#fafafa', // --bg-soft
          dark:     '#0f1211', // --bg-dark
          darkSoft: '#17191a', // --bg-dark-soft
        },
      },

      // ── 폰트 패밀리 ──────────────────────────────
      fontFamily: {
        // Pretendard Variable 를 기본 sans 로 오버라이드
        sans: [
          'Pretendard Variable',
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'Roboto',
          'Helvetica Neue',
          'sans-serif',
        ],
      },

      // ── 폰트사이즈 (반응형 clamp) ────────────────
      // 사용 예 : text-display, text-h1, text-h2, text-h3, text-lg-fluid
      fontSize: {
        'display': [
          'clamp(36px, 7vw, 72px)',
          { lineHeight: '1.08', letterSpacing: '0', fontWeight: '800' },
        ],
        'h1': [
          'clamp(28px, 5.6vw, 50px)',
          { lineHeight: '1.15', letterSpacing: '0', fontWeight: '800' },
        ],
        'h2': [
          'clamp(22px, 3.8vw, 34px)',
          { lineHeight: '1.25', letterSpacing: '0', fontWeight: '700' },
        ],
        'h3': [
          'clamp(18px, 1.6vw, 22px)',
          { lineHeight: '1.3', fontWeight: '700' },
        ],
        'lg-fluid': [
          'clamp(16px, 1.3vw, 19px)',
          { lineHeight: '1.6' },
        ],
      },

      // ── 라운드 ──────────────────────────────────
      // sm:8 md:12 lg:20 xl:28 — Tailwind 기본 스케일 확장
      borderRadius: {
        sm:   '8px',   // --r-sm (버튼 보조, 인풋)
        md:   '12px',  // --r-md (카드 내부 요소)
        lg:   '20px',  // --r-lg (카드·섹션)
        xl:   '28px',  // --r-xl (쇼케이스·폼카드)
        pill: '999px', // --r-pill (버튼·태그)
      },

      // ── 쉐도우 ──────────────────────────────────
      boxShadow: {
        sm:    '0 1px 2px rgba(0,0,0,.04), 0 1px 3px rgba(0,0,0,.06)',
        md:    '0 4px 12px rgba(0,0,0,.06), 0 2px 6px rgba(0,0,0,.04)',
        lg:    '0 20px 40px -12px rgba(0,0,0,.12), 0 8px 20px -8px rgba(0,0,0,.08)',
        green: '0 12px 30px -8px rgba(58,123,255,.35)', // 리브랜드 — 블루 글로우로 변경
        brand: '0 12px 30px -8px rgba(58,123,255,.35)',
        violet: '0 12px 30px -8px rgba(120,97,255,.35)',
      },

      // ── 브랜드 그라데이션 (배경) ────────────────
      backgroundImage: {
        'brand-gradient':      'linear-gradient(135deg, #3A7BFF 0%, #5670FF 50%, #7861FF 100%)',
        'brand-gradient-soft': 'linear-gradient(135deg, #EDF1FF 0%, #F4F0FF 100%)',
        'brand-radial':        'radial-gradient(ellipse at top left, rgba(58,123,255,.15) 0%, transparent 60%)',
      },

      // ── 레이아웃 ────────────────────────────────
      maxWidth: {
        // 중앙 컨테이너 — 패딩은 섹션별로 px-6 추가
        container: '1160px',
      },
      spacing: {
        // py-section : 랜딩 섹션 공통 수직 패딩 (clamp 반응형)
        'section':       'clamp(64px, 8vw, 120px)',
        'section-tight': 'clamp(48px, 6vw, 80px)',
      },

      // ── 애니메이션 (히어로 떠다니는 태그) ─────────
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
      },
      animation: {
        float: 'float 5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
