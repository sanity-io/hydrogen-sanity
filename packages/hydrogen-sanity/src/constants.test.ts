import {afterEach, describe, expect, it, vi} from 'vitest'

const long = {mode: 'public', maxAge: 3600, staleWhileRevalidate: 82800}

async function loadWith(hydrogen: Record<string, unknown>) {
  vi.resetModules()
  vi.doMock('@shopify/hydrogen', () => hydrogen)
  const {DEFAULT_CACHE_STRATEGY} = await import('./constants')
  return DEFAULT_CACHE_STRATEGY
}

afterEach(() => {
  vi.doUnmock('@shopify/hydrogen')
})

describe('DEFAULT_CACHE_STRATEGY', () => {
  it('uses `Cache.long()` when Hydrogen exports it', async () => {
    const upstream = {mode: 'public', maxAge: 1, staleWhileRevalidate: 2}
    const Cache = Object.assign(() => ({}), {long: () => upstream})
    expect(await loadWith({Cache, CacheLong: () => long})).toBe(upstream)
  })

  it('uses `CacheLong()` when Hydrogen has no `Cache`', async () => {
    const upstream = {mode: 'public', maxAge: 1, staleWhileRevalidate: 2}
    expect(await loadWith({CacheLong: () => upstream})).toBe(upstream)
  })

  it('falls back to the long preset values when Hydrogen exports neither', async () => {
    expect(await loadWith({})).toEqual(long)
  })

  it('equals `CacheLong()` from the installed Hydrogen', async () => {
    vi.resetModules()
    const hydrogen = await import('@shopify/hydrogen')
    const {DEFAULT_CACHE_STRATEGY} = await import('./constants')
    expect(DEFAULT_CACHE_STRATEGY).toEqual(hydrogen.CacheLong())
  })
})
