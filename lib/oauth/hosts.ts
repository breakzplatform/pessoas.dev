import { siteConfig } from "@/config/site"

const LOOPBACK_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d{1,5})?$/i

export function isLoopbackHost(host: string): boolean {
  return LOOPBACK_HOST.test(host)
}

function listFromEnv(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
}

/**
 * Hosts that may run the sign-in flow, each with its own OAuth client_id:
 * the served domains (and their landing subdomain, if any), the Vercel
 * deployment and branch URLs of a preview, and any PREVIEW_HOSTS aliases.
 * Handle subdomains (ana.pessoas.dev) are never allowed.
 */
export function allowedHosts(env = process.env): Set<string> {
  const hosts = new Set<string>()
  for (const domain of siteConfig.domains) {
    hosts.add(domain)
    if (env.LANDING_SUBDOMAIN) hosts.add(`${env.LANDING_SUBDOMAIN}.${domain}`)
  }
  if (env.VERCEL_ENV === "preview") {
    for (const host of [env.VERCEL_URL, env.VERCEL_BRANCH_URL]) {
      if (host) hosts.add(host.toLowerCase())
    }
  }
  for (const host of listFromEnv(env.PREVIEW_HOSTS)) hosts.add(host)
  return hosts
}

export function isAllowedHost(host: string, env = process.env): boolean {
  return isLoopbackHost(host) || allowedHosts(env).has(host.toLowerCase())
}
