// Read Hydrogen members directly from the namespace import. See `cache.ts` for the reason.
import type {CachingStrategy} from '@shopify/hydrogen'
import * as hydrogen from '@shopify/hydrogen'

/** Default Sanity API version with perspective stack support */
export const DEFAULT_API_VERSION = 'v2025-02-19'

type CachePreset = () => CachingStrategy

function isCachePreset(value: unknown): value is CachePreset {
  return typeof value === 'function'
}

function getLongCacheStrategy(): CachingStrategy {
  // oxlint-disable-next-line import/namespace -- the export exists only in Hydrogen 2026.10 and later
  const cache: unknown = 'Cache' in hydrogen ? hydrogen.Cache : undefined
  if ((typeof cache === 'function' || typeof cache === 'object') && cache && 'long' in cache) {
    if (isCachePreset(cache.long)) return cache.long()
  }

  const cacheLong = 'CacheLong' in hydrogen ? hydrogen.CacheLong : undefined
  if (isCachePreset(cacheLong)) return cacheLong()

  return {mode: 'public', maxAge: 3600, staleWhileRevalidate: 82800}
}

/**
 * Default Hydrogen caching strategy for Sanity queries: `Cache.long()` in Hydrogen 2026.10 and
 * later, and `CacheLong()` in Hydrogen 2026.4 and earlier.
 */
export const DEFAULT_CACHE_STRATEGY: CachingStrategy = getLongCacheStrategy()
