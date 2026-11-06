import { describe, expect, it } from "vitest"

import {
  claimsHandle,
  decide,
  type AccountState,
  type DidDocument,
} from "@/lib/prune"

const HANDLE = "ana.pessoas.dev"
const claiming: DidDocument = {
  status: "found",
  alsoKnownAs: ["at://ana.pessoas.dev"],
}
const moved: DidDocument = {
  status: "found",
  alsoKnownAs: ["at://ana.bsky.social"],
}
const gone: DidDocument = { status: "gone" }
const failed: DidDocument = { status: "error", detail: "timeout" }

const active: AccountState = { status: "active" }
const deleted: AccountState = { status: "inactive", reason: "deleted" }
const takendown: AccountState = { status: "inactive", reason: "takendown" }
const unknown: AccountState = { status: "error", detail: "500" }

describe("claimsHandle", () => {
  it("matches the at:// alias ignoring case", () => {
    expect(claimsHandle(["at://Ana.Pessoas.dev"], HANDLE)).toBe(true)
  })

  it("does not match a longer or partial handle", () => {
    expect(claimsHandle(["at://ana.pessoas.dev.evil.com"], HANDLE)).toBe(false)
    expect(claimsHandle(["at://xana.pessoas.dev"], HANDLE)).toBe(false)
    expect(claimsHandle(["ana.pessoas.dev"], HANDLE)).toBe(false)
  })
})

describe("decide", () => {
  it.each([active, deleted, takendown, unknown])(
    "never removes a row whose DID document claims the handle (%j)",
    (account) => {
      expect(decide(HANDLE, claiming, account)).toEqual({
        remove: false,
        reason: "claims handle",
      })
    }
  )

  it.each([active, deleted, unknown])(
    "removes when the DID document no longer claims the handle (%j)",
    (account) => {
      expect(decide(HANDLE, moved, account)).toEqual({
        remove: true,
        reason: "handle not claimed",
      })
    }
  )

  it("removes a gone DID only when the AppView says the account is gone", () => {
    expect(decide(HANDLE, gone, deleted).remove).toBe(true)
    expect(decide(HANDLE, gone, takendown).remove).toBe(true)
    expect(decide(HANDLE, gone, active).remove).toBe(false)
    expect(decide(HANDLE, gone, unknown).remove).toBe(false)
  })

  it.each([active, deleted, takendown, unknown])(
    "keeps the row when the DID document could not be read (%j)",
    (account) => {
      expect(decide(HANDLE, failed, account)).toEqual({
        remove: false,
        reason: "unknown",
      })
    }
  )
})
