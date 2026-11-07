import { getOAuthClient } from "./client"
import { getOAuthCookie } from "./session"

/** Revokes the tokens at the user's server and deletes the cookie. */
export async function endSession(origin: string): Promise<void> {
  const cookie = await getOAuthCookie(origin)
  if (cookie.did) {
    try {
      await getOAuthClient(origin).revoke(cookie.did)
    } catch (error) {
      console.error("oauth revoke", error)
    }
  }
  cookie.destroy()
}
