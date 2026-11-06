import { type Metadata, type Viewport } from "next"

import "@/styles/globals.css"

export const metadata: Metadata = {
  icons: { icon: "/favicon.svg" },
}

export const viewport: Viewport = {
  themeColor: "#F4F1EA",
}

// Runs before first paint. Theme is manual (light by default, never
// prefers-color-scheme), as everywhere in the notx.blue family. Language is
// the stored choice, else English on /privacy or for English browsers, else
// Portuguese.
const BOOT = `(() => {
  const root = document.documentElement
  let theme, lang
  try { theme = localStorage.getItem("theme"); lang = localStorage.getItem("lang") } catch {}
  root.dataset.theme = ["light", "dark", "terminal"].includes(theme) ? theme : "light"
  if (lang !== "en" && lang !== "pt-BR") {
    const english = location.pathname.endsWith("/privacy") ||
      String(navigator.language).toLowerCase().startsWith("en")
    lang = english ? "en" : "pt-BR"
  }
  root.dataset.lang = lang
  root.lang = lang
})()`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT }} />
        <link
          rel="preconnect"
          href="https://static.joseli.to"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
