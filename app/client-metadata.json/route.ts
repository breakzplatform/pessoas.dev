import { NextResponse, type NextRequest } from "next/server"

import { getOAuthClient } from "@/lib/oauth/client"
import { originOr400 } from "@/lib/oauth/routes"

export const dynamic = "force-dynamic"

export function GET(request: NextRequest) {
  const resolved = originOr400(request)
  if ("response" in resolved) return resolved.response
  return NextResponse.json(getOAuthClient(resolved.origin).clientMetadata)
}
