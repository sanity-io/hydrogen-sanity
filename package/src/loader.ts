import {loadQuery, type QueryResponseInitial, setServerClient} from '@sanity/react-loader'
import {CacheLong, CacheNone, type CachingStrategy, type WithCache} from '@shopify/hydrogen'

import {
  type ClientConfig,
  createClient,
  type QueryParams,
  type QueryWithoutParams,
  type ResponseQueryOptions,
  SanityClient,
} from './client'
import {hashQuery} from './utils'

const DEFAULT_CACHE_STRATEGY = CacheLong()

export type CreateSanityLoaderOptions = {
  /**
   * Cache control utility from `@shopify/hydrogen`.
   * @see https://shopify.dev/docs/custom-storefronts/hydrogen/caching/third-party
   */
  withCache: WithCache

  /**
   * Sanity client or configuration to use.
   */
  client: SanityClient | ClientConfig

  /**
   * The default caching strategy to use for `loadQuery` subrequests.
   * @see https://shopify.dev/docs/custom-storefronts/hydrogen/caching#caching-strategies
   *
   * Defaults to `CacheLong`
   */
  strategy?: CachingStrategy | null

  /**
   * Configuration for enabling preview mode.
   */
  preview?: {enabled: boolean; token: string; studioUrl: string}
}

interface RequestInit {
  hydrogen?: {
    /**
     * The caching strategy to use for the subrequest.
     * @see https://shopify.dev/docs/custom-storefronts/hydrogen/caching#caching-strategies
     */
    cache?: CachingStrategy

    /**
     * Optional debugging information to be displayed in the subrequest profiler.
     * @see https://shopify.dev/docs/custom-storefronts/hydrogen/debugging/subrequest-profiler#how-to-provide-more-debug-information-for-a-request
     */
    debug?: {
      displayName: string
    }
  }
}

type HydrogenResponseQueryOptions = Omit<ResponseQueryOptions, 'next' | 'cache'> & {
  hydrogen?: 'hydrogen' extends keyof RequestInit ? RequestInit['hydrogen'] : never
}

type LoadQueryOptions<T> = Pick<
  HydrogenResponseQueryOptions,
  'perspective' | 'hydrogen' | 'useCdn' | 'stega' | 'headers' | 'tag'
> & {
  hydrogen?: {
    /**
     * Whether to cache the result of the query or not.
     * @defaultValue () => true
     */
    shouldCacheResult?: (value: QueryResponseInitial<T>) => boolean
  }
}

export type SanityLoader = {
  /**
   * Query Sanity using the loader.
   * @see https://www.sanity.io/docs/loaders
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loadQuery<T = any>(
    query: string,
    params?: QueryParams,
    options?: LoadQueryOptions<T>,
  ): Promise<QueryResponseInitial<T>>

  client: SanityClient

  preview?: CreateSanityLoaderOptions['preview']
}

/**
 * @deprecated Use `createSanityContext` instead
 */
export function createSanityLoader(options: CreateSanityLoaderOptions): SanityLoader {
  const {withCache, preview, strategy} = options
  let client =
    options.client instanceof SanityClient ? options.client : createClient(options.client)

  if (client.config().apiVersion === '1') {
    console.warn(
      'No API version specified, defaulting to `v2022-03-07` which supports perspectives.\nYou can find the latest version in the Sanity changelog: https://www.sanity.io/changelog',
    )
    client = client.withConfig({apiVersion: 'v2022-03-07'})
  }

  if (preview && preview.enabled) {
    if (!preview.token) {
      throw new Error('Enabling preview mode requires a token.')
    }

    const previewClient = client.withConfig({
      useCdn: false,
      token: preview.token,
      perspective: 'previewDrafts' as const,
      stega: {
        ...client.config().stega,
        enabled: true,
        studioUrl: preview.studioUrl,
      },
    })

    setServerClient(previewClient)
  } else {
    setServerClient(client)
  }

  const sanity = {
    async loadQuery<T>(
      query: string,
      params: QueryParams | QueryWithoutParams,
      loaderOptions?: LoadQueryOptions<T>,
    ): Promise<QueryResponseInitial<T>> {
      // Don't store response if preview is enabled
      const cacheStrategy =
        preview && preview.enabled
          ? CacheNone()
          : loaderOptions?.hydrogen?.cache || strategy || DEFAULT_CACHE_STRATEGY

      const queryHash = await hashQuery(query, params)

      const shouldCacheResult = loaderOptions?.hydrogen?.shouldCacheResult ?? (() => true)

      const runWithCache = async function runWithCache({
        addDebugData,
      }: Parameters<Parameters<WithCache['run']>[1]>[0]): Promise<QueryResponseInitial<T>> {
        // eslint-disable-next-line no-process-env
        if (process.env.NODE_ENV === 'development') {
          // Name displayed in the subrequest profiler
          const displayName = loaderOptions?.hydrogen?.debug?.displayName || 'query Sanity'

          addDebugData({
            displayName,
          })
        }

        return await loadQuery<T>(query, params, loaderOptions)
      }

      return await ('run' in withCache
        ? withCache.run({cacheKey: queryHash, cacheStrategy, shouldCacheResult}, runWithCache)
        : // @ts-expect-error for compatibility, remove in next major
          withCache(queryHash, cacheStrategy, runWithCache))
    },
    client,
    preview,
  }

  return sanity
}
