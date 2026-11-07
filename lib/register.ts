import { updateTag } from "next/cache"

import { siteConfig } from "@/config/site"
import { prisma } from "@/lib/db"
import { HANDLES_TAG } from "@/lib/handles"
import { exceededLimit, recordRegistration } from "@/lib/rate-limit"
import { hasExplicitSlur } from "@/lib/slurs"

export type RegisterStatus =
  | "ok"
  | "handle taken"
  | "invalid handle"
  | "invalid domain"
  | "not signed in"
  | "slur"
  | "reserved"
  | "too many for account"
  | "too many from network"

export interface RegisterResult {
  status: RegisterStatus
  handle: string
}

const RESERVED = ["joselito"]

// Page routes on every domain: a handle subdomain with one of these names
// would be routed to the page instead of to its atproto-did.
const ROUTE_NAMES = ["pessoas", "perguntas", "privacidade", "privacy"]

const BLOCKED = ["bolsonaro", "trump"]

// A single DNS label, as atproto handles require: no underscores, no leading
// or trailing hyphen, at most 63 characters.
const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/

const DID = /^did:(plc:[a-z2-7]{24}|web:[a-z0-9.:%-]+)$/

/**
 * Points {requested}.{domain} at `did`. The DID must come from the signed-in
 * OAuth session, never from the form: that is what proves the person owns
 * the account the handle will resolve to.
 */
export async function register({
  domain,
  did,
  ipHash,
  requested,
}: {
  domain: string
  did: string | null
  ipHash: string
  requested: string
}): Promise<RegisterResult> {
  domain = domain.toLowerCase()
  let fullHandle = requested.trim().toLowerCase()
  if (fullHandle && !fullHandle.includes(".")) fullHandle += `.${domain}`
  const reply = (status: RegisterStatus) => ({ status, handle: fullHandle })

  if (!siteConfig.domains.includes(domain)) return reply("invalid domain")

  const suffix = `.${domain}`
  const handle = fullHandle.endsWith(suffix)
    ? fullHandle.slice(0, -suffix.length)
    : ""
  if (!LABEL.test(handle)) return reply("invalid handle")
  if (hasExplicitSlur(handle) || BLOCKED.includes(handle)) return reply("slur")
  if (
    ROUTE_NAMES.includes(handle) ||
    (domain === "pessoas.dev" && RESERVED.includes(handle))
  ) {
    return reply("reserved")
  }

  if (!did || !DID.test(did)) return reply("not signed in")

  const existing = await prisma.user.findFirst({
    where: { handle, domain: { name: domain } },
  })
  if (existing) return reply(existing.did === did ? "ok" : "handle taken")

  const limitedBy = await exceededLimit({ did, ipHash })
  if (limitedBy === "did") return reply("too many for account")
  if (limitedBy === "ip") return reply("too many from network")

  try {
    await prisma.user.create({
      data: {
        handle,
        did,
        domain: {
          connectOrCreate: {
            where: { name: domain },
            create: { name: domain },
          },
        },
      },
    })
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return reply("handle taken")
    }
    throw error
  }

  await recordRegistration({ did, ipHash })
  updateTag(HANDLES_TAG)
  return reply("ok")
}
