import {isCacheEntry, isStringArray, parseJson, type SanityCache} from './types'

/**
 * Describes a key-value store. Workers KV matches this shape. Wrap other stores (Redis, Vercel
 * Runtime Cache) in an object with these three methods.
 *
 * @public
 */
export interface KeyValueStore {
  /** Returns the value for a key, or `null` when the key does not exist. */
  get(key: string): Promise<string | null>
  /** Stores a value. `expirationTtl` sets the lifetime in seconds. */
  put(key: string, value: string, options?: {expirationTtl?: number}): Promise<void>
  /** Removes a key. */
  delete(key: string): Promise<void>
}

/**
 * Sets the options of `kvCache`.
 *
 * @public
 */
export interface KvCacheOptions {
  /** Gives the store. On Cloudflare, pass a Workers KV binding. */
  store: KeyValueStore
  /**
   * Sets the key prefix. Use a different prefix per app if apps share a store.
   *
   * @defaultValue `'sanity:'`
   */
  prefix?: string
  /**
   * Sets the minimum TTL in seconds. Workers KV rejects a TTL under 60 seconds.
   *
   * @defaultValue 60
   */
  minTtl?: number
}

/** Keeps a tag index for 30 days. */
const TAG_INDEX_TTL = 60 * 60 * 24 * 30

/**
 * Creates an app cache on a key-value store, with tag invalidation.
 *
 * The tag index uses read-modify-write. Two concurrent writes to the same tag can drop one key
 * from the index. The TTL then removes that entry.
 *
 * @param options - The store and the key prefix.
 * @returns A cache for the `cache.store` option of the middleware.
 * @public
 */
export function kvCache(options: KvCacheOptions): SanityCache {
  const {store} = options
  const prefix = options.prefix ?? 'sanity:'
  const minTtl = options.minTtl ?? 60
  const entryKey = (key: string) => `${prefix}entry:${key}`
  const tagKey = (tag: string) => `${prefix}tag:${tag}`

  return {
    // Every instance reads the same store, so a purge reaches all of them.
    invalidation: 'global',
    async get(key) {
      const value = parseJson(await store.get(entryKey(key)))
      return isCacheEntry(value) ? value : undefined
    },
    async set(key, entry, {ttl, tags}) {
      await store.put(entryKey(key), JSON.stringify(entry), {expirationTtl: Math.max(ttl, minTtl)})
      await Promise.all(
        tags.map(async (tag) => {
          const current = parseJson(await store.get(tagKey(tag)))
          const keys = new Set(isStringArray(current) ? current : [])
          keys.add(key)
          await store.put(tagKey(tag), JSON.stringify([...keys]), {expirationTtl: TAG_INDEX_TTL})
        }),
      )
    },
    async invalidateTags(tags) {
      await Promise.all(
        tags.map(async (tag) => {
          const keys = parseJson(await store.get(tagKey(tag)))
          if (isStringArray(keys)) await Promise.all(keys.map((key) => store.delete(entryKey(key))))
          await store.delete(tagKey(tag))
        }),
      )
    },
  }
}
