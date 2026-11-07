"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { Agent } from "@atproto/api"

import { prisma } from "@/lib/db"
import { canUpdateHandle, restoreSession } from "@/lib/oauth/client"
import { endSession } from "@/lib/oauth/end-session"
import { requestOrigin } from "@/lib/oauth/origin"
import { safeReturnTo } from "@/lib/oauth/return-to"
import { readSignedInAccount } from "@/lib/oauth/session"
import { hashIp } from "@/lib/rate-limit"
import { register } from "@/lib/register"

export type SwitchStatus = "done" | "failed" | "expired"

async function liveSession(origin: string) {
  const account = await readSignedInAccount(origin)
  return account ? restoreSession(origin, account.did) : null
}

async function grantedScope(
  session: NonNullable<Awaited<ReturnType<typeof liveSession>>>
) {
  try {
    return (await session.getTokenInfo(false)).scope
  } catch {
    return ""
  }
}

// Back to the domain's home page. The target must be an absolute path: a
// bare "?query" fails to resolve when the action has also set cookies.
function backHome(
  formData: FormData,
  origin: string,
  query: Record<string, string>
): never {
  const home = safeReturnTo(String(formData.get("return_to") ?? ""), origin)
  const search = new URLSearchParams(query).toString()
  redirect(search ? `${home}?${search}` : home)
}

export async function registerHandle(formData: FormData) {
  const domain = String(formData.get("domain") ?? "")
  const origin = await requestOrigin()
  // Only the session decides whose DID gets the handle; any DID or handle
  // field in the form is ignored.
  const session = await liveSession(origin)

  const { status, handle } = await register({
    domain,
    did: session?.did ?? null,
    ipHash: hashIp(await headers()),
    requested: String(formData.get("new-handle") ?? ""),
  })

  // Without identity:handle the session has nothing left to do.
  if (
    status === "ok" &&
    session &&
    !canUpdateHandle(await grantedScope(session))
  ) {
    await endSession(origin)
  }

  backHome(formData, origin, { "new-handle": handle, result: status })
}

export async function switchHandle(formData: FormData) {
  const domain = String(formData.get("domain") ?? "").toLowerCase()
  const handle = String(formData.get("new-handle") ?? "").toLowerCase()
  const origin = await requestOrigin()
  const back = (status: SwitchStatus) =>
    backHome(formData, origin, {
      "new-handle": handle,
      result: "ok",
      switch: status,
    })

  const session = await liveSession(origin)
  if (!session || !canUpdateHandle(await grantedScope(session))) {
    return back("expired")
  }

  // The session may only move the account to a handle this site has
  // registered for that same account.
  const suffix = `.${domain}`
  const name = handle.endsWith(suffix) ? handle.slice(0, -suffix.length) : ""
  const row = name
    ? await prisma.user.findFirst({
        where: { handle: name, domain: { name: domain } },
      })
    : null
  if (!row || row.did !== session.did) return back("failed")

  try {
    await new Agent(session).com.atproto.identity.updateHandle({ handle })
  } catch (error) {
    console.error("updateHandle", error)
    return back("failed")
  }
  await endSession(origin)
  return back("done")
}

export async function signOut(formData: FormData) {
  const origin = await requestOrigin()
  await endSession(origin)
  const handle = String(formData.get("new-handle") ?? "")
  backHome(
    formData,
    origin,
    handle ? { "new-handle": handle, result: "ok" } : {}
  )
}
