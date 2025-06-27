import {
  type Any,
  type ClientConfig,
  type ClientPerspective,
  type ClientReturn,
  createClient,
  type QueryParams,
  type QueryWithoutParams,
  type ResponseQueryOptions,
  SanityClient,
  validateApiPerspective,
} from '@sanity/client'
import {loadQuery, type QueryResponseInitial, setServerClient} from '@sanity/react-loader'
import {CacheNone, type CachingStrategy, createWithCache} from '@shopify/hydrogen'

import {DEFAULT_API_VERSION, DEFAULT_CACHE_STRATEGY} from './constants'
import type {SanitySession} from './preview'
import type {CacheActionFunctionParam, WaitUntil} from './types'
import {hashQuery} from './utils'

export type CreateSanityContextOptions = {
  request: Request

  cache?: Cache | undefined
  waitUntil?: WaitUntil | undefined

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
  defaultStrategy?: CachingStrategy | null

  /**
   * Configuration for enabling preview mode.
   */
  preview?: {
    token: string
    studioUrl: string
    session: SanitySession
  }
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

export interface SanityContext {
  /**
   * Query Sanity using the loader.
   * @see https://www.sanity.io/docs/loaders
   */

  loadQuery<Result = Any, Query extends string = string>(
    query: Query,
    params?: QueryParams | QueryWithoutParams,
    options?: LoadQueryOptions<ClientReturn<Query, Result>>,
  ): Promise<QueryResponseInitial<ClientReturn<Query, Result>>>

  client: SanityClient

  preview: CreateSanityContextOptions['preview'] | null
}

function getPerspective(session: SanitySession): ClientPerspective {
  if (!session.has('perspective')) {
    return 'published'
  }

  const perspective = session.get('perspective')!.split(',')
  validateApiPerspective(perspective)
  return perspective
}

/**
 * @public
 */
export function createSanityContext(options: CreateSanityContextOptions): SanityContext {
  const {cache, waitUntil = () => Promise.resolve(), request, preview, defaultStrategy} = options
  const withCache = cache ? createWithCache({cache, waitUntil, request}) : null
  let client =
    options.client instanceof SanityClient ? options.client : createClient(options.client)
  let enabled = false

  if (client.config().apiVersion === '1') {
    console.warn(
      `
No API version specified, defaulting to \`${DEFAULT_API_VERSION}\` which supports perspectives and Content Releases.
You can find the latest version in the Sanity changelog: https://www.sanity.io/changelog.
    `.trim(),
    )
    client = client.withConfig({apiVersion: DEFAULT_API_VERSION})
  }

  if (preview) {
    if (preview.token && preview.session) {
      const perspective = getPerspective(preview.session)
      client = client.withConfig({
        useCdn: false,
        token: preview.token,
        perspective,
        stega: {
          ...client.config().stega,
          enabled: true,
          studioUrl: preview.studioUrl,
        },
      })

      enabled = true
    } else {
      if (!preview.token) {
        console.error('Enabling preview mode requires a token.')
      }

      if (!preview.session) {
        console.error('Enabling preview mode requires a session.')
      }
    }
  }

  setServerClient(client)

  const sanity = {
    async loadQuery<Result = Any, Query extends string = string>(
      query: Query,
      params: QueryParams | QueryWithoutParams,
      loaderOptions?: LoadQueryOptions<ClientReturn<Query, Result>>,
    ): Promise<QueryResponseInitial<ClientReturn<Query, Result>>> {
      if (!withCache) {
        return await loadQuery<ClientReturn<Query, Result>>(query, params, loaderOptions)
      }

      // Don't store response if preview is enabled
      const cacheStrategy = enabled
        ? CacheNone()
        : loaderOptions?.hydrogen?.cache || defaultStrategy || DEFAULT_CACHE_STRATEGY

      const queryHash = await hashQuery(query, params)
      const shouldCacheResult = loaderOptions?.hydrogen?.shouldCacheResult ?? (() => true)

      return await withCache.run(
        {cacheKey: queryHash, cacheStrategy, shouldCacheResult},
        async ({
          addDebugData,
        }: CacheActionFunctionParam): Promise<
          QueryResponseInitial<ClientReturn<Query, Result>>
        > => {
          // Name displayed in the subrequest profiler
          const displayName = loaderOptions?.hydrogen?.debug?.displayName || 'query Sanity'

          addDebugData({
            displayName,
          })

          return await loadQuery<ClientReturn<Query, Result>>(query, params, loaderOptions)
        },
      )
    },
    client,
    preview: enabled ? preview : null,
  }

  return sanity
}
