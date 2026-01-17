import {CacheLong, type CachingStrategy} from '@shopify/hydrogen'

/** Default Sanity API version with perspective stack support */
export const DEFAULT_API_VERSION = 'v2025-02-19'

/** Minimum API version required for Media Library video support */
export const MEDIA_LIBRARY_VIDEO_MIN_API_VERSION = 'v2025-03-25'

/** Default Hydrogen caching strategy for Sanity queries */
export const DEFAULT_CACHE_STRATEGY: CachingStrategy = CacheLong()

/** Sanity CDN base URL for files and images */
export const SANITY_CDN_URL = 'https://cdn.sanity.io'

/** Sanity Mux streaming domain for Media Library videos */
export const SANITY_MUX_STREAM_DOMAIN = 'm.sanity-cdn.com'
