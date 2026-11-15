import type {CacheStrategy} from '../types'
import type {CacheEntry, SanityCache} from './types'

/**
 * Tells how the app cache answered a query.
 *
 * @public
 */
export type CacheStatus = 'HIT' | 'STALE' | 'MISS' | 'BYPASS'

/** @internal */
export interface RunWithCacheOptions {
  cache: SanityCache
  key: string
  strategy: CacheStrategy
  tags: string[]
  waitUntil: ((promise: Promise<unknown>) => void) | undefined
  load: () => Promise<CacheEntry>
  onError?: (error: unknown) => void
}

/**
 * Reads an entry from the app cache, or loads and stores it.
 *
 * A fresh entry returns at once. A stale entry inside the `staleWhileRevalidate` window returns
 * at once, and a background load replaces it. The background load runs in `waitUntil` when the
 * platform has it, and inline otherwise.
 *
 * @internal
 */
export async function runWithCache(
  options: RunWithCacheOptions,
): Promise<{entry: CacheEntry; status: CacheStatus}> {
  const {cache, key, strategy, waitUntil, load} = options
  const ttl = strategy.maxAge + strategy.staleWhileRevalidate
  const report = options.onError ?? (() => {})

  const store = async (entry: CacheEntry) => {
    try {
      await cache.set(key, entry, {ttl, tags: [...new Set([...entry.syncTags, ...options.tags])]})
    } catch (error) {
      report(error)
    }
  }

  let cached: CacheEntry | undefined
  try {
    cached = await cache.get(key)
  } catch (error) {
    report(error)
  }

  if (cached) {
    const age = (Date.now() - cached.fetchedAt) / 1000
    if (age <= strategy.maxAge) return {entry: cached, status: 'HIT'}
    if (age <= ttl) {
      const refresh = load().then(store, report)
      if (waitUntil) waitUntil(refresh)
      else await refresh
      return {entry: cached, status: 'STALE'}
    }
  }

  const entry = await load()
  const write = store(entry)
  if (waitUntil) waitUntil(write)
  else await write
  return {entry, status: 'MISS'}
}
