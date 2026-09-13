import { useCallback, useEffect, useRef, useState } from 'react'
import type { ThemePreference } from '../types'

export type Theme = 'light' | 'dark'
export { type ThemePreference }

const STORAGE_KEY = 'mc.theme'
const THEME_CACHE_KEY = STORAGE_KEY

function systemTheme(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function storedPreference(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system'
}

/**
 * Theme preference with a three-way choice.
 *
 * `system` is the default and stays live: the media query is subscribed to, so
 * the app follows the OS when it flips at sunset rather than only reading it
 * once at launch.
 */
export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>(storedPreference)
  const [systemPrefers, setSystemPrefers] = useState<Theme>(systemTheme)
  // Seeding local storage on mount would make "nothing stored yet" — the case
  // where the backend config is the only source of truth — impossible to detect
  // a moment later.
  const seeded = useRef(false)

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!query) return
    const onChange = () => setSystemPrefers(query.matches ? 'dark' : 'light')
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const theme: Theme = preference === 'system' ? systemPrefers : preference

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    if (!seeded.current) {
      seeded.current = true
      return
    }
    localStorage.setItem(THEME_CACHE_KEY, preference)
  }, [preference])

  const setPreference = useCallback((next: ThemePreference) => setPreferenceState(next), [])

  // The title bar has room for one control, so it cycles; the settings panel
  // offers all three states directly.
  const cycle = useCallback(
    () =>
      setPreferenceState((previous) =>
        previous === 'light' ? 'dark' : previous === 'dark' ? 'system' : 'light',
      ),
    [],
  )

  return { theme, preference, setPreference, cycle }
}
