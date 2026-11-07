import { beforeEach, describe, expect, it, vi } from "vitest"

import { createFakes, type Attempt } from "./fakes"

const fakes = vi.hoisted(() => ({}) as ReturnType<typeof createFakes>)

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

const ANA = `did:plc:${"ana".repeat(8)}`
const BIA = `did:plc:${"bia".repeat(8)}`
const HOUR = 60 * 60 * 1000

function ago(ms: number) {
  return new Date(Date.now() - ms)
}

async function load(attempts: Attempt[] = []) {
  vi.resetModules()
  Object.assign(fakes, createFakes([], attempts))
  return (await import("@/lib/register")).register
}

const signup = (
  register: Awaited<ReturnType<typeof load>>,
  did: string,
  ipHash: string,
  requested: string
) => register({ domain: "pessoas.dev", did, ipHash, requested })

describe("registration rate limits", () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  it("allows 3 signups per account a day, then refuses with a clear status", async () => {
    const register = await load()
    for (const name of ["ana1", "ana2", "ana3"]) {
      expect((await signup(register, ANA, `ip-${name}`, name)).status).toBe(
        "ok"
      )
    }
    const fourth = await signup(register, ANA, "ip-other", "ana4")
    expect(fourth).toEqual({
      status: "too many for account",
      handle: "ana4.pessoas.dev",
    })
    expect(fakes.rows.map((r) => r.handle)).toEqual(["ana1", "ana2", "ana3"])
  })

  it("counts only the last 24 hours per account", async () => {
    const register = await load([
      { did: ANA, ipHash: "x", createdAt: ago(25 * HOUR) },
      { did: ANA, ipHash: "x", createdAt: ago(24.5 * HOUR) },
      { did: ANA, ipHash: "x", createdAt: ago(23 * HOUR) },
    ])
    expect((await signup(register, ANA, "y", "ana")).status).toBe("ok")
    expect((await signup(register, ANA, "y", "ana-b")).status).toBe("ok")
    expect((await signup(register, ANA, "y", "ana-c")).status).toBe(
      "too many for account"
    )
  })

  it("allows 10 signups per network an hour across accounts", async () => {
    const register = await load(
      Array.from({ length: 10 }, (_, i) => ({
        did: `did:plc:${String.fromCharCode(97 + i).repeat(24)}`,
        ipHash: "shared",
        createdAt: ago(30 * 60 * 1000),
      }))
    )
    const result = await signup(register, BIA, "shared", "bia")
    expect(result.status).toBe("too many from network")
    expect(fakes.prisma.user.create).not.toHaveBeenCalled()

    expect((await signup(register, BIA, "elsewhere", "bia")).status).toBe("ok")
  })

  it("lets the network limit lapse after an hour", async () => {
    const register = await load(
      Array.from({ length: 10 }, () => ({
        did: ANA,
        ipHash: "shared",
        createdAt: ago(61 * 60 * 1000),
      }))
    )
    expect((await signup(register, BIA, "shared", "bia")).status).toBe("ok")
  })

  it("does not count rejected or repeated signups", async () => {
    const register = await load()
    await signup(register, ANA, "ip", "bolsonaro")
    await signup(register, ANA, "ip", "-bad")
    await signup(register, ANA, "ip", "ana")
    await signup(register, ANA, "ip", "ana")
    await signup(register, ANA, "ip", "ana")
    expect(fakes.attempts).toHaveLength(1)
    expect((await signup(register, ANA, "ip", "ana2")).status).toBe("ok")
  })

  it("drops log rows older than a day when it records a signup", async () => {
    const register = await load([
      { did: BIA, ipHash: "old", createdAt: ago(25 * HOUR) },
      { did: BIA, ipHash: "recent", createdAt: ago(HOUR) },
    ])
    await signup(register, ANA, "ip", "ana")
    expect(fakes.attempts.map((a) => a.ipHash).sort()).toEqual(["ip", "recent"])
  })
})

describe("hashIp", () => {
  it("keys on the first forwarded address and never returns the raw IP", async () => {
    vi.stubEnv("SESSION_SECRET", "s".repeat(32))
    const { hashIp } = await import("@/lib/rate-limit")
    const a = hashIp(
      new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" })
    )
    const b = hashIp(new Headers({ "x-forwarded-for": "203.0.113.7" }))
    const c = hashIp(new Headers({ "x-forwarded-for": "203.0.113.8" }))
    expect(a).toBe(b)
    expect(a).not.toBe(c)
    expect(a).not.toContain("203.0.113.7")
    expect(a).toMatch(/^[0-9a-f]{64}$/)
  })
})
