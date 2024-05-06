import type {CacheShort} from '@shopify/hydrogen'

/** @see https://shopify.dev/docs/custom-storefronts/hydrogen/data-fetching/cache#caching-strategies */
export type CachingStrategy = ReturnType<typeof CacheShort>
