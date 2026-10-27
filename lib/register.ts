import { updateTag } from "next/cache"

import { siteConfig } from "@/config/site"
import { agent } from "@/lib/atproto"
import { prisma } from "@/lib/db"
import { HANDLES_TAG } from "@/lib/handles"
import { hasExplicitSlur } from "@/lib/slurs"

export type RegisterStatus =
  | "ok"
  | "handle taken"
  | "invalid handle"
  | "invalid domain"
  | "account not found"
  | "slur"
  | "reserved"

export interface RegisterResult {
  status: RegisterStatus
  handle: string
}

const RESERVED = ["joselito"]

const BLOCKED = ["bolsonaro", "trump"]

// A single DNS label, as atproto handles require: no underscores, no leading
// or trailing hyphen, at most 63 characters.
const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/

export async function register({
  domain,
  actor,
  requested,
}: {
  domain: string
  actor: string
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
  if (domain === "pessoas.dev" && RESERVED.includes(handle)) {
    return reply("reserved")
  }

  let did: string
  try {
    const profile = await agent.getProfile({ actor })
    did = profile.data.did
  } catch {
    return reply("account not found")
  }

  const existing = await prisma.user.findFirst({
    where: { handle, domain: { name: domain } },
  })
  if (existing) return reply(existing.did === did ? "ok" : "handle taken")

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

  updateTag(HANDLES_TAG)
  return reply("ok")
}
