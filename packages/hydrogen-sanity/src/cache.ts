// Keep the namespace import and the direct `hydrogen.member` reads below. Rollup tree-shakes
// direct member reads and resolves a missing export to `undefined`. An alias of the namespace,
// or a dynamic import, makes Rollup keep all of `@shopify/hydrogen` in the bundle.
import type {CachingStrategy} from '@shopify/hydrogen'
import * as hydrogen from '@shopify/hydrogen'

import type {CacheInstance, WaitUntil, WebCacheLike} from './types'

export type CachedRunOptions<T> = {
  key: string
  strategy: CachingStrategy
  shouldCache: (value: T) => boolean
  /** Label for the Hydrogen subrequest profiler. Hydrogen 2026.10 and later has no profiler. */
  displayName: string
}

export type CachedRun = <T>(options: CachedRunOptions<T>, fn: () => Promise<T>) => Promise<T>

export type CachedRunContext = {
  cache: CacheInstance
  waitUntil: WaitUntil
  request: Request
}

/** `createRunWithCache`, Hydrogen 2026.10 and later. */
export type CreateRunWithCache = (options: {
  cache: CacheInstance
  waitUntil?: WaitUntil
}) => <T extends Record<string, unknown>>(
  options: {key: string; strategy: CachingStrategy},
  run: () => Promise<{data: T; shouldCache: boolean}>,
) => Promise<{data: T}>

/** `createWithCache`, Hydrogen 2026.4 and earlier. */
export type CreateWithCache = (options: {
  cache: WebCacheLike
  waitUntil: WaitUntil
  request: Request
}) => {
  run: <T>(
    options: {
      cacheKey: string
      cacheStrategy: CachingStrategy
      shouldCacheResult: (value: T) => boolean
    },
    fn: (param: {addDebugData: (info: {displayName: string}) => void}) => Promise<T>,
  ) => Promise<T>
}

function isFunction<T>(value: unknown): value is T {
  return typeof value === 'function'
}

function isWebCacheLike(cache: CacheInstance): cache is WebCacheLike {
  return 'match' in cache && 'put' in cache && typeof cache.match === 'function'
}

export function fromRunWithCache(
  createRunWithCache: CreateRunWithCache,
  {cache, waitUntil}: CachedRunContext,
): CachedRun {
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

export function fromWithCache(
  createWithCache: CreateWithCache,
  {cache, waitUntil, request}: CachedRunContext,
): CachedRun {
  if (!isWebCacheLike(cache)) {
    throw new Error(
      'Hydrogen 2026.4 and earlier needs a Web Cache API cache. A key-value store needs Hydrogen 2026.10 or later.',
    )
  }
  const withCache = createWithCache({cache, waitUntil, request})
  return ({key, strategy, shouldCache, displayName}, fn) =>
    withCache.run(
      {cacheKey: key, cacheStrategy: strategy, shouldCacheResult: shouldCache},
      ({addDebugData}) => {
        addDebugData({displayName})
        return fn()
      },
    )
}

/**
 * Creates a cached runner from the installed `@shopify/hydrogen` cache API.
 */
export function createCachedRun(context: CachedRunContext): CachedRun {
  const createRunWithCache =
    // oxlint-disable-next-line import/namespace -- the export exists only in Hydrogen 2026.10 and later
    'createRunWithCache' in hydrogen ? hydrogen.createRunWithCache : undefined
  if (isFunction<CreateRunWithCache>(createRunWithCache)) {
    return fromRunWithCache(createRunWithCache, context)
  }

  const createWithCache = 'createWithCache' in hydrogen ? hydrogen.createWithCache : undefined
  if (isFunction<CreateWithCache>(createWithCache)) {
    return fromWithCache(createWithCache, context)
  }

  throw new Error('`@shopify/hydrogen` exports neither `createRunWithCache` nor `createWithCache`.')
}
