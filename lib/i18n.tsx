import type { ElementType, ReactNode } from "react"

export type Locale = "pt-BR" | "en"

export interface Localized<T = ReactNode> {
  pt: T
  en: T
}

interface TrProps extends Localized {
  as?: ElementType
  className?: string
  id?: string
}

// Renders both languages; CSS keyed on html[data-lang] shows one. Pages stay
// server-rendered and cookie-free, and switching language needs no reload.
// The id, if any, goes on the Portuguese copy only, to stay unique.
export function Tr({ pt, en, as: Tag = "span", className, id }: TrProps) {
  return (
    <>
      <Tag lang="pt-BR" data-l="pt" className={className} id={id}>
        {pt}
      </Tag>
      <Tag lang="en" data-l="en" className={className}>
        {en}
      </Tag>
    </>
  )
}

export const ui = {
  skip: { pt: "Pular para o conteúdo", en: "Skip to content" },
  navHome: { pt: "pegar um @", en: "get a handle" },
  navPeople: { pt: "pessoas", en: "people" },
  navFaq: { pt: "perguntas", en: "faq" },
  themeLight: { pt: "claro", en: "light" },
  themeDark: { pt: "escuro", en: "dark" },
  themeTerminal: { pt: "terminal", en: "terminal" },
  themeCurrent: { pt: "Tema atual:", en: "Current theme:" },
  themeSwitchTo: { pt: "Mudar para", en: "Switch to" },
  tagline: { pt: "Handle de graça no Bluesky", en: "A free Bluesky handle" },
  partOf: { pt: "parte do", en: "part of" },
  by: { pt: "feito por", en: "by" },
  privacy: { pt: "Privacidade", en: "Privacy" },
  status: { pt: "status", en: "status" },
  source: { pt: "código-fonte", en: "source code" },
  fromBrazil: {
    pt: "Direto do Brasil pelo Joselito, com muito carinho. Este site não usa cookies nem analytics. Ele guarda o @ que você escolheu e o DID da sua conta, para o Bluesky poder verificar o handle. Não tem relação com o Bluesky.",
    en: "Directly from Brazil by Joselito, with much love and care. This site uses no cookies and no analytics. It stores the handle you picked and your account's DID, so Bluesky can verify the handle. It is not related to Bluesky.",
  },
  support: { pt: "Apoie", en: "Support" },
  send: { pt: "enviar", en: "submit" },
  seeOnBluesky: { pt: "ver no Bluesky", en: "view on Bluesky" },
  loadMore: { pt: "carregar mais", en: "load more" },
  loading: { pt: "carregando…", en: "loading…" },
} satisfies Record<string, Localized<string>>
