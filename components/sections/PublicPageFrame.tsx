import type { ReactNode } from 'react'
import { Nav } from '@/components/sections/Nav'
import { Footer } from '@/components/sections/Footer'
import { fetchCtasByPlacement } from '@/lib/cta-server'
import type { CtaButton } from '@/lib/admin/types'
import { blocksMapToRecord } from '@/lib/content-blocks'
import { getBlocksForPage } from '@/lib/content-blocks-server'

interface Props {
  children: ReactNode
}

export async function PublicPageFrame({ children }: Props) {
  const [blocksMap, ctasByPlacement] = await Promise.all([
    getBlocksForPage('/'),
    fetchCtasByPlacement(),
  ])
  const blocks = blocksMapToRecord(blocksMap)
  const normalizeHashCtas = (ctas?: CtaButton[]) =>
    ctas?.map((cta) => ({
      ...cta,
      target_href: cta.target_href.startsWith('#') ? `/${cta.target_href}` : cta.target_href,
    }))
  const navCtas = normalizeHashCtas(ctasByPlacement.nav)
  const footerCtas = normalizeHashCtas(ctasByPlacement.footer)

  return (
    <>
      <Nav blocks={blocks} ctas={navCtas} />
      {children}
      <Footer blocks={blocks} ctas={footerCtas} />
    </>
  )
}
