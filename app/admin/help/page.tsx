// ─────────────────────────────────────────────
// /admin/help — 운영 가이드 (운영 가이드 v1 HTML 임베드)
// 인증된 직원만 진입 가능. iframe 으로 풀스크린 렌더.
// ─────────────────────────────────────────────

export default function HelpPage() {
  return (
    <iframe
      src="/admin-help/guide.html"
      title="오즈랩페이 어드민 운영 가이드"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        border: 0,
      }}
    />
  )
}
