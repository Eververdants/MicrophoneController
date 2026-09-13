// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePersist } from './usePersist'
import type { InitialState } from '../types'

// usePersist() calls into useTauri's invoke(); stub it so the hook runs outside
// the Tauri webview. vi.hoisted lifts the mock above the vi.mock() factory so
// the factory can close over it without a temporal-dead-zone at collection.
const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }))
vi.mock('./useTauri', () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}))

function baseState(): InitialState {
  return {
    muted: false,
    volumePercent: 100,
    volumeDb: 0,
    volumeRange: { minDb: -96, maxDb: 0, incrementDb: 1 },
    channelCount: 2,
    devices: [],
    selectedDeviceId: null,
    selectedDeviceName: null,
    inUse: [],
    hotkey: 'F8',
    hotkeyError: null,
    language: 'zh-CN',
    theme: 'system',
    startMinimizedToTray: false,
    minimizeToTrayOnClose: true,
    volumeZeroMutes: false,
    normalizeVolume: false,
    referenceVolumePercent: 50,
    showOsd: true,
    showMeter: true,
    scrollStepPercent: 5,
    balance: 0,
    pollInterval: 1,
    autostart: false,
    configPath: '/tmp/config.json',
    version: '1.0.0',
    platformSupported: true,
  }
}

describe('usePersist', () => {
  beforeEach(() => {
    invokeMock.mockReset()
  })

  it('patches optimistically and keeps the change when the command succeeds', async () => {
    invokeMock.mockResolvedValue(undefined)
    const patch = vi.fn()
    const reportError = vi.fn()
    const { result } = renderHook(() => usePersist(patch, reportError, () => baseState()))

    await act(async () => {
      await result.current({ showOsd: false }, 'set_show_osd', { value: false })
    })

    expect(patch).toHaveBeenCalledTimes(1)
    expect(patch).toHaveBeenCalledWith({ showOsd: false })
    expect(invokeMock).toHaveBeenCalledWith('set_show_osd', { value: false })
    expect(reportError).not.toHaveBeenCalled()
  })

  it('rolls back only the affected keys when the command fails', async () => {
    invokeMock.mockRejectedValue(new Error('backend refused'))
    const patch = vi.fn()
    const reportError = vi.fn()
    const { result } = renderHook(() => usePersist(patch, reportError, () => baseState()))

    await act(async () => {
      await result.current({ autostart: true, showOsd: false }, 'set_autostart', { value: true })
    })

    // First the optimistic patch, then a rollback of exactly those keys.
    expect(patch).toHaveBeenCalledTimes(2)
    expect(patch).toHaveBeenNthCalledWith(1, { autostart: true, showOsd: false })
    expect(patch).toHaveBeenNthCalledWith(2, { autostart: false, showOsd: true })
    expect(reportError).toHaveBeenCalledTimes(1)
  })

  it('invokes onApplied with the command result after success', async () => {
    invokeMock.mockResolvedValue(42)
    const patch = vi.fn()
    const reportError = vi.fn()
    const onApplied = vi.fn()
    const { result } = renderHook(() => usePersist(patch, reportError, () => baseState()))

    await act(async () => {
      await result.current({ scrollStepPercent: 10 }, 'set_scroll_step', { percent: 10 }, onApplied)
    })

    expect(onApplied).toHaveBeenCalledWith(42)
  })
})
