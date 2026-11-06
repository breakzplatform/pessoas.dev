import { headers } from "next/headers"

import { getDomain } from "@/lib/utils"

// Where links to this domain's pages should point from the current request:
// - on the domain itself the proxy adds the /{domain} segment, so "" works;
// - on a handle subdomain (ana.pessoas.dev) relative links would land on the
//   handle's routes, so they go to the bare domain;
// - on other hosts (localhost, *.vercel.app previews) nothing is rewritten and
//   pages live under /{domain}.
export async function basePath(domain: string) {
  const host = (await headers()).get("host")?.replace(/:\d+$/, "") ?? ""
  const current = getDomain(host)
  if (current.domain !== domain) return `/${domain}`
  const onHandle =
    current.subdomain && current.subdomain !== process.env.LANDING_SUBDOMAIN
  return onHandle ? `https://${domain}` : ""
}

export function homeHref(base: string) {
  return base === "" ? "/" : base
}
