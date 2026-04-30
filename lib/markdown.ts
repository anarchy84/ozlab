// ─────────────────────────────────────────────
// 가벼운 마크다운 → HTML 변환 (외부 의존성 X)
//
// 지원 :
//   - # / ## / ### 헤딩
//   - **굵게** / *기울임*
//   - [텍스트](URL) 링크
//   - - 또는 1. 리스트
//   - | 표 |
//   - 빈 줄로 단락 구분
//   - > 인용
//
// 안전성 :
//   - HTML 태그 escape (XSS 방지)
//   - 글이 어드민에서만 생성되지만 그래도 escape
// ─────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderInline(s: string): string {
  let out = escapeHtml(s)
  // 링크 [text](url) — escape 후라 안전
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, t, u) => {
    const safeUrl = u.startsWith('http') || u.startsWith('/') || u.startsWith('#') ? u : '#'
    return `<a href="${safeUrl}" class="text-naver-deep underline hover:text-naver-dark">${t}</a>`
  })
  // **굵게**
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  // *기울임*
  out = out.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>')
  // `code`
  out = out.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 bg-ink-100 rounded text-sm">$1</code>')
  return out
}

export function renderMarkdown(md: string): string {
  const lines = md.split(/\r?\n/)
  const out: string[] = []
  let i = 0
  let inList: 'ul' | 'ol' | null = null

  function closeList() {
    if (inList) {
      out.push(`</${inList}>`)
      inList = null
    }
  }

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // 빈 줄
    if (!trimmed) {
      closeList()
      i++
      continue
    }

    // 표 (간단 — 첫 줄에 |, 다음 줄에 |---|)
    if (trimmed.startsWith('|') && lines[i + 1]?.trim().match(/^\|[\s\-:|]+\|$/)) {
      closeList()
      const headers = trimmed.split('|').slice(1, -1).map((c) => c.trim())
      i += 2
      const rows: string[][] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const cells = lines[i].trim().split('|').slice(1, -1).map((c) => c.trim())
        rows.push(cells)
        i++
      }
      out.push('<div class="overflow-x-auto my-6"><table class="w-full text-sm border-collapse">')
      out.push('<thead><tr>')
      for (const h of headers) {
        out.push(
          `<th class="text-left px-3 py-2 border-b-2 border-ink-200 font-bold">${renderInline(h)}</th>`,
        )
      }
      out.push('</tr></thead><tbody>')
      for (const row of rows) {
        out.push('<tr>')
        for (const c of row) {
          out.push(
            `<td class="px-3 py-2 border-b border-ink-100">${renderInline(c)}</td>`,
          )
        }
        out.push('</tr>')
      }
      out.push('</tbody></table></div>')
      continue
    }

    // 헤딩
    const h = trimmed.match(/^(#{1,4})\s+(.+)$/)
    if (h) {
      closeList()
      const level = h[1].length
      const text = renderInline(h[2])
      const cls =
        level === 1
          ? 'text-3xl font-extrabold mt-8 mb-3'
          : level === 2
          ? 'text-2xl font-bold mt-8 mb-3 text-ink-900'
          : level === 3
          ? 'text-xl font-bold mt-6 mb-2 text-ink-900'
          : 'text-lg font-semibold mt-4 mb-2 text-ink-900'
      out.push(`<h${level} class="${cls}">${text}</h${level}>`)
      i++
      continue
    }

    // 인용
    if (trimmed.startsWith('> ')) {
      closeList()
      out.push(
        `<blockquote class="border-l-4 border-naver-green pl-4 my-4 italic text-ink-600">${renderInline(trimmed.slice(2))}</blockquote>`,
      )
      i++
      continue
    }

    // 순서 리스트
    const ol = trimmed.match(/^(\d+)\.\s+(.+)$/)
    if (ol) {
      if (inList !== 'ol') {
        closeList()
        out.push('<ol class="list-decimal pl-6 my-4 space-y-1">')
        inList = 'ol'
      }
      out.push(`<li>${renderInline(ol[2])}</li>`)
      i++
      continue
    }

    // 비순서 리스트
    if (trimmed.startsWith('- ')) {
      if (inList !== 'ul') {
        closeList()
        out.push('<ul class="list-disc pl-6 my-4 space-y-1">')
        inList = 'ul'
      }
      out.push(`<li>${renderInline(trimmed.slice(2))}</li>`)
      i++
      continue
    }

    // 일반 단락
    closeList()
    out.push(`<p class="my-4 text-ink-700 leading-relaxed break-keep">${renderInline(trimmed)}</p>`)
    i++
  }

  closeList()
  return out.join('\n')
}
