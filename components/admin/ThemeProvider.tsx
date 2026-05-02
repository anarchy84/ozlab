'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

export type Theme = 'dark' | 'light'

interface ThemeContextValue {
  theme: Theme
  toggle: () => void
  setTheme: (theme: Theme) => void
}

const STORAGE_KEY = 'admin-theme'
const DEFAULT_THEME: Theme = 'dark'

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  toggle: () => {},
  setTheme: () => {},
})

export function useAdminTheme() {
  return useContext(ThemeContext)
}

interface AdminThemeProviderProps {
  children: ReactNode
  rootElement?: 'html' | 'body' | 'self'
  defaultTheme?: Theme
}

export function AdminThemeProvider({
  children,
  rootElement = 'html',
  defaultTheme = DEFAULT_THEME,
}: AdminThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    let initial: Theme = defaultTheme
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored === 'dark' || stored === 'light') {
        initial = stored
      } else if (window.matchMedia?.('(prefers-color-scheme: light)').matches) {
        initial = 'light'
      }
    } catch {
      // storage 차단 환경에서는 기본 테마 유지
    }
    setThemeState(initial)
    setHydrated(true)
  }, [defaultTheme])

  useEffect(() => {
    if (!hydrated) return

    const target =
      rootElement === 'html'
        ? document.documentElement
        : rootElement === 'body'
        ? document.body
        : null

    if (target) {
      target.classList.toggle('dark', theme === 'dark')
      target.classList.toggle('light', theme === 'light')
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // ignore
    }
  }, [hydrated, rootElement, theme])

  const setTheme = useCallback((nextTheme: Theme) => setThemeState(nextTheme), [])
  const toggle = useCallback(
    () => setThemeState((current) => (current === 'dark' ? 'light' : 'dark')),
    [],
  )

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
