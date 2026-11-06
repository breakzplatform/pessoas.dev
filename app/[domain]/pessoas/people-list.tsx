"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import { Tr, ui } from "@/lib/i18n"
import { PersonRow, type Person } from "@/components/person"

interface Props {
  domain: string
  search: string
  initial: Person[]
  initialOffset: number | null
  home: string
  loadMore: (
    domain: string,
    search: string,
    offset: number
  ) => Promise<{ people: Person[]; nextOffset: number | null }>
}

// The server filters by handle (?q=) across everyone registered; typing here
// also narrows the rows already loaded by name or handle, without a request.
export function PeopleList({
  domain,
  search,
  initial,
  initialOffset,
  home,
  loadMore,
}: Props) {
  const [people, setPeople] = useState(initial)
  const [offset, setOffset] = useState(initialOffset)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [filter, setFilter] = useState(search)
  const sentinel = useRef<HTMLDivElement>(null)

  const term = filter.trim().toLowerCase().replace(/^@/, "")
  const visible = useMemo(
    () =>
      term && term !== search
        ? people.filter(
            (person) =>
              person.handle.toLowerCase().includes(term) ||
              person.displayName?.toLowerCase().includes(term)
          )
        : people,
    [people, term, search]
  )

  const next = async () => {
    if (offset === null || loading) return
    setLoading(true)
    setFailed(false)
    try {
      const page = await loadMore(domain, search, offset)
      setPeople((current) => [...current, ...page.people])
      setOffset(page.nextOffset)
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }
  const nextRef = useRef(next)
  useEffect(() => {
    nextRef.current = next
  })

  useEffect(() => {
    const element = sentinel.current
    if (!element) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) nextRef.current()
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <form className="controls" role="search">
        <div>
          <label htmlFor="q">
            <Tr pt="Filtrar por nome ou @" en="Filter by name or handle" />
          </label>
          <span className="db-field cast">
            <input
              className="db-input"
              id="q"
              name="q"
              type="search"
              autoCapitalize="none"
              autoComplete="off"
              spellCheck={false}
              placeholder="ana, marina…"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            />
          </span>
        </div>
        <button className="db-btn cast press" type="submit">
          <Tr pt="buscar em todos" en="search everyone" />
        </button>
      </form>

      {visible.length > 0 ? (
        <ul className="people" aria-busy={loading}>
          {visible.map((person) => (
            <PersonRow profile={person} variant="list" key={person.did} />
          ))}
        </ul>
      ) : search || term ? (
        <Tr
          as="p"
          className="empty"
          pt="Ninguém com esse nome nesta lista."
          en="Nobody with that name in this list."
        />
      ) : (
        <Tr
          as="p"
          className="empty"
          pt={
            <>
              Ainda não tem ninguém neste domínio.{" "}
              <a href={home}>Pegue o primeiro @</a>.
            </>
          }
          en={
            <>
              Nobody on this domain yet. <a href={home}>Get the first handle</a>
              .
            </>
          }
        />
      )}

      {failed && (
        <div role="alert">
          <Tr
            as="p"
            className="empty"
            pt="Não deu para carregar mais. Tente de novo."
            en="Could not load more. Try again."
          />
        </div>
      )}
      <div className="more-wrap" ref={sentinel} hidden={offset === null}>
        <button
          className="db-btn cast press"
          type="button"
          onClick={next}
          disabled={loading}
        >
          <Tr {...(loading ? ui.loading : ui.loadMore)} />
        </button>
      </div>
    </>
  )
}
