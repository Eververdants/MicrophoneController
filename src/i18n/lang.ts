import type { Lang } from './translations'

// Single owner for the persisted-language read. Both the main window
// (LanguageContext) and the overlay window (which has no provider tree) read
// `mc.lang`; centralizing the parse keeps them from drifting apart.
export function readStoredLang(): Lang {
  return localStorage.getItem('mc.lang') === 'en' ? 'en' : 'zh-CN'
}
