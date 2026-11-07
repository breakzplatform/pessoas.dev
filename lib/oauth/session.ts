import { cookies } from "next/headers"
import type {
  NodeSavedSession,
  NodeSavedState,
} from "@atproto/oauth-client-node"
import { getIronSession, type SessionOptions } from "iron-session"

export type StoredState = { value: NodeSavedState; expiresAt: number }

export interface OAuthCookie {
  did?: string
  states?: Record<string, StoredState>
  sessions?: Record<string, NodeSavedSession>
}

// The session only has to last through one signup.
const COOKIE_TTL_SECONDS = 60 * 60

function sessionPassword(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET must be set to a string of at least 32 characters"
    )
  }
  return secret
}

function cookieName(origin: string): string {
  const host = new URL(origin).hostname.toLowerCase()
  return `oauth_${host.replace(/[^a-z0-9]+/g, "_")}`
}

function sessionOptions(origin: string): SessionOptions {
  return {
    cookieName: cookieName(origin),
    password: sessionPassword(),
    ttl: COOKIE_TTL_SECONDS,
    // Host-only (no Domain attribute), so handle subdomains never see it.
    cookieOptions: {
      secure: new URL(origin).protocol === "https:",
      sameSite: "lax",
      httpOnly: true,
      path: "/",
    },
  }
}

export async function getOAuthCookie(origin: string) {
  return getIronSession<OAuthCookie>(await cookies(), sessionOptions(origin))
}

export interface SignedInAccount {
  did: string
  scope: string
}

/**
 * Who is signed in, read straight from the cookie. Safe in server components,
 * which cannot write cookies: it never refreshes tokens. Server actions that
 * act on the account must call `restoreSession` instead.
 */
export async function readSignedInAccount(
  origin: string
): Promise<SignedInAccount | null> {
  const cookie = await getOAuthCookie(origin)
  const session = cookie.did ? cookie.sessions?.[cookie.did] : undefined
  if (!cookie.did || !session) return null
  return { did: cookie.did, scope: session.tokenSet.scope ?? "" }
}
