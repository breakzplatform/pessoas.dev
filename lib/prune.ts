// Decides whether a registered handle can be pruned. Pure, so the rules are
// unit-tested apart from the network code in scripts/prune-handles.ts.
//
// The one hard rule: a row whose DID document still claims the handle is
// never removed, whatever the AppView says about the account.

export type DidDocument =
  | { status: "found"; alsoKnownAs: string[] }
  // plc.directory answers 404/410 for a tombstoned or unknown DID.
  | { status: "gone" }
  // Network failure, rate limit exhausted, malformed document...
  | { status: "error"; detail: string }

export type AccountState =
  | { status: "active" }
  | {
      status: "inactive"
      reason: "deleted" | "deactivated" | "takendown" | "not found"
    }
  | { status: "error"; detail: string }

export type Verdict =
  | { remove: false; reason: "claims handle" | "unknown" }
  | {
      remove: true
      reason: "handle not claimed" | "account gone and handle not claimed"
    }

export function claimsHandle(alsoKnownAs: string[], handle: string) {
  const target = `at://${handle}`.toLowerCase()
  return alsoKnownAs.some((alias) => alias.toLowerCase() === target)
}

export function decide(
  fullHandle: string,
  document: DidDocument,
  account: AccountState
): Verdict {
  if (document.status === "found") {
    return claimsHandle(document.alsoKnownAs, fullHandle)
      ? { remove: false, reason: "claims handle" }
      : { remove: true, reason: "handle not claimed" }
  }
  // Without a document there is no claim, but that alone is not proof: a
  // failed lookup looks the same. Only remove when the AppView agrees the
  // account is gone.
  if (document.status === "gone" && account.status === "inactive") {
    return { remove: true, reason: "account gone and handle not claimed" }
  }
  return { remove: false, reason: "unknown" }
}
