import type { Metadata } from "next"

import { copyFor } from "@/config/site"

// One social image per site, in public/ (see scripts/og/). Root-level file
// names with a dot are skipped by the proxy matcher, so they are served as-is.
export function shareImage(domain: string) {
  return `/og-${domain.replace(/\./g, "-")}.png`
}

export function pageMetadata(
  domain: string,
  heading: string,
  description: string
): Metadata {
  const title = `${heading} • ${domain}`
  const images = [
    {
      url: shareImage(domain),
      width: 1200,
      height: 630,
      alt: `${copyFor(domain).name}: ${copyFor(domain).shareLine}`,
    },
  ]
  return {
    metadataBase: new URL(`https://${domain}`),
    title,
    description,
    openGraph: {
      title,
      description,
      images,
      siteName: domain,
      locale: "pt_BR",
    },
    twitter: { card: "summary_large_image", title, description, images },
  }
}
