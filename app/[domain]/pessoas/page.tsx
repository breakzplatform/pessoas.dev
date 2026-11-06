import { type Metadata } from "next"

import { Tr } from "@/lib/i18n"
import { pageMetadata } from "@/lib/metadata"
import { basePath, homeHref } from "@/lib/paths"
import { Masthead } from "@/components/site-shell"

import { getPeople, normalizeSearch, type DirectoryPage } from "./directory"
import { PeopleList } from "./people-list"

interface Props {
  params: Promise<{ domain: string }>
  searchParams: Promise<{ q?: string }>
}

const TITLE = { pt: "Quem já usa", en: "Who already uses it" }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { domain } = await params
  return pageMetadata(
    domain,
    TITLE.pt,
    `As pessoas que usam um @ do ${domain} no Bluesky.`
  )
}

export default async function PeoplePage({ params, searchParams }: Props) {
  const { domain } = await params
  const base = await basePath(domain)
  const search = normalizeSearch((await searchParams).q, domain)

  let page: DirectoryPage | null = null
  try {
    page = await getPeople(domain, search)
  } catch (error) {
    console.error(error)
  }

  return (
    <>
      <Masthead domain={domain} base={base} current="people" title={TITLE} />
      <section className="db-panel cast" aria-labelledby="people-title">
        <h2 className="db-panel-head" id="people-title">
          <Tr pt="Quem já usa este @" en="Who already uses this handle" />
          {page && (
            <span className="panel-count">
              {page.total.toLocaleString("pt-BR")}{" "}
              <Tr pt="cadastros" en="registered" />
            </span>
          )}
        </h2>
        <div className="db-panel-body">
          {page ? (
            <PeopleList
              domain={domain}
              search={search}
              initial={page.people}
              initialOffset={page.nextOffset}
              home={homeHref(base)}
              loadMore={loadMorePeople}
            />
          ) : (
            <div role="alert">
              <Tr
                as="p"
                className="empty"
                pt={
                  <>
                    Não deu para carregar a lista. <a href="">Tentar de novo</a>
                    .
                  </>
                }
                en={
                  <>
                    Could not load the list. <a href="">Try again</a>.
                  </>
                }
              />
            </div>
          )}
        </div>
      </section>
    </>
  )
}

async function loadMorePeople(domain: string, search: string, offset: number) {
  "use server"
  // Server actions are public endpoints, so every argument is untrusted.
  if (!Number.isSafeInteger(offset) || offset < 0) offset = 0
  const { people, nextOffset } = await getPeople(
    String(domain).toLowerCase(),
    normalizeSearch(String(search), String(domain).toLowerCase()),
    offset
  )
  return { people, nextOffset }
}
