import { agent } from "@/lib/atproto"
import { listDids } from "@/lib/handles"
import { toPerson, type Person } from "@/components/person"

export const PAGE_SIZE = 100

// Turns what people type in the filter ("@ana", "ana.pessoas.dev") into the
// label stored in the database.
export function normalizeSearch(input: string | undefined, domain: string) {
  let search = (input ?? "").trim().toLowerCase().replace(/^@/, "")
  if (search.endsWith(`.${domain}`))
    search = search.slice(0, -domain.length - 1)
  return search.slice(0, 63)
}

export interface DirectoryPage {
  people: Person[]
  nextOffset: number | null
  total: number
}

export async function getPeople(
  domain: string,
  search: string,
  offset = 0
): Promise<DirectoryPage> {
  const dids = await listDids(domain, search)
  const page = dids.slice(offset, offset + PAGE_SIZE)
  const nextOffset =
    offset + PAGE_SIZE < dids.length ? offset + PAGE_SIZE : null

  const chunks: string[][] = []
  for (let i = 0; i < page.length; i += 25) chunks.push(page.slice(i, i + 25))

  const responses = await Promise.all(
    chunks.map((actors) => agent.getProfiles({ actors }))
  )
  // Only list accounts still using a handle on this domain.
  const people = responses
    .flatMap((response) => response.data.profiles)
    .filter(
      (value, index, array) =>
        array.findIndex(({ did }) => did === value.did) === index &&
        value.handle.endsWith(`.${domain}`)
    )
    .map(toPerson)

  return { people, nextOffset, total: dids.length }
}
