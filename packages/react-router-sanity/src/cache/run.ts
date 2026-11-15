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
 * at once, and a background load replaces it. Background work runs in `waitUntil` when the
 * platform has it. Without `waitUntil`, background work runs detached: a long-lived server
 * finishes it, and a platform that stops early only loses a cache write.
 *
 * @internal
 */
export async function runWithCache(
  options: RunWithCacheOptions,
): Promise<{entry: CacheEntry; status: CacheStatus}> {
  const {cache, key, strategy, waitUntil, load} = options
  const ttl = strategy.maxAge + strategy.staleWhileRevalidate

  // A store error, or an error in the app's `onError`, must never fail the request.
  const report = (error: unknown) => {
    try {
      options.onError?.(error)
    } catch {
      // Ignore: the app error handler failed.
    }
  }
  const background = (promise: Promise<unknown>) => {
    const safe = promise.catch(report)
    if (waitUntil) waitUntil(safe)
  }
  const store = async (entry: CacheEntry) => {
    await cache.set(key, entry, {ttl, tags: [...new Set([...entry.syncTags, ...options.tags])]})
  }

  let cached: CacheEntry | undefined
  try {
    cached = await cache.get(key)
  } catch (error) {
    report(error)
  }

  if (cached) {
    // Clamp: a store written by another machine can have a later clock.
    const age = Math.max(0, (Date.now() - cached.fetchedAt) / 1000)
    if (age <= strategy.maxAge) return {entry: cached, status: 'HIT'}
    if (age <= ttl) {
      background(load().then(store))
      return {entry: cached, status: 'STALE'}
    }
  }

  const entry = await load()
  background(store(entry))
  return {entry, status: 'MISS'}
}
