import { safeFetchWrap } from "@atproto-labs/fetch-node"
import {
  NodeOAuthClient,
  requestLocalLock,
  type OAuthSession,
} from "@atproto/oauth-client-node"

import { siteConfig } from "@/config/site"

import { isLoopbackHost } from "./hosts"
import { getSessionStore, getStateStore } from "./stores"

/** Proves which account is signing up. Grants no access to the account. */
export const BASE_SCOPE = "atproto"
/**
 * The narrowest permission that allows com.atproto.identity.updateHandle.
 * `transition:generic` does not cover identity changes.
 */
export const HANDLE_SCOPE = "identity:handle"
export const FULL_SCOPE = `${BASE_SCOPE} ${HANDLE_SCOPE}`

export function canUpdateHandle(scope: string): boolean {
  return scope.split(" ").includes(HANDLE_SCOPE)
}

/**
 * Handles and DIDs typed at sign-in make the server fetch metadata from
 * arbitrary hosts. This fetch refuses private, loopback and link-local
 * addresses, plain http and oversized responses.
 */
const oauthFetch = safeFetchWrap({
  allowImplicitRedirect: true,
  timeout: 10_000,
})

// RFC 8252 loopback clients must redirect to an IP literal, not "localhost".
export function canonicalOrigin(origin: string): string {
  return origin
    .replace(/\/$/, "")
    .replace(/^http:\/\/localhost(?=[:/]|$)/i, "http://127.0.0.1")
}

// The domain an origin serves, and where its pages live: at the root on the
// domain itself, under /{domain} on previews and localhost (see proxy.ts).
function siteFor(origin: string): { name: string; pages: string } {
  const host = new URL(origin).hostname
  const served = siteConfig.domains.find(
    (domain) => host === domain || host.endsWith(`.${domain}`)
  )
  if (served) return { name: served, pages: origin }
  const name = siteConfig.domains[0]
  return { name, pages: `${origin}/${name}` }
}

const clients = new Map<string, NodeOAuthClient>()

/** One OAuth client per origin, each with its own client_id. */
export function getOAuthClient(origin: string): NodeOAuthClient {
  const base = canonicalOrigin(origin)
  const cached = clients.get(base)
  if (cached) return cached

  const redirectUri = `${base}/api/oauth/callback` as
    `https://${string}` | `http://127.0.0.1${string}`
  const loopback = isLoopbackHost(new URL(base).host)
  if (!loopback && !base.startsWith("https://")) {
    throw new Error(`OAuth needs https outside loopback: ${base}`)
  }

  const site = siteFor(base)
  const client = new NodeOAuthClient({
    fetch: oauthFetch,
    clientMetadata: {
      // A loopback client_id carries its own metadata; others are served
      // from /client-metadata.json on the same origin.
      client_id: loopback
        ? `http://localhost?${new URLSearchParams({ redirect_uri: redirectUri, scope: FULL_SCOPE })}`
        : `${base}/client-metadata.json`,
      client_name: site.name,
      // Must be a parent URL of client_id, so the origin, not site.pages.
      client_uri: base,
      logo_uri: `${base}/favicon.svg`,
      policy_uri: `${site.pages}/privacidade`,
      redirect_uris: [redirectUri],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      scope: FULL_SCOPE,
      application_type: "web",
      token_endpoint_auth_method: "none",
      dpop_bound_access_tokens: true,
    },
    // Sessions live in one browser's cookie and are used for a few requests,
    // so a per-instance lock is enough to avoid concurrent token refreshes.
    requestLock: requestLocalLock,
    stateStore: getStateStore(base),
    sessionStore: getSessionStore(base),
  })

  clients.set(base, client)
  return client
}

/**
 * The live OAuth session of the signed-in account, refreshing tokens if
 * needed, or null. Only for server actions and route handlers.
 */
export async function restoreSession(
  origin: string,
  did: string
): Promise<OAuthSession | null> {
  try {
    return await getOAuthClient(origin).restore(did)
  } catch {
    return null
  }
}
