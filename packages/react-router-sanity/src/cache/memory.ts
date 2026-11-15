import type {CacheEntry, CacheSetOptions, SanityCache} from './types'

/**
 * Sets the options of `memoryCache`.
 *
 * @public
 */
export interface MemoryCacheOptions {
  /**
   * Sets the maximum number of entries. The cache removes the least recently used entry first.
   *
   * @defaultValue 500
   */
  maxEntries?: number
}

interface StoredEntry {
  entry: CacheEntry
  expiresAt: number
  tags: string[]
}

/**
 * Creates an in-memory LRU app cache with tag invalidation.
 *
 * Use it in development and on long-running Node servers. Each server process has its own cache.
 * Create the cache once at module scope, not per request.
 *
 * @param options - The cache size.
 * @returns A cache for the `cache.store` option of the middleware.
 * @example
 * ```ts
 * const cache = memoryCache({maxEntries: 1000})
 * export const sanityMiddleware = createSanityMiddleware(() => ({client, cache: {store: cache}}))
 * ```
 * @public
 */
export function memoryCache(options: MemoryCacheOptions = {}): SanityCache {
  const maxEntries = options.maxEntries ?? 500
  const entries = new Map<string, StoredEntry>()
  const tagIndex = new Map<string, Set<string>>()

  function remove(key: string): void {
    const stored = entries.get(key)
    if (!stored) return
    entries.delete(key)
    for (const tag of stored.tags) {
      const keys = tagIndex.get(tag)
      keys?.delete(key)
      if (keys?.size === 0) tagIndex.delete(tag)
    }
  }

  return {
    async get(key) {
      const stored = entries.get(key)
      if (!stored) return undefined
      if (stored.expiresAt <= Date.now()) {
        remove(key)
        return undefined
      }
      // Move the key to the end, so the map order is the LRU order.
      entries.delete(key)
      entries.set(key, stored)
      return stored.entry
    },
    async set(key, entry, {ttl, tags}: CacheSetOptions) {
      remove(key)
      entries.set(key, {entry, expiresAt: Date.now() + ttl * 1000, tags})
      for (const tag of tags) {
        const keys = tagIndex.get(tag) ?? new Set<string>()
        keys.add(key)
        tagIndex.set(tag, keys)
      }
      while (entries.size > maxEntries) {
        const oldest = entries.keys().next()
        if (oldest.done) break
        remove(oldest.value)
      }
    },
    async invalidateTags(tags) {
      for (const tag of tags) {
        // Copy the set: `remove()` deletes from it during the loop.
        // oxlint-disable-next-line unicorn/no-useless-spread
        for (const key of [...(tagIndex.get(tag) ?? [])]) remove(key)
      }
    },
  }
}
