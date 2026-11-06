export type SiteConfig = typeof siteConfig

export interface DomainCopy {
  name: string
  // Wordmark split: the ink block, then the smaller suffix.
  block: string
  suffix: string
  example: string
  sibling: string
  dek: { pt: [string, string]; en: [string, string] }
  siblingLine: { pt: string; en: string }
  shareLine: string
}

export const domainCopy: Record<string, DomainCopy> = {
  "pessoas.dev": {
    name: "pessoas.dev",
    block: "pessoas",
    suffix: ".dev",
    example: "ana",
    sibling: "ceuazul.online",
    dek: {
      pt: [
        "Um handle no pessoas.dev, de graça, para quem escreve código.",
        " Eu sirvo o DNS; o Bluesky faz o resto.",
      ],
      en: [
        "A free pessoas.dev handle for people who write code.",
        " I serve the DNS; Bluesky does the rest.",
      ],
    },
    siblingLine: {
      pt: "Se você não programa, tem o ",
      en: "If you do not write code, there is ",
    },
    shareLine: "Handle de graça no Bluesky para quem escreve código.",
  },
  "ceuazul.online": {
    name: "ceuazul.online",
    block: "ceuazul",
    suffix: ".online",
    example: "bia",
    sibling: "pessoas.dev",
    dek: {
      pt: [
        "Um handle no ceuazul.online para quem fala post e não skeet.",
        " De graça, enquanto o domínio existir.",
      ],
      en: [
        "A free ceuazul.online handle for people who say post, not skeet.",
        " Free, for as long as the domain exists.",
      ],
    },
    siblingLine: {
      pt: "Se você programa, tem o ",
      en: "If you write code, there is ",
    },
    shareLine: "Handle de graça no Bluesky para quem fala post e não skeet.",
  },
}

export const siteConfig = {
  domains: Object.keys(domainCopy),
  links: {
    author: "https://bsky.app/profile/joseli.to",
    notx: "https://notx.blue",
    status: "https://status.joseli.to/",
    source: "https://github.com/breakzplatform/pessoas.dev",
    upstream: "https://github.com/mozzius/community-handles",
    abuse: "abuse@notx.blue",
  },
}

export function copyFor(domain: string): DomainCopy {
  return domainCopy[domain] ?? domainCopy["pessoas.dev"]
}
