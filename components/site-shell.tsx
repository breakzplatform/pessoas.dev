import { copyFor, siteConfig } from "@/config/site"
import { Tr, ui, type Localized } from "@/lib/i18n"
import { homeHref } from "@/lib/paths"
import { DocumentTitle } from "@/components/document-title"

export type Section = "home" | "people" | "faq"

export function pageTitle(description: string, domain: string) {
  return `${description} • ${domain}`
}

export function Masthead({
  domain,
  base,
  current,
  title,
}: {
  domain: string
  base: string
  current: Section | null
  title: Localized<string>
}) {
  const copy = copyFor(domain)
  const items: { section: Section; href: string; label: Localized<string> }[] =
    [
      { section: "home", href: homeHref(base), label: ui.navHome },
      { section: "people", href: `${base}/pessoas`, label: ui.navPeople },
      { section: "faq", href: `${homeHref(base)}#perguntas`, label: ui.navFaq },
    ]
  return (
    <>
      <DocumentTitle
        pt={pageTitle(title.pt, domain)}
        en={pageTitle(title.en, domain)}
      />
      <h1 className="db-wordmark">
        <a href={homeHref(base)} className="wordmark" aria-label={domain}>
          <span className="ink-block tilt-cw">{copy.block}</span>
          <span className="wordmark-suffix">{copy.suffix}</span>
        </a>
      </h1>
      <nav className="local-nav" aria-label="seções / sections">
        {items.map(({ section, href, label }) =>
          section === current ? (
            <span aria-current="page" key={section}>
              <Tr {...label} />
            </span>
          ) : (
            <a href={href} key={section}>
              <Tr {...label} />
            </a>
          )
        )}
      </nav>
    </>
  )
}

export function Footer({ base }: { base: string }) {
  const { links } = siteConfig
  const chip = (kind: string, href: string, label: string) => (
    <a
      href={href}
      className={`db-chip db-chip-${kind} cast press`}
      target="_blank"
      rel="noopener"
    >
      {label}
    </a>
  )
  return (
    <footer>
      <p className="db-meta">
        <Tr {...ui.tagline} /> · <Tr {...ui.partOf} />{" "}
        <a href={links.notx}>notx.blue</a> · <Tr {...ui.by} />{" "}
        <a href={links.author} target="_blank" rel="noopener">
          @joseli.to
        </a>{" "}
        ·{" "}
        <Tr
          pt={<a href={`${base}/privacidade`}>{ui.privacy.pt}</a>}
          en={<a href={`${base}/privacy`}>{ui.privacy.en}</a>}
        />{" "}
        ·{" "}
        <a href={links.status} target="_blank" rel="noopener">
          <Tr {...ui.status} />
        </a>{" "}
        ·{" "}
        <a href={links.source} target="_blank" rel="noopener">
          <Tr {...ui.source} />
        </a>{" "}
        · <a href={`mailto:${links.abuse}`}>{links.abuse}</a>
      </p>
      <Tr as="p" className="db-note" {...ui.fromBrazil} />
      <Tr
        as="p"
        className="db-note credit"
        pt={
          <>
            Baseado no{" "}
            <a href={links.upstream} target="_blank" rel="noopener">
              community-handles
            </a>
            , do Samuel Newman. Licença MIT.
          </>
        }
        en={
          <>
            Based on{" "}
            <a href={links.upstream} target="_blank" rel="noopener">
              community-handles
            </a>{" "}
            by Samuel Newman. MIT license.
          </>
        }
      />
      <div className="support">
        <span
          className="db-micro"
          style={{ color: "var(--text-3)", marginRight: 4 }}
        >
          <Tr {...ui.support} />
        </span>
        {chip("pix", "https://pix.joseli.to", "Pix")}
        {chip(
          "mercadopago",
          "https://link.mercadopago.com.br/breakzplatform",
          "Mercado Pago"
        )}
        {chip("coffee", "https://buymeacoffee.com/joselito", "Buy Me a Coffee")}
        {chip(
          "sponsors",
          "https://github.com/sponsors/breakzplatform",
          "GitHub Sponsors"
        )}
      </div>
    </footer>
  )
}
