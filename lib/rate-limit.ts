import { createHmac } from "node:crypto"

import { prisma } from "@/lib/db"

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

export const LIMITS = {
  did: { max: 3, windowMs: DAY },
  ip: { max: 10, windowMs: HOUR },
} as const

export type LimitedBy = keyof typeof LIMITS

export interface Requester {
  did: string
  ipHash: string
}

/**
 * The client IP as a keyed hash, so the table never holds a raw IP. On Vercel
 * the first x-forwarded-for entry is set by the platform, not the client.
 */
export function hashIp(headers: Headers): string {
  const ip =
    headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    headers.get("x-real-ip")?.trim() ||
    "unknown"
  const secret = process.env.SESSION_SECRET ?? ""
  return createHmac("sha256", `rate-limit:${secret}`).update(ip).digest("hex")
}

/** Which limit a new signup would exceed, or null if it may go ahead. */
export async function exceededLimit(
  { did, ipHash }: Requester,
  now = new Date()
): Promise<LimitedBy | null> {
  const since = (windowMs: number) => new Date(now.getTime() - windowMs)
  const [byDid, byIp] = await Promise.all([
    prisma.registration.count({
      where: { did, createdAt: { gte: since(LIMITS.did.windowMs) } },
    }),
    prisma.registration.count({
      where: { ipHash, createdAt: { gte: since(LIMITS.ip.windowMs) } },
    }),
  ])
  if (byDid >= LIMITS.did.max) return "did"
  if (byIp >= LIMITS.ip.max) return "ip"
  return null
}

/** Logs a signup and drops rows older than the longest window. */
export async function recordRegistration(
  { did, ipHash }: Requester,
  now = new Date()
): Promise<void> {
  await prisma.registration.create({ data: { did, ipHash, createdAt: now } })
  await prisma.registration.deleteMany({
    where: { createdAt: { lt: new Date(now.getTime() - DAY) } },
  })
}
