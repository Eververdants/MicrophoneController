import '@testing-library/jest-dom/vitest'

// jsdom exposes localStorage on window but not as a bare global; the app's code
// reads it unqualified, so mirror it onto globalThis for the tests. Guarded so
// the setup file also loads under the node environment (test files without an
// explicit jsdom pragma).
if (typeof globalThis.localStorage === 'undefined') {
  const w = typeof window !== 'undefined' ? window : undefined
  const jsdomLike = w && typeof w.localStorage !== 'undefined'
  if (jsdomLike) {
    Object.defineProperty(globalThis, 'localStorage', {
      value: w.localStorage,
      configurable: true,
      writable: true,
    })
  } else {
    // Minimal in-memory shim so readStoredLang() has something to read/write
    // even in a plain-node test file.
    const store = new Map<string, string>()
    const shim = {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => void store.set(k, String(v)),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
      key: (i: number) => Array.from(store.keys())[i] ?? null,
      get length() {
        return store.size
      },
    }
    Object.defineProperty(globalThis, 'localStorage', {
      value: shim,
      configurable: true,
      writable: true,
    })
  }
}

// jsdom does not implement matchMedia; theme code probes it defensively, but
// the fallback (light) is what we want in tests anyway.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}
