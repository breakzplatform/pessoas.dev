import { NextRequest } from "next/server"
import { proxy } from "@/proxy"
import { describe, expect, it } from "vitest"

function rewriteOf(host: string, path: string) {
  const request = new NextRequest(`http://localhost:3000${path}`, {
    headers: { host },
  })
  return proxy(request)?.headers.get("x-middleware-rewrite")
}

describe("proxy", () => {
  it("routes a handle subdomain to its domain and handle segments", () => {
    expect(rewriteOf("maria.pessoas.dev", "/.well-known/atproto-did")).toBe(
      "http://localhost:3000/pessoas.dev/maria/.well-known/atproto-did"
    )
  })

  it("routes the bare domain to the domain segment", () => {
    expect(rewriteOf("ceuazul.online", "/pessoas")).toBe(
      "http://localhost:3000/ceuazul.online/pessoas"
    )
  })

  it("keeps the query string", () => {
    expect(rewriteOf("pessoas.dev:443", "/?handle=ana")).toBe(
      "http://localhost:3000/pessoas.dev/?handle=ana"
    )
  })
})

describe("proxy on hosts outside the served domains", () => {
  it("leaves preview and local paths untouched", () => {
    expect(
      rewriteOf("pessoas-dev-git-x.vercel.app", "/pessoas.dev/maria")
    ).toBeUndefined()
    expect(rewriteOf("localhost:3000", "/pessoas.dev/maria")).toBeUndefined()
  })

  it("does not treat a lookalike domain as served", () => {
    expect(rewriteOf("maria.notpessoas.dev", "/")).toBeUndefined()
  })
})
