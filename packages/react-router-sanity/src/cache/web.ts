import {isCacheEntry, isStringArray, type SanityCache} from './types'

/**
 * Describes the part of the Web Cache API that `webCache` uses.
 *
 * @public
 */
export type CacheLike = Pick<Cache, 'match' | 'put' | 'delete'>

/**
 * Sets the options of `webCache`.
 *
 * @public
 */
export interface WebCacheOptions {
  /** Returns the Cache API instance. On Cloudflare and Oxygen, use `() => caches.open('sanity')`. */
  cache: () => Promise<CacheLike>
  /**
   * Sets the URL prefix of the synthetic cache keys. The Cache API needs URL keys.
   *
   * @defaultValue `'https://react-router-sanity.cache/'`
   */
  namespace?: string
}

/** Keeps a tag index for 30 days. Entries expire sooner, so a stale index entry is harmless. */
const TAG_INDEX_TTL = 60 * 60 * 24 * 30

/**
 * Creates an app cache on the Web Cache API, for Cloudflare Workers and Shopify Oxygen.
 *
 * The adapter stores a tag index beside the entries, so `invalidateTags` works.
 *
 * Important: on Cloudflare, the Cache API is local to one data center. A tag invalidation from
 * the live route purges only the data center that receives the call. For global purges, use
 * `kvCache` on Workers KV, or keep TTLs short.
 *
 * @param options - The Cache API instance and the key prefix.
 * @returns A cache for the `cache.store` option of the middleware.
 * @public
 */
export function webCache(options: WebCacheOptions): SanityCache {
  const namespace = options.namespace ?? 'https://react-router-sanity.cache/'
  const entryUrl = (key: string) => `${namespace}entry/${encodeURIComponent(key)}`
  const tagUrl = (tag: string) => `${namespace}tag/${encodeURIComponent(tag)}`

  async function readJson(cache: CacheLike, url: string): Promise<unknown> {
    const response = await cache.match(url)
    if (!response) return undefined
    try {
      return await response.json()
    } catch {
      return undefined
    }
  }

  function jsonResponse(value: unknown, ttl: number): Response {
    return new Response(JSON.stringify(value), {
      headers: {'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${ttl}`},
    })
  }

  return {
    async get(key) {
      const value = await readJson(await options.cache(), entryUrl(key))
      return isCacheEntry(value) ? value : undefined
    },
    async set(key, entry, {ttl, tags}) {
      const cache = await options.cache()
      await cache.put(entryUrl(key), jsonResponse(entry, ttl))
      await Promise.all(
        tags.map(async (tag) => {
          const current = await readJson(cache, tagUrl(tag))
          const keys = new Set(isStringArray(current) ? current : [])
          keys.add(key)
          await cache.put(tagUrl(tag), jsonResponse([...keys], TAG_INDEX_TTL))
        }),
      )
    },
    async invalidateTags(tags) {
      const cache = await options.cache()
      await Promise.all(
        tags.map(async (tag) => {
          const keys = await readJson(cache, tagUrl(tag))
          if (isStringArray(keys)) await Promise.all(keys.map((key) => cache.delete(entryUrl(key))))
          await cache.delete(tagUrl(tag))
        }),
      )
    },
  }
}
