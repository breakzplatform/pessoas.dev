import { createHash, timingSafeEqual } from "node:crypto"
import { revalidateTag } from "next/cache"

import { HANDLES_TAG } from "@/lib/handles"

const digest = (value: string) => createHash("sha256").update(value).digest()

// Lets scripts/prune-handles.ts drop the cached handle table after it deletes
// rows. Disabled unless REVALIDATE_SECRET is set.
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET
  const auth = request.headers.get("authorization") ?? ""
  if (!secret || !timingSafeEqual(digest(auth), digest(`Bearer ${secret}`))) {
    return new Response("forbidden", { status: 403 })
  }
  revalidateTag(HANDLES_TAG, { expire: 0 })
  return Response.json({ revalidated: HANDLES_TAG })
}
