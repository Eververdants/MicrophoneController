// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { readStoredLang } from './lang'

describe('readStoredLang', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns "en" when mc.lang is "en"', () => {
    localStorage.setItem('mc.lang', 'en')
    expect(readStoredLang()).toBe('en')
  })

  it('returns "zh-CN" when mc.lang is "zh-CN"', () => {
    localStorage.setItem('mc.lang', 'zh-CN')
    expect(readStoredLang()).toBe('zh-CN')
  })

  it('falls back to "zh-CN" for an absent key', () => {
    expect(readStoredLang()).toBe('zh-CN')
  })

  it('falls back to "zh-CN" for an unrecognized value', () => {
    localStorage.setItem('mc.lang', 'fr')
    expect(readStoredLang()).toBe('zh-CN')
  })
})
