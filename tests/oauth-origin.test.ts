import { afterEach, describe, expect, it, vi } from "vitest"

import { isAllowedHost } from "@/lib/oauth/hosts"
import { resolveOrigin } from "@/lib/oauth/origin"
import { safeReturnTo } from "@/lib/oauth/return-to"
import { loginInput } from "@/lib/oauth/routes"

describe("OAuth origin allowlist", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it.each([
    ["pessoas.dev", "https://pessoas.dev"],
    ["ceuazul.online", "https://ceuazul.online"],
    ["PESSOAS.DEV", "https://pessoas.dev"],
    ["localhost:3000", "http://localhost:3000"],
    ["127.0.0.1:3000", "http://127.0.0.1:3000"],
  ])("accepts %s as %s", (host, origin) => {
    expect(resolveOrigin(host, "http")).toBe(origin)
  })

  it.each([
    "evil.example",
    "pessoas.dev.evil.example",
    "ana.pessoas.dev",
    "notpessoas.dev",
    "pessoas-dev-abc.vercel.app",
    "",
  ])("rejects %j", (host) => {
    expect(() => resolveOrigin(host, "https")).toThrow(/untrusted host/)
  })

  it("accepts a preview's own deployment and branch URLs only on previews", () => {
    vi.stubEnv("VERCEL_URL", "pessoas-dev-abc.vercel.app")
    vi.stubEnv("VERCEL_BRANCH_URL", "pessoas-dev-git-x.vercel.app")
    vi.stubEnv("VERCEL_ENV", "production")
    expect(isAllowedHost("pessoas-dev-abc.vercel.app")).toBe(false)

    vi.stubEnv("VERCEL_ENV", "preview")
    expect(isAllowedHost("pessoas-dev-abc.vercel.app")).toBe(true)
    expect(isAllowedHost("pessoas-dev-git-x.vercel.app")).toBe(true)
    expect(isAllowedHost("pessoas-dev-other.vercel.app")).toBe(false)
  })

  it("accepts the landing subdomain and PREVIEW_HOSTS aliases", () => {
    vi.stubEnv("LANDING_SUBDOMAIN", "www")
    vi.stubEnv("PREVIEW_HOSTS", "staging.example.org, other.example.org")
    expect(isAllowedHost("www.pessoas.dev")).toBe(true)
    expect(isAllowedHost("www.ceuazul.online")).toBe(true)
    expect(isAllowedHost("staging.example.org")).toBe(true)
    expect(isAllowedHost("ana.pessoas.dev")).toBe(false)
  })

  it("forces https outside loopback, whatever the forwarded proto says", () => {
    expect(resolveOrigin("pessoas.dev", "http")).toBe("https://pessoas.dev")
  })

  it("uses only the first value of a comma-joined header", () => {
    expect(resolveOrigin("pessoas.dev, evil.example", "https")).toBe(
      "https://pessoas.dev"
    )
    expect(() => resolveOrigin("evil.example, pessoas.dev", "https")).toThrow()
  })
})

describe("safeReturnTo", () => {
  const origin = "https://pessoas.dev"
  it.each([
    ["/", "/"],
    ["/pessoas.dev", "/pessoas.dev"],
    ["/pessoas.dev?x=1", "/pessoas.dev?x=1"],
    ["https://evil.example/", "/"],
    ["//evil.example/", "/"],
    ["/\\evil.example/", "/"],
    ["javascript:alert(1)", "/"],
    [null, "/"],
  ])("%j -> %j", (raw, expected) => {
    expect(safeReturnTo(raw, origin)).toBe(expected)
  })
})

describe("loginInput", () => {
  it.each([
    ["ana", "ana.bsky.social"],
    ["@Ana.bsky.social ", "ana.bsky.social"],
    ["ana.pessoas.dev", "ana.pessoas.dev"],
    ["did:plc:abc", "did:plc:abc"],
    ["", "https://bsky.social"],
    [null, "https://bsky.social"],
  ])("%j -> %j", (raw, expected) => {
    expect(loginInput(raw)).toBe(expected)
  })
})

describe("client metadata", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it.each([
    ["https://pessoas.dev", "https://pessoas.dev/privacidade"],
    [
      "https://pessoas-dev-abc.vercel.app",
      "https://pessoas-dev-abc.vercel.app/pessoas.dev/privacidade",
    ],
  ])(
    "serves a client_id under client_uri for %s",
    async (origin, policy) => {
      vi.stubEnv("SESSION_SECRET", "s".repeat(32))
      const { getOAuthClient } = await import("@/lib/oauth/client")
      const metadata = getOAuthClient(origin).clientMetadata
      expect(metadata.client_id).toBe(`${origin}/client-metadata.json`)
      expect(metadata.client_uri).toBe(origin)
      expect(metadata.client_id.startsWith(`${metadata.client_uri}/`)).toBe(
        true
      )
      expect(metadata.redirect_uris).toEqual([`${origin}/api/oauth/callback`])
      expect(metadata.policy_uri).toBe(policy)
      expect(metadata.scope).toBe("atproto identity:handle")
    },
    30_000
  )
})
