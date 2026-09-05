import { useEffect, useRef } from 'react'

interface TauriLike {
  invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>
  listen: <T>(event: string, handler: (payload: { payload: T }) => void) => Promise<() => void>
}

function getTauri(): TauriLike | null {
  const w = window as unknown as { __TAURI_INTERNALS__?: TauriLike }
  return w.__TAURI_INTERNALS__ ?? null
}

export function isTauri(): boolean {
  return getTauri() !== null
}

export function useTauriEvent<T>(event: string, handler: (payload: T) => void) {
  const handlerRef = useRef(handler)
  useEffect(() => {
    handlerRef.current = handler
  })

  useEffect(() => {
    const tauri = getTauri()
    if (!tauri) return
    let cancel: (() => void) | undefined
    let cancelled = false
    tauri
      .listen<T>(event, (e) => {
        if (!cancelled) handlerRef.current(e.payload)
      })
      .then((unlisten) => {
        cancel = unlisten
      })
    return () => {
      cancelled = true
      cancel?.()
    }
  }, [event])
}

export async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const tauri = getTauri()
  if (!tauri) throw new Error('Tauri runtime not available')
  return (await tauri.invoke(command, args)) as T
}
