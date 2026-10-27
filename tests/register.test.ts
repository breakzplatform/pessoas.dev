import { beforeEach, describe, expect, it, vi } from "vitest"

import { createFakes } from "./fakes"

const fakes = vi.hoisted(() => ({}) as ReturnType<typeof createFakes>)
const agent = vi.hoisted(() => ({ getProfile: vi.fn() }))

// Getters, because vitest caches mock factories across vi.resetModules().
vi.mock("@/lib/db", () => ({
  get prisma() {
    return fakes.prisma
  },
}))
vi.mock("next/cache", () => ({
  unstable_cache: (...args: unknown[]) =>
    (fakes.nextCache.unstable_cache as (...a: unknown[]) => unknown)(...args),
  updateTag: (tag: string) => fakes.nextCache.updateTag(tag),
}))
vi.mock("@/lib/atproto", () => ({ agent }))

async function load() {
  vi.resetModules()
  Object.assign(
    fakes,
    createFakes([
      { handle: "maria", did: "did:plc:maria", domain: "pessoas.dev" },
    ])
  )
  agent.getProfile.mockReset()
  agent.getProfile.mockImplementation(async ({ actor }: { actor: string }) => {
    if (actor === "ana.bsky.social") {
      return { success: true, data: { did: "did:plc:ana", handle: actor } }
    }
    if (actor === "maria.bsky.social") {
      return { success: true, data: { did: "did:plc:maria", handle: actor } }
    }
    throw new Error("Profile not found")
  })
  const { register } = await import("@/lib/register")
  const { GET } = await import(
    "@/app/[domain]/[handle]/.well-known/atproto-did/route"
  )
  return { register, GET }
}

function verify(GET: Awaited<ReturnType<typeof load>>["GET"], handle: string) {
  return GET(
    new Request(`https://${handle}.pessoas.dev/.well-known/atproto-did`),
    { params: Promise.resolve({ domain: "pessoas.dev", handle }) }
  )
}

describe("register", () => {
  let register: Awaited<ReturnType<typeof load>>["register"]
  let GET: Awaited<ReturnType<typeof load>>["GET"]

  beforeEach(async () => {
    ;({ register, GET } = await load())
  })

  it("creates the handle and invalidates the cached handle map", async () => {
    expect((await verify(GET, "ana")).status).toBe(404)

    const result = await register({
      domain: "pessoas.dev",
      actor: "ana.bsky.social",
      requested: "Ana",
    })

    expect(result).toEqual({ status: "ok", handle: "ana.pessoas.dev" })
    expect(fakes.prisma.user.create).toHaveBeenCalledOnce()
    expect(fakes.nextCache.updateTag).toHaveBeenCalledWith("handles")

    const res = await verify(GET, "ana")
    expect(res.status).toBe(200)
    expect(await res.text()).toBe("did:plc:ana")
  })

  it("accepts the full handle with the domain suffix", async () => {
    const result = await register({
      domain: "pessoas.dev",
      actor: "ana.bsky.social",
      requested: "ana.pessoas.dev",
    })
    expect(result.status).toBe("ok")
  })

  it("takes the DID from the Bluesky profile, not from the form", async () => {
    await register({
      domain: "pessoas.dev",
      actor: "ana.bsky.social",
      requested: "ana",
    })
    expect(fakes.prisma.user.create.mock.calls[0][0].data.did).toBe(
      "did:plc:ana"
    )
  })

  it("is a no-op when the same account registers its own handle again", async () => {
    const result = await register({
      domain: "pessoas.dev",
      actor: "maria.bsky.social",
      requested: "maria",
    })
    expect(result.status).toBe("ok")
    expect(fakes.prisma.user.create).not.toHaveBeenCalled()
    expect(fakes.nextCache.updateTag).not.toHaveBeenCalled()
  })

  it.each([
    ["maria", "handle taken"],
    ["ana_dev", "invalid handle"],
    ["-ana", "invalid handle"],
    ["ana.outro.dev", "invalid handle"],
    ["a".repeat(64), "invalid handle"],
    ["", "invalid handle"],
    ["joselito", "reserved"],
    ["bolsonaro", "slur"],
  ])(
    "rejects %j with %s and leaves the cache alone",
    async (requested, status) => {
      const result = await register({
        domain: "pessoas.dev",
        actor: "ana.bsky.social",
        requested,
      })
      expect(result.status).toBe(status)
      expect(fakes.prisma.user.create).not.toHaveBeenCalled()
      expect(fakes.nextCache.updateTag).not.toHaveBeenCalled()
    }
  )

  it("rejects an unknown Bluesky account", async () => {
    const result = await register({
      domain: "pessoas.dev",
      actor: "ninguem.bsky.social",
      requested: "ana",
    })
    expect(result.status).toBe("account not found")
    expect(fakes.prisma.user.create).not.toHaveBeenCalled()
  })

  it("rejects domains the app does not serve", async () => {
    const result = await register({
      domain: "pessoas-dev-git-x.vercel.app",
      actor: "ana.bsky.social",
      requested: "ana",
    })
    expect(result.status).toBe("invalid domain")
    expect(fakes.prisma.user.create).not.toHaveBeenCalled()
  })

  it("reports a concurrent signup of the same handle as taken", async () => {
    fakes.prisma.user.create.mockRejectedValueOnce(
      Object.assign(new Error("Unique constraint failed"), { code: "P2002" })
    )
    const result = await register({
      domain: "pessoas.dev",
      actor: "ana.bsky.social",
      requested: "ana",
    })
    expect(result.status).toBe("handle taken")
    expect(fakes.nextCache.updateTag).not.toHaveBeenCalled()
  })
})
