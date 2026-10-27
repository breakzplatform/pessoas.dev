import { unstable_cache } from "next/cache"

import { prisma } from "@/lib/db"

export const HANDLES_TAG = "handles"

export interface HandleRecord {
  handle: string
  domain: string
  did: string
}

// The whole table is ~1.5k rows and changes a few times a month, so it is
// loaded once into the Data Cache and only refreshed when a signup calls
// updateTag(HANDLES_TAG). This keeps Neon's compute asleep: handle
// verification traffic from the Bluesky network never reaches Postgres.
export const getHandles = unstable_cache(
  async (): Promise<HandleRecord[]> => {
    const users = await prisma.user.findMany({
      select: { handle: true, did: true, domain: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    })
    return users.map(({ handle, did, domain }) => ({
      handle,
      did,
      domain: domain.name,
    }))
  },
  [HANDLES_TAG],
  { tags: [HANDLES_TAG], revalidate: false }
)

export async function findDid(domain: string, handle: string) {
  domain = domain.toLowerCase()
  handle = handle.toLowerCase()
  const handles = await getHandles()
  return (
    handles.find(
      (record) => record.handle === handle && record.domain === domain
    )?.did ?? null
  )
}

export async function listDids(domain: string) {
  domain = domain.toLowerCase()
  const handles = await getHandles()
  return handles
    .filter((record) => record.domain === domain)
    .map((record) => record.did)
}
