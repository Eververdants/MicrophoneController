import { getCurrentWindow } from '@tauri-apps/api/window'
import { useEffect, useState } from 'react'
import { LanguageToggle } from './LanguageToggle'
import { ThemeToggle } from './ThemeToggle'
import { CloseIcon, MaximizeIcon, MinusIcon, RestoreIcon } from './icons'
import { useLanguage } from '../i18n/LanguageContext'
import type { ThemePreference } from '../hooks/useTheme'

interface TitleBarProps {
  preference: ThemePreference
  onCycleTheme: () => void
}

// Resolved lazily: getCurrentWindow() throws when the frontend runs in a plain
// browser (vite dev outside Tauri), and the bar should degrade gracefully there.
function appWindow() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window ? getCurrentWindow() : null
}

export function TitleBar({ preference, onCycleTheme }: TitleBarProps) {
  const { t } = useLanguage()
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    const win = appWindow()
    if (!win) return
    let cancelled = false
    let unlisten: (() => void) | undefined
    const sync = () => {
      win.isMaximized()
        .then((m) => {
          if (!cancelled) setMaximized(m)
        })
        .catch(() => {})
    }
    sync()
    win
      .onResized(sync)
      .then((u) => {
        if (cancelled) u()
        else unlisten = u
      })
      .catch(() => {})
    return () => {
      cancelled = true
      unlisten?.()
    }
  }, [])

  return (
    // data-tauri-drag-region on the bar and its static children: empty areas
    // and the title drag the window; buttons without the attribute stay clickable.
    <header className="relative z-20 flex h-10 flex-none select-none items-center" data-tauri-drag-region>
      <div data-tauri-drag-region className="flex h-full min-w-0 flex-1 items-center gap-2 pl-3">
        <img src="/icon-128.png" alt="" draggable={false} className="h-4 w-4 rounded-[4px]" />
        <span data-tauri-drag-region className="truncate text-xs font-medium" style={{ color: 'var(--fg)' }}>
          {t('appTitle')}
        </span>
      </div>

      <div className="flex flex-none items-center gap-2 pr-2">
        <LanguageToggle />
        <ThemeToggle preference={preference} onCycle={onCycleTheme} />
      </div>

      <div className="flex h-full flex-none items-stretch">
        <WindowButton label={t('minimize')} onClick={() => void appWindow()?.minimize()}>
          <MinusIcon size={14} />
        </WindowButton>
        <WindowButton label={maximized ? t('restore') : t('maximize')} onClick={() => void appWindow()?.toggleMaximize()}>
          {maximized ? <RestoreIcon size={13} /> : <MaximizeIcon size={13} />}
        </WindowButton>
        <WindowButton label={t('close')} danger onClick={() => void appWindow()?.close()}>
          <CloseIcon size={14} />
        </WindowButton>
      </div>
    </header>
  )
}

function WindowButton({
  label,
  danger,
  onClick,
  children,
}: {
  label: string
  danger?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex w-11 cursor-pointer items-center justify-center outline-none ${
        danger ? 'hover:bg-[var(--danger)] hover:text-[var(--bg)]' : 'hover:bg-[var(--accent-soft)]'
      }`}
      style={{ color: 'var(--fg-muted)' }}
    >
      {children}
    </button>
  )
}
