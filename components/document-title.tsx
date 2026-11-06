"use client"

import { useEffect } from "react"

// Metadata is rendered in Portuguese; this swaps document.title while the page
// is shown in English, following html[data-lang].
export function DocumentTitle({ pt, en }: { pt: string; en: string }) {
  useEffect(() => {
    const root = document.documentElement
    const sync = () => {
      document.title = root.dataset.lang === "en" ? en : pt
    }
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(root, { attributes: true, attributeFilter: ["data-lang"] })
    return () => observer.disconnect()
  }, [pt, en])
  return null
}
