import type {CacheShort, HydrogenSession} from '@shopify/hydrogen'

import {Sanity} from './loader'

interface ExecutionContext {
  waitUntil(promise: Promise<any>): void
}

export type EnvironmentOptions = {
  /**
   * A Cache API instance.
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Cache
   */
  cache: Cache
  /**
   * A runtime utility for serverless environments
   * @see https://developers.cloudflare.com/workers/runtime-apis/fetch-event/#waituntil
   */
  waitUntil: ExecutionContext['waitUntil']
}

/** @see https://shopify.dev/docs/custom-storefronts/hydrogen/data-fetching/cache#caching-strategies */
export type CachingStrategy = ReturnType<typeof CacheShort>

export type AppSessionLike = HydrogenSession & {
  destroy(): Promise<void>
  commit(): Promise<void>
}

export type EnvLike = {
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
    session: AppSessionLike
    sanity: Sanity
  }
}
