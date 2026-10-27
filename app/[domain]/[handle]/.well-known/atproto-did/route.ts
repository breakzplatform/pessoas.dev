import { findDid } from "@/lib/handles"

// Vercel's CDN serves repeat checks without invoking the function. A DID never
// changes for an existing handle (re-registering with another account is
// rejected), so a long TTL is safe. Misses are cached briefly so a handle
// probed right before signup starts verifying within a minute.
const FOUND_CACHE = "public, s-maxage=86400, stale-while-revalidate=604800"
const NOT_FOUND_CACHE = "public, s-maxage=60"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ domain: string; handle: string }> }
) {
  const { domain, handle } = await params
  const did = await findDid(domain, handle)

  if (!did) {
    return new Response("not found", {
      status: 404,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": NOT_FOUND_CACHE,
      },
    })
  }

  return new Response(did, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": FOUND_CACHE,
    },
  })
}
