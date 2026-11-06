"use client"

import { Tr, ui, type Localized } from "@/lib/i18n"

type Theme = "light" | "dark" | "terminal"

const THEMES: Theme[] = ["light", "dark", "terminal"]

const THEME_NAMES: Record<Theme, Localized<string>> = {
  light: ui.themeLight,
  dark: ui.themeDark,
  terminal: ui.themeTerminal,
}

function nextTheme(theme: Theme): Theme {
  return THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]
}

function currentTheme(): Theme {
  const value = document.documentElement.dataset.theme
  return THEMES.includes(value as Theme) ? (value as Theme) : "light"
}

function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Storage unavailable: the choice lasts for this page view only.
  }
}

export function LanguageButton() {
  const toggle = () => {
    const root = document.documentElement
    const next = root.dataset.lang === "en" ? "pt-BR" : "en"
    root.dataset.lang = next
    root.lang = next
    store("lang", next)
  }
  // Like the rest of the family, the button names where a tap takes you, in
  // that language. Both labels are rendered; CSS shows the right one.
  return (
    <button
      type="button"
      className="db-btn db-btn-sm cast press"
      onClick={toggle}
    >
      <span data-l="pt" lang="en">
        english
      </span>
      <span data-l="en" lang="pt-BR">
        português
      </span>
    </button>
  )
}

export function ThemeButton() {
  const cycle = () => {
    document.documentElement.dataset.theme = nextTheme(currentTheme())
    store("theme", document.documentElement.dataset.theme)
  }
  return (
    <button
      type="button"
      className="db-btn db-btn-sm cast press"
      onClick={cycle}
    >
      {THEMES.map((theme) => {
        const next = nextTheme(theme)
        return (
          <span className="theme-state" data-when={theme} key={theme}>
            <ThemeIcon theme={next} />
            <span className="sr">
              <Tr {...ui.themeCurrent} /> <Tr {...THEME_NAMES[theme]} />.{" "}
              <Tr {...ui.themeSwitchTo} />
            </span>{" "}
            <Tr {...THEME_NAMES[next]} />
          </span>
        )
      })}
    </button>
  )
}

const ICON_PATHS: Record<Theme, string[]> = {
  light: [
    "M12 2v2",
    "M12 20v2",
    "m4.93 4.93 1.41 1.41",
    "m17.66 17.66 1.41 1.41",
    "M2 12h2",
    "M20 12h2",
    "m6.34 17.66-1.41 1.41",
    "m19.07 4.93-1.41 1.41",
  ],
  dark: [
    "M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401",
  ],
  terminal: ["M12 19h8", "m4 17 6-6-6-6"],
}

function ThemeIcon({ theme }: { theme: Theme }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
    >
      {theme === "light" && <circle cx="12" cy="12" r="4" />}
      {ICON_PATHS[theme].map((d) => (
        <path d={d} key={d} />
      ))}
    </svg>
  )
}
