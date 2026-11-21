import {type CacheInstance, type CachingStrategy, createRunWithCache} from '@shopify/hydrogen'

import type {WaitUntil} from './types'

/** A cache key. Include every value that changes the cached data. */
export type CachedRunKey = readonly (string | number | boolean | null)[]

export type CachedRunOptions<T> = {
  key: CachedRunKey
  strategy: CachingStrategy
  shouldCache: (value: T) => boolean
}

export type CachedRun = <T>(options: CachedRunOptions<T>, fn: () => Promise<T>) => Promise<T>

export type CachedRunContext = {
  cache: CacheInstance
  waitUntil: WaitUntil
}

/**
 * Caches the results of `fn` with Hydrogen's `createRunWithCache`.
 */
export function createCachedRun({cache, waitUntil}: CachedRunContext): CachedRun {
  const runWithCache = createRunWithCache({cache, waitUntil})

  return async ({key, strategy, shouldCache}, fn) => {
    // Hydrogen reads back only plain objects. A query result can be an array, a primitive or
    // `null`, so wrap every result in an object.
    const {data} = await runWithCache({key, strategy}, async () => {
      const value = await fn()
      return {data: {value}, shouldCache: shouldCache(value)}
    })
    return data.value
  }
}
