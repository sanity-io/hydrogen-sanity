import type {CacheShort} from '@shopify/hydrogen'

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
