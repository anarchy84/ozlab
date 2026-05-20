'use client'

// ─────────────────────────────────────────────
// CustomHeadInjector — 슈퍼어드민이 /admin/settings/head 에서 입력한
// custom_head_html 을 document.head 에 동적 inject
//
// 왜 클라이언트 inject 인가:
//   - layout.tsx <head> 안에 SSR 로 dangerouslySetInnerHTML 박으면
//     /admin/* 경로 차단을 server 쪽에서 못 함 (pathname 모름)
//   - 클라이언트에서 usePathname 으로 /admin 차단하고 head 에 inject
//   - 보통 트래킹 픽셀이라 hydration 후 박혀도 GA 통계 누락 거의 없음
//
// 안전:
//   - createContextualFragment 로 multi-tag(script+meta+link) 한 번에 inject
//   - script 태그는 fragment 로는 실행 안 되므로 별도 createElement('script') 로 복사
//   - cleanup 시 inject 한 노드들 제거 (HMR/pathname 변화 대응)
// ─────────────────────────────────────────────

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

interface Props {
  /** 슈퍼어드민이 저장한 raw HTML (script/meta/link 자유) */
  html: string | null
}

export function CustomHeadInjector({ html }: Props) {
  const pathname = usePathname()

  useEffect(() => {
    // 어드민 경로는 어떤 외부 트래킹도 안 박힘 (직원 내부 사용 통계 오염 방지)
    if (pathname?.startsWith('/admin')) return
    if (!html || html.trim().length === 0) return

    const inserted: Node[] = []

    try {
      // fragment 로 파싱 → head 에 차례로 append
      const range = document.createRange()
      // range 가 head 기준으로 동작하도록 시작점 설정
      range.selectNode(document.head)
      const fragment = range.createContextualFragment(html)

      // fragment 안의 <script> 들은 단순 append 로는 실행 안 됨 → 새 script element 로 복제
      const scripts: HTMLScriptElement[] = []
      Array.from(fragment.querySelectorAll('script')).forEach((s) => {
        scripts.push(s as HTMLScriptElement)
      })

      // 1) script 제외 모든 노드 먼저 append
      Array.from(fragment.childNodes).forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === 'SCRIPT') {
          return
        }
        document.head.appendChild(node)
        inserted.push(node)
      })

      // 2) script 는 새로 만들어서 attrs 복사 → 실행됨
      scripts.forEach((origScript) => {
        const s = document.createElement('script')
        for (const attr of Array.from(origScript.attributes)) {
          s.setAttribute(attr.name, attr.value)
        }
        if (origScript.textContent) s.textContent = origScript.textContent
        // 사이트 식별용 — 다음 cleanup 에서 우리 거인지 구분
        s.setAttribute('data-custom-head', 'site-settings')
        document.head.appendChild(s)
        inserted.push(s)
      })
    } catch (e) {
      console.warn('[CustomHeadInjector] inject failed', e)
    }

    return () => {
      // cleanup — pathname 변하거나 unmount 시 우리가 박은 노드들만 제거
      inserted.forEach((n) => {
        try {
          if (n.parentNode) n.parentNode.removeChild(n)
        } catch {
          // ignore
        }
      })
    }
  }, [html, pathname])

  return null
}
