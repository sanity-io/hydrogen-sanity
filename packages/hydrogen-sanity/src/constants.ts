import {CacheLong, type CachingStrategy} from '@shopify/hydrogen'

/** Default Sanity API version with perspective stack support */
export const DEFAULT_API_VERSION = 'v2025-02-19'

/** Default Hydrogen caching strategy for Sanity queries */
export const DEFAULT_CACHE_STRATEGY: CachingStrategy = CacheLong()
