import { NextResponse, type NextRequest } from "next/server"

import { getDomain } from "@/lib/utils"

export function proxy(request: NextRequest) {
  const url = new URL(request.url)
  // request.url can carry the server's own address instead of the requested
  // host (it does under `next start` on Next 16), so read the Host header.
  const host = request.headers.get("host")?.replace(/:\d+$/, "") ?? url.hostname

  const { domain, subdomain } = getDomain(host)

  if (domain) {
    if (subdomain && subdomain !== process.env.LANDING_SUBDOMAIN) {
      return NextResponse.rewrite(
        new URL(`/${domain}/${subdomain}${url.pathname}${url.search}`, url)
      )
    } else {
      return NextResponse.rewrite(
        new URL(`/${domain}${url.pathname}${url.search}`, url)
      )
    }
  }
}

export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. all root files inside /public (e.g. /favicon.ico)
     * 4. opengraph images (e.g. /[a-z0-9-_.]/[a-z0-9-_]/opengraph-image)
     */
    "/((?!api/|_next/|_static/|[\\w-]+\\.\\w+|[a-zA-Z0-9-_.]+/[a-zA-Z0-9-_]+/opengraph-image).*)",
  ],
}
