import type {CacheShort, HydrogenSession} from '@shopify/hydrogen'

import type {Sanity} from './loader'

/** @see https://shopify.dev/docs/custom-storefronts/hydrogen/data-fetching/cache#caching-strategies */
export type CachingStrategy = ReturnType<typeof CacheShort>

type EnvLike = {
  SANITY_PROJECT_ID: string
  SANITY_DATASET: string
  SANITY_API_VERSION: string
  SANITY_API_TOKEN: string
}

declare module '@shopify/remix-oxygen' {
  /**
   * Declare local additions to the Remix loader context.
   */
  export interface AppLoadContext {
    env: EnvLike
    session: HydrogenSession
    sanity: Sanity
  }
}
