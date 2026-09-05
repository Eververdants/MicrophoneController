import { invoke as tauriInvoke } from '@tauri-apps/api/core'
import { listen as tauriListen } from '@tauri-apps/api/event'
import { useEffect, useRef } from 'react'

// __TAURI_INTERNALS__ exists only inside the Tauri webview.
function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export function useTauriEvent<T>(event: string, handler: (payload: T) => void) {
  const handlerRef = useRef(handler)
  useEffect(() => {
    handlerRef.current = handler
  })

  useEffect(() => {
    if (!isTauri()) return
    let cancelled = false
    let unlisten: (() => void) | undefined
    tauriListen<T>(event, (e) => {
      if (!cancelled) handlerRef.current(e.payload)
    })
      .then((u) => {
        if (cancelled) u()
        else unlisten = u
      })
      .catch((err) => console.error(`listen ${event} failed:`, err))
    return () => {
      cancelled = true
      unlisten?.()
    }
  }, [event])
}

export async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) throw new Error('Tauri runtime not available')
  return tauriInvoke<T>(command, args)
}
