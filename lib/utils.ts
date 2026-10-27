import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import { siteConfig } from "@/config/site"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Hosts outside the served domains (localhost, *.vercel.app previews) get no
// domain, so their paths are routed as-is: /pessoas.dev/<handle>/... works.
export function getDomain(host: string) {
  host = host.toLowerCase()
  const domain = siteConfig.domains.find(
    (name) => host === name || host.endsWith(`.${name}`)
  )
  if (!domain) return { domain: null, subdomain: null }
  const subdomain = host === domain ? null : host.slice(0, -domain.length - 1)
  return { domain, subdomain }
}
