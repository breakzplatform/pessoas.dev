import { vi } from "vitest"

export interface Row {
  handle: string
  did: string
  domain: string
}

// In-memory stand-ins for Prisma and the Next Data Cache. The cache honors
// tags like Next's does, so tests can assert that only a tag invalidation
// sends reads back to the database.
export function createFakes(initial: Row[] = []) {
  const rows = [...initial]
  const cache = new Map<string, { value: unknown; tags: string[] }>()

  const prisma = {
    user: {
      findMany: vi.fn(async () =>
        rows.map(({ handle, did, domain }) => ({
          handle,
          did,
          domain: { name: domain },
        }))
      ),
      findFirst: vi.fn(
        async ({
          where,
        }: {
          where: { handle: string; domain: { name: string } }
        }) => {
          const row = rows.find(
            (r) => r.handle === where.handle && r.domain === where.domain.name
          )
          return row ? { ...row } : null
        }
      ),
      create: vi.fn(
        async ({
          data,
        }: {
          data: {
            handle: string
            did: string
            domain: { connectOrCreate: { where: { name: string } } }
          }
        }) => {
          const row = {
            handle: data.handle,
            did: data.did,
            domain: data.domain.connectOrCreate.where.name,
          }
          rows.push(row)
          return row
        }
      ),
    },
  }

  const nextCache = {
    unstable_cache: vi.fn(
      <T>(
        fn: () => Promise<T>,
        keyParts: string[],
        options: { tags?: string[] }
      ) =>
        async () => {
          const key = keyParts.join("/")
          const hit = cache.get(key)
          if (hit) return structuredClone(hit.value) as T
          const value = await fn()
          cache.set(key, { value, tags: options.tags ?? [] })
          return structuredClone(value)
        }
    ),
    updateTag: vi.fn((tag: string) => {
      for (const [key, entry] of cache) {
        if (entry.tags.includes(tag)) cache.delete(key)
      }
    }),
  }

  return { rows, prisma, nextCache }
}
