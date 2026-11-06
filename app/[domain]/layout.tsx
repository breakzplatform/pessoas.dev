import { notFound } from "next/navigation"

import { siteConfig } from "@/config/site"
import { Tr, ui } from "@/lib/i18n"
import { basePath } from "@/lib/paths"
import { LanguageButton, ThemeButton } from "@/components/shell-controls"
import { Footer } from "@/components/site-shell"

interface Props {
  children: React.ReactNode
  params: Promise<{ domain: string }>
}

export default async function DomainLayout({ children, params }: Props) {
  const { domain } = await params
  if (!siteConfig.domains.includes(domain)) notFound()
  const base = await basePath(domain)

  return (
    <>
      <a className="skip-link" href="#main">
        <Tr {...ui.skip} />
      </a>
      <div className="page">
        <div className="topbar">
          <LanguageButton />
          <ThemeButton />
        </div>
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <Footer base={base} />
      </div>
    </>
  )
}
