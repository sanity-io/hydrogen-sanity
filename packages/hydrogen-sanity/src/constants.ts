import type {CachingStrategy} from '@shopify/hydrogen'

/** Default Sanity API version with perspective stack support */
export const DEFAULT_API_VERSION = 'v2025-02-19'

/**
 * Default Hydrogen caching strategy for Sanity queries. It equals Hydrogen's long preset:
 * `Cache.long()` in Hydrogen 2026.10 and later, and `CacheLong()` in Hydrogen 2026.4 and earlier.
 * A literal value keeps the removed preset out of the bundle, so Hydrogen 2026.10 builds don't
 * warn about it.
 */
export const DEFAULT_CACHE_STRATEGY: CachingStrategy = {
  mode: 'public',
  maxAge: 3600,
  staleWhileRevalidate: 82800,
}
