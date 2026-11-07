import type {
  NodeSavedSession,
  NodeSavedSessionStore,
  NodeSavedState,
  NodeSavedStateStore,
} from "@atproto/oauth-client-node"

import { getOAuthCookie, type StoredState } from "./session"

const STATE_TTL_MS = 10 * 60 * 1000

function unexpired(
  states: Record<string, StoredState> | undefined,
  now: number
): Record<string, StoredState> {
  return Object.fromEntries(
    Object.entries(states ?? {}).filter(([, entry]) => entry?.expiresAt > now)
  )
}

export function getStateStore(origin: string): NodeSavedStateStore {
  return {
    async get(key: string): Promise<NodeSavedState | undefined> {
      const entry = (await getOAuthCookie(origin)).states?.[key]
      if (!entry || entry.expiresAt <= Date.now()) return undefined
      return entry.value
    },
    async set(key: string, value: NodeSavedState): Promise<void> {
      const cookie = await getOAuthCookie(origin)
      const now = Date.now()
      cookie.states = {
        ...unexpired(cookie.states, now),
        [key]: { value, expiresAt: now + STATE_TTL_MS },
      }
      await cookie.save()
    },
    async del(key: string): Promise<void> {
      const cookie = await getOAuthCookie(origin)
      if (!cookie.states || !(key in cookie.states)) return
      const { [key]: _removed, ...rest } = cookie.states
      cookie.states = rest
      await cookie.save()
    },
  }
}

// One account at a time: signing in again replaces the previous session.
export function getSessionStore(origin: string): NodeSavedSessionStore {
  return {
    async get(key: string): Promise<NodeSavedSession | undefined> {
      return (await getOAuthCookie(origin)).sessions?.[key]
    },
    async set(key: string, value: NodeSavedSession): Promise<void> {
      const cookie = await getOAuthCookie(origin)
      cookie.sessions = { [key]: value }
      cookie.did = key
      await cookie.save()
    },
    async del(key: string): Promise<void> {
      const cookie = await getOAuthCookie(origin)
      if (cookie.sessions?.[key]) {
        const { [key]: _removed, ...rest } = cookie.sessions
        cookie.sessions = rest
      }
      if (cookie.did === key) delete cookie.did
      await cookie.save()
    },
  }
}
