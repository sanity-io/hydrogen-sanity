import type {CacheShort, HydrogenSession} from '@shopify/hydrogen'

import type {Sanity} from './loader'

/** @see https://shopify.dev/docs/custom-storefronts/hydrogen/data-fetching/cache#caching-strategies */
export type CachingStrategy = ReturnType<typeof CacheShort>

declare module '@shopify/remix-oxygen' {
  /**
   * Declare local additions to the Remix loader context.
   */
  export interface AppLoadContext {
    session: HydrogenSession
    sanity: Sanity
  }
}
