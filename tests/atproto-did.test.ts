import { beforeEach, describe, expect, it, vi } from "vitest"

import { createFakes } from "./fakes"

const fakes = vi.hoisted(() => ({}) as ReturnType<typeof createFakes>)

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

async function loadRoute() {
  vi.resetModules()
  Object.assign(
    fakes,
    createFakes([
      { handle: "maria", did: "did:plc:maria", domain: "pessoas.dev" },
      { handle: "maria", did: "did:plc:outra", domain: "ceuazul.online" },
    ])
  )
  return import("@/app/[domain]/[handle]/.well-known/atproto-did/route")
}

function request(domain: string, handle: string) {
  return {
    req: new Request(`https://${handle}.${domain}/.well-known/atproto-did`),
    ctx: { params: Promise.resolve({ domain, handle }) },
  }
}

describe("GET /.well-known/atproto-did", () => {
  let GET: Awaited<ReturnType<typeof loadRoute>>["GET"]

  beforeEach(async () => {
    ;({ GET } = await loadRoute())
  })

  it("returns the DID of a known handle as plain text", async () => {
    const { req, ctx } = request("pessoas.dev", "maria")
    const res = await GET(req, ctx)

    expect(res.status).toBe(200)
    expect(await res.text()).toBe("did:plc:maria")
    expect(res.headers.get("content-type")).toMatch(/^text\/plain/)
  })

  it("scopes the lookup to the request domain", async () => {
    const { req, ctx } = request("ceuazul.online", "maria")
    expect(await (await GET(req, ctx)).text()).toBe("did:plc:outra")
  })

  it("lets the CDN cache a known handle for a day", async () => {
    const { req, ctx } = request("pessoas.dev", "maria")
    const res = await GET(req, ctx)

    expect(res.headers.get("cache-control")).toBe(
      "public, s-maxage=86400, stale-while-revalidate=604800"
    )
  })

  it("returns 404 for an unknown handle, cached only briefly", async () => {
    const { req, ctx } = request("pessoas.dev", "naoexiste-xyz123")
    const res = await GET(req, ctx)

    expect(res.status).toBe(404)
    expect(res.headers.get("content-type")).toMatch(/^text\/plain/)
    expect(res.headers.get("cache-control")).toBe("public, s-maxage=60")
  })

  it("returns 404 for an unknown domain", async () => {
    const { req, ctx } = request("example.com", "maria")
    expect((await GET(req, ctx)).status).toBe(404)
  })

  it("matches handles case-insensitively", async () => {
    const { req, ctx } = request("Pessoas.Dev", "Maria")
    expect(await (await GET(req, ctx)).text()).toBe("did:plc:maria")
  })

  it("reads the database once across many requests", async () => {
    for (const handle of ["maria", "maria", "naoexiste", "outro"]) {
      const { req, ctx } = request("pessoas.dev", handle)
      await GET(req, ctx)
    }
    expect(fakes.prisma.user.findMany).toHaveBeenCalledTimes(1)
    expect(fakes.prisma.user.findFirst).not.toHaveBeenCalled()
  })

  it("caches the handle map under the handles tag with no expiry", async () => {
    const { req, ctx } = request("pessoas.dev", "maria")
    await GET(req, ctx)

    const [, , options] = fakes.nextCache.unstable_cache.mock.calls[0]
    expect(options).toMatchObject({ tags: ["handles"], revalidate: false })
  })
})
