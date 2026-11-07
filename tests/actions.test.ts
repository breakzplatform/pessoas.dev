import { beforeEach, describe, expect, it, vi } from "vitest"

import { createFakes } from "./fakes"

const ANA = `did:plc:${"ana".repeat(8)}`
const MARIA = `did:plc:${"maria".repeat(5).slice(0, 24)}`

const fakes = vi.hoisted(() => ({}) as ReturnType<typeof createFakes>)
const state = vi.hoisted(() => ({
  account: null as { did: string; scope: string } | null,
  session: null as {
    did: string
    getTokenInfo: () => Promise<{ scope: string }>
  } | null,
  updateHandle: vi.fn(),
  endSession: vi.fn(),
}))

class Redirect extends Error {
  constructor(readonly url: string) {
    super(url)
  }
}

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
vi.mock("next/headers", () => ({
  headers: async () =>
    new Headers({ host: "pessoas.dev", "x-forwarded-for": "203.0.113.7" }),
}))
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Redirect(url)
  },
}))
vi.mock("@/lib/oauth/session", () => ({
  readSignedInAccount: async () => state.account,
}))
vi.mock("@/lib/oauth/end-session", () => ({
  endSession: (...args: unknown[]) => state.endSession(...args),
}))
vi.mock("@/lib/oauth/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/oauth/client")>()),
  restoreSession: async () => state.session,
}))
vi.mock("@atproto/api", () => ({
  Agent: class {
    com = {
      atproto: { identity: { updateHandle: state.updateHandle } },
    }
  },
}))

function signIn(did: string, scope: string) {
  state.account = { did, scope }
  state.session = { did, getTokenInfo: async () => ({ scope }) }
}

function form(fields: Record<string, string>) {
  const data = new FormData()
  for (const [key, value] of Object.entries(fields)) data.set(key, value)
  return data
}

async function run(action: () => Promise<unknown>) {
  try {
    await action()
  } catch (error) {
    if (!(error instanceof Redirect)) throw error
    // A bare "?query" breaks in production when the action set cookies.
    expect(error.url).toMatch(/^\//)
    return new URL(error.url, "https://pessoas.dev").searchParams
  }
  throw new Error("expected a redirect")
}

async function load() {
  vi.resetModules()
  Object.assign(
    fakes,
    createFakes([{ handle: "maria", did: MARIA, domain: "pessoas.dev" }])
  )
  state.account = null
  state.session = null
  state.updateHandle.mockReset()
  state.endSession.mockReset()
  vi.stubEnv("SESSION_SECRET", "s".repeat(32))
  return import("@/app/[domain]/actions")
}

describe("registerHandle", () => {
  let actions: Awaited<ReturnType<typeof load>>
  // The first import pulls in the whole OAuth client; give it room.
  beforeEach(async () => {
    actions = await load()
  }, 30_000)

  it("registers the signed-in account's DID and ignores DIDs or handles in the form", async () => {
    signIn(ANA, "atproto identity:handle")
    const query = await run(() =>
      actions.registerHandle(
        form({
          domain: "pessoas.dev",
          "new-handle": "ana",
          did: MARIA,
          handle: "maria.bsky.social",
        })
      )
    )
    expect(query.get("result")).toBe("ok")
    expect(fakes.rows.find((r) => r.handle === "ana")?.did).toBe(ANA)
  })

  it("returns to the domain's home path, never to another origin", async () => {
    signIn(ANA, "atproto")
    const target = async (returnTo: string) => {
      try {
        await actions.registerHandle(
          form({
            domain: "pessoas.dev",
            "new-handle": "ana",
            return_to: returnTo,
          })
        )
      } catch (error) {
        if (error instanceof Redirect) return error.url.split("?")[0]
        throw error
      }
    }
    expect(await target("/pessoas.dev")).toBe("/pessoas.dev")
    expect(await target("https://evil.example/")).toBe("/")
    expect(await target("//evil.example")).toBe("/")
  })

  it("refuses to register when nobody is signed in", async () => {
    const query = await run(() =>
      actions.registerHandle(
        form({ domain: "pessoas.dev", "new-handle": "ana", did: ANA })
      )
    )
    expect(query.get("result")).toBe("not signed in")
    expect(fakes.prisma.user.create).not.toHaveBeenCalled()
  })

  it("refuses when the cookie names an account whose session cannot be restored", async () => {
    state.account = { did: ANA, scope: "atproto" }
    const query = await run(() =>
      actions.registerHandle(
        form({ domain: "pessoas.dev", "new-handle": "ana" })
      )
    )
    expect(query.get("result")).toBe("not signed in")
  })

  it("cannot take a handle another account holds", async () => {
    signIn(ANA, "atproto")
    const query = await run(() =>
      actions.registerHandle(
        form({ domain: "pessoas.dev", "new-handle": "maria" })
      )
    )
    expect(query.get("result")).toBe("handle taken")
    expect(fakes.rows.find((r) => r.handle === "maria")?.did).toBe(MARIA)
  })

  it("closes the session right away when it cannot change the handle", async () => {
    signIn(ANA, "atproto")
    await run(() =>
      actions.registerHandle(
        form({ domain: "pessoas.dev", "new-handle": "ana" })
      )
    )
    expect(state.endSession).toHaveBeenCalledOnce()
  })

  it("keeps the session for the handle switch when identity:handle was granted", async () => {
    signIn(ANA, "atproto identity:handle")
    await run(() =>
      actions.registerHandle(
        form({ domain: "pessoas.dev", "new-handle": "ana" })
      )
    )
    expect(state.endSession).not.toHaveBeenCalled()
  })
})

describe("switchHandle", () => {
  let actions: Awaited<ReturnType<typeof load>>
  // The first import pulls in the whole OAuth client; give it room.
  beforeEach(async () => {
    actions = await load()
  }, 30_000)

  const switchTo = (handle: string) =>
    run(() =>
      actions.switchHandle(
        form({ domain: "pessoas.dev", "new-handle": handle })
      )
    )

  it("updates the handle with the OAuth session and then ends it", async () => {
    signIn(MARIA, "atproto identity:handle")
    const query = await switchTo("maria.pessoas.dev")
    expect(state.updateHandle).toHaveBeenCalledWith({
      handle: "maria.pessoas.dev",
    })
    expect(query.get("switch")).toBe("done")
    expect(state.endSession).toHaveBeenCalledOnce()
  })

  it("will not move an account to a handle registered to someone else", async () => {
    signIn(ANA, "atproto identity:handle")
    const query = await switchTo("maria.pessoas.dev")
    expect(query.get("switch")).toBe("failed")
    expect(state.updateHandle).not.toHaveBeenCalled()
  })

  it("will not move an account to a handle this site has not registered", async () => {
    signIn(ANA, "atproto identity:handle")
    expect((await switchTo("ana.pessoas.dev")).get("switch")).toBe("failed")
    expect((await switchTo("maria.bsky.social")).get("switch")).toBe("failed")
    expect(state.updateHandle).not.toHaveBeenCalled()
  })

  it("falls back to the manual steps without the identity:handle scope", async () => {
    signIn(MARIA, "atproto")
    const query = await switchTo("maria.pessoas.dev")
    expect(query.get("switch")).toBe("expired")
    expect(state.updateHandle).not.toHaveBeenCalled()
  })

  it("reports a refused update and keeps the session for a retry", async () => {
    signIn(MARIA, "atproto identity:handle")
    state.updateHandle.mockRejectedValueOnce(
      new Error("handle does not resolve")
    )
    const query = await switchTo("maria.pessoas.dev")
    expect(query.get("switch")).toBe("failed")
    expect(state.endSession).not.toHaveBeenCalled()
  })
})
