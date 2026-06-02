# 07. 디자인 시스템 + 컴포넌트 패턴

## 1. 브랜드 톤

오즈랩페이는 **인디고 블루 → 보라** 그라데이션이 시그니처. 미드나잇 네이비 차콜이 워드마크.

```
브랜드 그라데이션:
#3A7BFF (인디고 블루)  →  #5670FF (중간)  →  #7861FF (퍼플)
   브랜드 시작              그라데이션 중간       브랜드 끝

워드마크:
#1A2A3A (미드나잇 네이비 차콜)
```

## 2. Tailwind 토큰 (tailwind.config.ts)

### 2.1 색상

```ts
brand: {
  blue:    '#3A7BFF', // 메인 CTA · 링크 · 프라이머리
  mid:     '#5670FF', // 그라데이션 중간
  violet:  '#7861FF', // 액센트 · 하이라이트
  dark:    '#2E63E0', // hover (blue 의 deep)
  deep:    '#1F4DBD', // 강조 텍스트
  soft:    '#EDF1FF', // soft 배경 (eyebrow 칩)
  tint:    '#F6F8FF', // 섹션 그라데이션 끝
  neon:    '#7C8CFF', // 다크 배경 액센트
  ink:     '#1A2A3A', // 워드마크 차콜
}

// 잉크 그레이스케일 (11단)
ink: {
  50: '#fafafa', 100: '#f5f5f5', 150: '#efefef',
  200: '#e5e5e5', 300: '#c9c9c9', 400: '#9a9a9a',
  500: '#6b6b6b', 600: '#404040', 700: '#2a2a2a',
  800: '#1a1a1a', 900: '#0a0a0a',
}

// 서피스 (배경)
surface: {
  DEFAULT:  '#ffffff', soft: '#fafafa',
  dark:     '#0f1211', darkSoft: '#17191a',
}

// 보조
accent: {
  blue: '#3b7eef', // 플레이스+ 뱃지
  red:  '#ff3b30', // warn
}
```

### 2.2 하위호환 alias (제거 예정)

```ts
naver: { green: brand.blue, dark: brand.dark, ... }
```

→ 옛 네이버 톤이었던 것이 brand 로 리브랜드. grep 치환 다 됐지만 일부 남아있을 수 있음.

### 2.3 폰트

```ts
fontFamily: {
  sans: ['Pretendard Variable', 'Pretendard', '-apple-system', ...]
}
```

→ 모든 한글 / 영문 통일. 라이센스: SIL OFL (오픈).

### 2.4 그림자

```ts
shadow: {
  brand:  '0 12px 30px -8px rgba(58,123,255,.35)',   // 블루 글로우
  violet: '0 12px 30px -8px rgba(120,97,255,.35)',   // 보라 글로우
}
```

### 2.5 그라데이션 헬퍼

```ts
backgroundImage: {
  'brand-gradient':      'linear-gradient(135deg, #3A7BFF 0%, #5670FF 50%, #7861FF 100%)',
  'brand-gradient-soft': 'linear-gradient(135deg, #EDF1FF 0%, #F4F0FF 100%)',
  'brand-radial':        'radial-gradient(ellipse at top left, rgba(58,123,255,.15) 0%, transparent 60%)',
}
```

### 2.6 레이아웃

```ts
maxWidth: { container: '1160px' }   // 랜딩 중앙 컨테이너
```

## 3. 어드민 다크 테마

어드민은 **다크 테마만** 사용. 라이트 모드 없음.

### 3.1 배경 색상

```
bg-surface-dark       (#0f1211) — 페이지 배경
bg-surface-darkSoft   (#17191a) — 카드/섹션 배경
bg-ink-900            (#0a0a0a) — 헤더 / 테이블 헤더
bg-ink-800            (#1a1a1a) — hover
```

### 3.2 텍스트 색상

```
text-ink-100          (#f5f5f5) — 메인 텍스트
text-ink-200          (#e5e5e5) — 강조
text-ink-300          (#c9c9c9) — 보조
text-ink-400          (#9a9a9a) — 메타 / 라벨
text-ink-500          (#6b6b6b) — 비활성 / 힌트
```

### 3.3 경계선

```
border-ink-700        (#2a2a2a) — 카드 경계
border-ink-800        (#1a1a1a) — 표 행 분리 (divide)
```

## 4. 색상 의미 룰 (Phase E 추가)

광고 분석에서 출처를 색상으로 구분:

| 색상 | 의미 | 데이터 출처 |
|---|---|---|
| **🟣 보라 (`violet-500/10`, `violet-200`)** | 광고 플랫폼 보고 기준 | `ad_metrics.conversions` |
| **🔵 블루 (`brand-blue/10`, `brand-blue`)** | CRM 도착 기준 | `consultations` (utm 매칭) |
| **🟡 amber (`amber-300`)** | 비용/단가 강조 (CPL/CPA) | spend / leads |
| **🟢 emerald (`emerald-300`)** | 성공/매출 | revenue 양호, success message |
| **🔴 red (`red-400`)** | 실패/위험 | error, ROAS < 100% |

### 4.1 ROAS 컬러 룰

```ts
function roasColor(roas: number | null): 'good' | 'warn' | 'bad' | null {
  if (roas === null) return null
  if (roas >= 200) return 'good'   // emerald-300
  if (roas >= 100) return 'warn'   // amber-300
  return 'bad'                      // red-400
}
```

### 4.2 액션 배지 (sync 결과)

```
신규 (insert)    → brand-blue/20 + brand-blue
업데이트 (update) → brand-neon/20 + brand-neon
에러 (error)     → red-500/20 + red-300
건너뜀 (skip)    → ink-700 + ink-400
```

## 5. 공통 컴포넌트 패턴

### 5.1 KPI 카드 (Kpi)

```tsx
function Kpi({ label, value, highlight }: {
  label: string
  value: string
  highlight?: 'blue' | 'neon' | 'amber' | 'good' | 'warn' | 'bad' | null
}) {
  const color = highlight === 'blue'  ? 'text-brand-blue' :
                highlight === 'neon'  ? 'text-brand-neon' :
                highlight === 'amber' ? 'text-amber-300' :
                highlight === 'good'  ? 'text-emerald-300' :
                highlight === 'warn'  ? 'text-amber-300' :
                highlight === 'bad'   ? 'text-red-400' :
                'text-ink-100'
  return (
    <div className="bg-surface-darkSoft border border-ink-700 rounded-lg p-2.5">
      <div className="text-[10px] text-ink-500 uppercase tracking-wider">{label}</div>
      <div className={`text-base font-bold mt-1 font-mono ${color}`}>{value}</div>
    </div>
  )
}
```

용도: paid-media, product-sync, ad-sync 페이지의 상태 카드.

### 5.2 인라인 막대 (Bar)

```tsx
function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full h-2 bg-ink-900 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
      />
    </div>
  )
}
```

용도: 일별 추이 표 — 광고비/리드 시각화.

### 5.3 테이블 패턴

```tsx
<section className="bg-surface-darkSoft border border-ink-700 rounded-lg overflow-x-auto">
  <div className="px-5 pt-4 pb-2 flex items-baseline justify-between">
    <h2 className="text-lg font-bold text-ink-100">제목</h2>
    <span className="text-xs text-ink-500">부가 설명</span>
  </div>

  <table className="w-full text-sm">
    <thead className="bg-ink-900 text-ink-400 text-xs">
      <tr>
        <th className="text-left px-3 py-2">컬럼</th>
        <th className="text-right px-3 py-2">숫자</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-ink-800">
      {rows.map((r) => (
        <tr key={r.id} className="hover:bg-ink-800/30">
          <td className="px-3 py-2 text-ink-200">{r.label}</td>
          <td className="px-3 py-2 text-right font-mono text-ink-100">{fmtInt(r.value)}</td>
        </tr>
      ))}
    </tbody>
  </table>
</section>
```

규칙:
- 헤더: `bg-ink-900 text-ink-400 text-xs`
- 행: `divide-y divide-ink-800`, hover: `hover:bg-ink-800/30`
- 텍스트 정렬: 라벨 좌측 / 숫자 우측 + `font-mono`
- 컨테이너: `overflow-x-auto` 필수 (모바일 가로 스크롤)

### 5.4 폼 입력 패턴

```tsx
<input
  type="text"
  value={url}
  onChange={(e) => setUrl(e.target.value)}
  placeholder="..."
  className="w-full px-3 py-2 bg-ink-900 border border-ink-700 rounded text-sm text-ink-100 font-mono"
/>
```

### 5.5 버튼 패턴

| 종류 | className |
|---|---|
| 기본 회색 | `px-3 py-1.5 text-sm bg-ink-800 hover:bg-ink-700 text-ink-100 rounded` |
| 미리보기 (앰버) | `... bg-amber-600/20 hover:bg-amber-600/40 text-amber-200 ...` |
| 액션 (브랜드) | `... bg-brand-blue/40 hover:bg-brand-blue/60 text-brand-blue ... font-semibold` |
| 위험 (빨강) | `... bg-red-500/20 hover:bg-red-500/40 text-red-300 ...` |

공통: `disabled:opacity-50` + `disabled` 속성.

### 5.6 메시지 패턴

```tsx
{msg && (
  <p className={`text-sm font-medium ${msg.startsWith('❌') ? 'text-red-400' : 'text-emerald-300'}`}>
    {msg}
  </p>
)}
```

## 6. 포맷 헬퍼 (lib/admin/format-helpers.ts 또는 paid-media.ts)

```ts
fmtInt(n)        → '1,234'           // 천단위
fmtMoney(n)      → '1,234,567원'      // KRW
fmtPercent(n)    → '12.3%'           // 1자리 소수
fmtPercent(n, 0) → '12%'             // 정수
fmtCpl(n)        → '12,345원' or '-'  // 비용 단가
```

## 7. 가이드 박스 (펼치기)

product-sync 페이지의 사용 가이드 펼침 패턴:

```tsx
<section className="bg-surface-darkSoft border border-ink-700 rounded-lg p-4">
  <button
    onClick={() => setShowGuide((s) => !s)}
    className="flex items-center gap-2 text-sm font-semibold text-brand-blue hover:text-brand-violet"
  >
    {showGuide ? '▼' : '▶'} 사용 가이드 + 표준 양식 헤더
  </button>
  {showGuide && (
    <div className="mt-3 space-y-3 text-sm text-ink-300">
      ...내용...
    </div>
  )}
</section>
```

## 8. 외부 페이지 디자인 (참고)

랜딩/홈은 어드민과 톤이 다름:
- 배경: `linear-gradient(180deg, #FFFFFF 0%, #F6F8FF 65%, #F4F0FF 100%)` (`app/layout.tsx`)
- CTA: `btn-primary` (브랜드 그라데이션 + 호버 슬라이드 애니메이션)
- 히어로: `hero-device-bg` (radial gradient 블루)
- 카드: 흰 배경 + 그림자

> 어드민 작업 시에는 어드민 다크 톤만. 랜딩 톤 적용 안 됨.

## 9. 로고 / 아이콘

| 종류 | 경로 |
|---|---|
| 가로형 풀로고 (transparent) | `public/brand/oz-labpay-horizontal.png` |
| 세로형 (transparent) | `public/brand/oz-labpay-vertical.png` |
| 심볼만 (transparent) | `public/brand/oz-symbol.png` |
| 화이트 버전 (다크 배경용) | `public/brand/*-white.png` |
| 파비콘 | `app/icon.tsx` (동적 — 그라데이션 + "OZ") |
| OG 이미지 | `app/opengraph-image.tsx` (동적) |

## 10. 디자인 결정 이력

| 변경 | 시점 | 이유 |
|---|---|---|
| 네이버 톤 → 인디고-퍼플 브랜드 | 2026-05-26 | 리브랜드 (OZ labPay 신규 로고) |
| 어드민 다크 테마 통일 | (초기부터) | TM 장시간 사용 — 눈 피로 줄이기 |
| ROAS 색상 룰 (200/100) | 2026-05-27 | 매출 모니터링 직관 |
| 보라 = 광고측 / 블루 = CRM측 | 2026-05-27 | 어트리뷰션 갭 분리 강조 |
| KPI 카드 컴팩트 (10pt 폰트) | Phase E | 9~10개 한 화면에 |
| 인라인 막대 표 | Phase B | 별도 차트 라이브러리 없이 시각화 |

## 11. 향후 디자인 작업 후보

- 차트 라이브러리 도입 (Recharts) — 일별 추이를 막대 표 대신 차트로
- 모바일 가로 스크롤 개선 (스크롤 그라데이션 + 표 고정 컬럼)
- 라이트 모드 (어드민) — 사용자 토글
- 키보드 단축키 (Cmd+K 빠른 검색)
- 다국어 (영문 — SaaS 확장 시)

## 12. 다음 문서로

- 알려진 이슈 → `08_OPEN_ISSUES.md`
- 다음 단계 로드맵 → `09_NEXT_STEPS.md`
