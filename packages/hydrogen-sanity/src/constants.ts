import type {CachingStrategy} from '@shopify/hydrogen'

/** Default Sanity API version with perspective stack support */
export const DEFAULT_API_VERSION = 'v2025-02-19'

/**
 * Default Hydrogen caching strategy for Sanity queries. Equal to `CacheLong()` in Hydrogen 2026.4
 * and earlier, and `Cache.long()` in Hydrogen 2026.10 and later.
 */
export const DEFAULT_CACHE_STRATEGY: CachingStrategy = {
  mode: 'public',
  maxAge: 3600,
  staleWhileRevalidate: 82800,
}
