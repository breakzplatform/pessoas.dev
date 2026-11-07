import { NextResponse, type NextRequest } from "next/server"

import { originFromHeaders } from "./origin"
import { safeReturnTo } from "./return-to"

export type LoginOutcome = "failed" | "denied"

/** The request's allowlisted origin, or a 400 response for any other host. */
export function originOr400(
  request: NextRequest
): { origin: string } | { response: NextResponse } {
  try {
    return { origin: originFromHeaders(request.headers) }
  } catch {
    return { response: new NextResponse("bad host", { status: 400 }) }
  }
}

export function redirectBack(
  origin: string,
  returnTo: string | null | undefined,
  login?: LoginOutcome
): NextResponse {
  const url = new URL(safeReturnTo(returnTo, origin), origin)
  if (login) url.searchParams.set("login", login)
  return NextResponse.redirect(url)
}

const DEFAULT_SERVICE = "https://bsky.social"

// Accepts "ana", "@ana", "ana.bsky.social", a custom domain or a DID. An empty
// field sends people to bsky.social, where they pick the account there.
export function loginInput(raw: string | null): string {
  const input = (raw ?? "").trim().replace(/^@/, "").toLowerCase()
  if (!input) return DEFAULT_SERVICE
  if (input.startsWith("did:") || input.includes(".")) return input
  return `${input}.bsky.social`
}
