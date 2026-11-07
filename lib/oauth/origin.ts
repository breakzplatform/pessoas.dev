import { headers } from "next/headers"

import { isAllowedHost, isLoopbackHost } from "./hosts"

export class UntrustedHostError extends Error {
  constructor(host: string) {
    super(`untrusted host: ${JSON.stringify(host.slice(0, 100))}`)
    this.name = "UntrustedHostError"
  }
}

/**
 * The origin (`proto://host`) of a request, from its Host and
 * X-Forwarded-Proto headers. Only allowlisted hosts pass, so a forged Host can
 * never become an OAuth client_id, redirect target or cookie scope.
 * Non-loopback origins are always https.
 */
export function resolveOrigin(
  rawHost: string | null | undefined,
  rawProto: string | null | undefined
): string {
  const host = (rawHost ?? "").split(",")[0].trim().toLowerCase()
  const proto = (rawProto ?? "").split(",")[0].trim().toLowerCase()

  if (isLoopbackHost(host)) {
    return `${proto === "https" ? "https" : "http"}://${host}`
  }
  if (!isAllowedHost(host)) throw new UntrustedHostError(host)
  return `https://${host}`
}

export function originFromHeaders(h: Headers): string {
  return resolveOrigin(
    h.get("x-forwarded-host") ?? h.get("host"),
    h.get("x-forwarded-proto")
  )
}

export async function requestOrigin(): Promise<string> {
  return originFromHeaders(await headers())
}
