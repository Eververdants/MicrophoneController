import { useCallback } from 'react'
import { invoke } from './useTauri'
import type { InitialState } from '../types'

type PatchFn = (values: Partial<InitialState>) => void
type ReportErrorFn = (err: unknown) => void
type SnapshotFn = () => InitialState | null

/**
 * Optimistic persist: patch the UI, fire the command, and roll the *affected*
 * fields back if the backend refuses them.
 *
 * Only the keys present in `values` are captured and restored, so a failure
 * never clobbers state that changed concurrently (e.g. an `audio:status` tick
 * that arrived between the patch and the rejection).
 */
export function usePersist(patch: PatchFn, reportError: ReportErrorFn, getSnapshot: SnapshotFn) {
  return useCallback(
    (
      values: Partial<InitialState>,
      command: string,
      args: Record<string, unknown>,
      onApplied?: (result: unknown) => void,
    ) => {
      const keys = Object.keys(values) as (keyof InitialState)[]
      const current = getSnapshot()
      const rollback = current
        ? (Object.fromEntries(keys.map((k) => [k, current[k]])) as Partial<InitialState>)
        : null

      patch(values)
      invoke(command, args)
        .then((result) => onApplied?.(result))
        .catch((err) => {
          if (rollback) patch(rollback)
          reportError(err)
        })
    },
    [patch, reportError, getSnapshot],
  )
}
