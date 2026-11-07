import type { NextRequest } from "next/server"
import { OAuthCallbackError } from "@atproto/oauth-client-node"

import { getOAuthClient } from "@/lib/oauth/client"
import { originOr400, redirectBack } from "@/lib/oauth/routes"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const resolved = originOr400(request)
  if ("response" in resolved) return resolved.response
  const { origin } = resolved
  const params = new URLSearchParams(request.nextUrl.searchParams)

  try {
    const { state } = await getOAuthClient(origin).callback(params)
    return redirectBack(origin, state)
  } catch (error) {
    if (error instanceof OAuthCallbackError) {
      const denied = error.params.get("error") === "access_denied"
      return redirectBack(origin, error.state, denied ? "denied" : "failed")
    }
    console.error("oauth callback", error)
    return redirectBack(origin, null, "failed")
  }
}
