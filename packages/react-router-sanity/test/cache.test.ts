import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {kvCache, memoryCache, webCache, type CacheLike, type KeyValueStore} from '../src/cache'
import {createCacheKey, stableStringify, type CacheKeyParts} from '../src/cache/key'
import {runWithCache} from '../src/cache/run'
import type {CacheEntry, SanityCache} from '../src/cache/types'

const entry = (data: unknown, tags: `s1:${string}`[] = ['s1:a']): CacheEntry => ({
  data,
  syncTags: tags,
  fetchedAt: Date.now(),
})

const baseKey: CacheKeyParts = {
  projectId: 'p1',
  dataset: 'production',
  apiVersion: '2026-11-01',
  perspective: 'published',
  variant: undefined,
  query: '*[_type == "page"][0]',
  params: {slug: 'home', locale: 'en'},
}

describe('createCacheKey', () => {
  it('gives the same key for params in a different order', async () => {
    const a = await createCacheKey(baseKey)
    const b = await createCacheKey({...baseKey, params: {locale: 'en', slug: 'home'}})
    expect(a).toBe(b)
    expect(a).toMatch(/^[0-9a-f]{64}$/)
  })

  it('gives a different key per perspective', async () => {
    const published = await createCacheKey(baseKey)
    const drafts = await createCacheKey({...baseKey, perspective: 'drafts'})
    const release = await createCacheKey({...baseKey, perspective: ['rSummer', 'drafts']})
    expect(new Set([published, drafts, release]).size).toBe(3)
  })

  it('gives a different key per variant, dataset and API version', async () => {
    const keys = await Promise.all([
      createCacheKey(baseKey),
      createCacheKey({...baseKey, variant: 'de-DE'}),
      createCacheKey({...baseKey, dataset: 'staging'}),
      createCacheKey({...baseKey, apiVersion: '2025-01-01'}),
    ])
    expect(new Set(keys).size).toBe(4)
  })

  it('serializes nested values with sorted keys', () => {
    expect(stableStringify({b: [1, {d: 1, c: 2}], a: undefined})).toBe('{"b":[1,{"c":2,"d":1}]}')
  })
})

function runAdapterContract(name: string, create: () => SanityCache) {
  describe(`${name} adapter`, () => {
    it('returns what it stored', async () => {
      const cache = create()
      await cache.set('k1', entry({title: 'Home'}), {ttl: 60, tags: ['s1:a']})
      expect((await cache.get('k1'))?.data).toEqual({title: 'Home'})
      expect(await cache.get('missing')).toBeUndefined()
    })

    it('removes every entry with an invalidated tag, and keeps the others', async () => {
      const cache = create()
      await cache.set('k1', entry(1), {ttl: 60, tags: ['s1:a']})
      await cache.set('k2', entry(2), {ttl: 60, tags: ['s1:a', 's1:b']})
      await cache.set('k3', entry(3), {ttl: 60, tags: ['s1:c']})
      await cache.invalidateTags?.(['s1:a'])
      expect(await cache.get('k1')).toBeUndefined()
      expect(await cache.get('k2')).toBeUndefined()
      expect((await cache.get('k3'))?.data).toBe(3)
    })
  })
}

runAdapterContract('memoryCache', () => memoryCache())

runAdapterContract('kvCache', () => {
  const map = new Map<string, string>()
  const store: KeyValueStore = {
    get: async (key) => map.get(key) ?? null,
    put: async (key, value) => void map.set(key, value),
    delete: async (key) => void map.delete(key),
  }
  return kvCache({store})
})

runAdapterContract('webCache', () => {
  const map = new Map<string, Response>()
  const cache: CacheLike = {
    match: async (request) => map.get(String(request))?.clone(),
    put: async (request, response) => void map.set(String(request), response.clone()),
    delete: async (request) => map.delete(String(request)),
  }
  return webCache({cache: async () => cache})
})

describe('memoryCache', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('drops an entry after its TTL', async () => {
    const cache = memoryCache()
    await cache.set('k', entry(1), {ttl: 10, tags: []})
    vi.advanceTimersByTime(10_001)
    expect(await cache.get('k')).toBeUndefined()
  })

  it('removes the least recently used entry first', async () => {
    const cache = memoryCache({maxEntries: 2})
    await cache.set('a', entry('a'), {ttl: 60, tags: []})
    await cache.set('b', entry('b'), {ttl: 60, tags: []})
    await cache.get('a')
    await cache.set('c', entry('c'), {ttl: 60, tags: []})
    expect(await cache.get('b')).toBeUndefined()
    expect(await cache.get('a')).toBeDefined()
    expect(await cache.get('c')).toBeDefined()
  })
})

describe('runWithCache', () => {
  const strategy = {maxAge: 10, staleWhileRevalidate: 20}

  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('loads on a miss, then serves a hit', async () => {
    const cache = memoryCache()
    const load = vi.fn(async () => entry('v1'))
    const first = await runWithCache({cache, key: 'k', strategy, tags: [], waitUntil: undefined, load})
    const second = await runWithCache({cache, key: 'k', strategy, tags: [], waitUntil: undefined, load})
    expect([first.status, second.status]).toEqual(['MISS', 'HIT'])
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('serves a stale entry and refreshes it in waitUntil', async () => {
    const cache = memoryCache()
    await runWithCache({cache, key: 'k', strategy, tags: [], waitUntil: undefined, load: async () => entry('v1')})
    vi.advanceTimersByTime(15_000)

    const background: Promise<unknown>[] = []
    const stale = await runWithCache({
      cache,
      key: 'k',
      strategy,
      tags: [],
      waitUntil: (promise) => background.push(promise),
      load: async () => entry('v2'),
    })
    expect(stale.status).toBe('STALE')
    expect(stale.entry.data).toBe('v1')
    await Promise.all(background)
    expect((await cache.get('k'))?.data).toBe('v2')
  })

  it('loads again after the stale window', async () => {
    const cache = memoryCache()
    await runWithCache({cache, key: 'k', strategy, tags: [], waitUntil: undefined, load: async () => entry('v1')})
    vi.advanceTimersByTime(31_000)
    const result = await runWithCache({cache, key: 'k', strategy, tags: [], waitUntil: undefined, load: async () => entry('v2')})
    expect(result.status).toBe('MISS')
    expect(result.entry.data).toBe('v2')
  })

  it('stores the entry under its sync tags and the extra tags', async () => {
    const set = vi.fn(async () => {})
    const cache: SanityCache = {get: async () => undefined, set}
    await runWithCache({cache, key: 'k', strategy, tags: ['page'], waitUntil: undefined, load: async () => entry(1, ['s1:x'])})
    expect(set).toHaveBeenCalledWith('k', expect.anything(), {ttl: 30, tags: ['s1:x', 'page']})
  })

  it('still answers when the store fails', async () => {
    const onError = vi.fn()
    const cache: SanityCache = {
      get: async () => Promise.reject(new Error('down')),
      set: async () => Promise.reject(new Error('down')),
    }
    const result = await runWithCache({cache, key: 'k', strategy, tags: [], waitUntil: undefined, load: async () => entry(1), onError})
    expect(result.entry.data).toBe(1)
    await vi.waitFor(() => expect(onError).toHaveBeenCalledTimes(2))
  })

  it('still answers when the onError handler throws', async () => {
    const cache: SanityCache = {get: async () => Promise.reject(new Error('down')), set: async () => {}}
    const onError = () => {
      throw new Error('handler bug')
    }
    const result = await runWithCache({cache, key: 'k', strategy, tags: [], waitUntil: undefined, load: async () => entry(1), onError})
    expect(result.status).toBe('MISS')
  })

  it('serves a stale entry without waiting for the refresh when there is no waitUntil', async () => {
    const cache = memoryCache()
    await runWithCache({cache, key: 'k', strategy, tags: [], waitUntil: undefined, load: async () => entry('v1')})
    vi.advanceTimersByTime(15_000)
    // A refresh that never settles: the request must not wait for it.
    const result = await runWithCache({cache, key: 'k', strategy, tags: [], waitUntil: undefined, load: () => new Promise(() => {})})
    expect(result.status).toBe('STALE')
    expect(result.entry.data).toBe('v1')
  })
})

describe('memoryCache isolation', () => {
  it('returns copies, so a loader that mutates its data cannot change the cache', async () => {
    const cache = memoryCache()
    const original = entry({items: [3, 1, 2]})
    await cache.set('k', original, {ttl: 60, tags: []})
    // Mutate the value that was stored, and the value that was read.
    if (typeof original.data === 'object' && original.data && 'items' in original.data && Array.isArray(original.data.items)) {
      original.data.items.push(99)
    }
    const first = await cache.get('k')
    if (typeof first?.data === 'object' && first.data && 'items' in first.data && Array.isArray(first.data.items)) {
      first.data.items.sort()
    }
    expect((await cache.get('k'))?.data).toEqual({items: [3, 1, 2]})
  })
})

describe('invalidation scope', () => {
  it('declares local scope for memory and web, global for KV', () => {
    const store: KeyValueStore = {get: async () => null, put: async () => {}, delete: async () => {}}
    const web: CacheLike = {match: async () => undefined, put: async () => {}, delete: async () => true}
    expect(memoryCache().invalidation).toBe('local')
    expect(webCache({cache: async () => web}).invalidation).toBe('local')
    expect(kvCache({store}).invalidation).toBe('global')
  })
})
