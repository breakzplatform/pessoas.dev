import { NextResponse, type NextRequest } from "next/server"

import {
  BASE_SCOPE,
  canonicalOrigin,
  FULL_SCOPE,
  getOAuthClient,
} from "@/lib/oauth/client"
import { safeReturnTo } from "@/lib/oauth/return-to"
import { loginInput, originOr400, redirectBack } from "@/lib/oauth/routes"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const resolved = originOr400(request)
  if ("response" in resolved) return resolved.response
  const { origin } = resolved

  // Loopback clients must use 127.0.0.1; move the browser there first so the
  // state cookie is set on the host the callback comes back to.
  const canonical = canonicalOrigin(origin)
  if (canonical !== origin) {
    return NextResponse.redirect(
      new URL(request.nextUrl.pathname + request.nextUrl.search, canonical)
    )
  }

  const params = request.nextUrl.searchParams
  const returnTo = safeReturnTo(params.get("return_to"), origin)
  const client = getOAuthClient(origin)
  const input = loginInput(params.get("handle"))

  // A server that does not know identity:handle yet still lets people sign
  // in; they then change the handle on Bluesky by hand.
  for (const scope of [FULL_SCOPE, BASE_SCOPE]) {
    try {
      const url = await client.authorize(input, { scope, state: returnTo })
      return NextResponse.redirect(url)
    } catch (error) {
      console.error("oauth authorize", scope, error)
    }
  }
  return redirectBack(origin, returnTo, "failed")
}
