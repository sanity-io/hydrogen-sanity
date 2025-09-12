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
} from '@sanity/client'
import type {QueryResponseInitial} from '@sanity/react-loader'
import {type CachingStrategy, createWithCache, type HydrogenSession} from '@shopify/hydrogen'
import {createElement, type PropsWithChildren, type ReactNode} from 'react'

import {DEFAULT_API_VERSION, DEFAULT_CACHE_STRATEGY} from './constants'
import type {SanityPreviewSession} from './preview/session'
import {isPreviewEnabled} from './preview/utils'
import {SanityProvider, type SanityProviderValue} from './provider'
import type {CacheActionFunctionParam, WaitUntil} from './types'
import {getPerspective} from './utils'
import {hashQuery, supportsPerspectiveStack} from './utils'

let didWarnAboutNoApiVersion = false
let didWarnAboutNoPerspectiveSupport = false

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
    session: SanityPreviewSession | HydrogenSession
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

export type LoadQueryOptions<T> = Pick<
  HydrogenResponseQueryOptions,
  'perspective' | 'hydrogen' | 'useCdn' | 'stega' | 'headers' | 'tag'
> & {
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

    /**
     * Whether to cache the result of the query or not.
     * @defaultValue () => true
     */
    shouldCacheResult?: (value: QueryResponseInitial<T>) => boolean
  }
}

export type FetchOptions<T> = HydrogenResponseQueryOptions & {
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

  /**
   * Query Sanity using direct client fetch with Hydrogen caching.
   * Use this when you need direct client results without react-loader integration.
   * Automatically disables caching in preview mode for real-time updates.
   */
  fetch<Result = Any, Query extends string = string>(
    query: Query,
    params?: QueryParams | QueryWithoutParams,
    options?: FetchOptions<Result>,
  ): Promise<ClientReturn<Query, Result>>

  /**
   * Conditionally query Sanity using either loadQuery (for preview mode) or fetch (for static mode).
   * This optimizes bundle size by only loading @sanity/react-loader dependencies when in preview mode.
   */
  query<Result = Any, Query extends string = string>(
    query: Query,
    params?: QueryParams | QueryWithoutParams,
    options?: LoadQueryOptions<ClientReturn<Query, Result>> & FetchOptions<Result>,
  ): Promise<QueryResponseInitial<ClientReturn<Query, Result>> | ClientReturn<Query, Result>>

  /**
   * The Sanity client, automatically configured for preview mode when enabled.
   * Uses preview token, perspective, and CDN settings based on session state.
   */
  client: SanityClient

  preview?: CreateSanityContextOptions['preview'] & {
    /**
     * Whether preview mode is currently enabled based on session detection
     */
    enabled: boolean
  }

  SanityProvider: (props: PropsWithChildren<object>) => ReactNode
}

/**
 * @public
 */
export async function createSanityContext(
  options: CreateSanityContextOptions,
): Promise<SanityContext> {
  const {cache, waitUntil = () => Promise.resolve(), request, preview, defaultStrategy} = options
  const withCache = cache ? createWithCache({cache, waitUntil, request}) : null
  let client =
    options.client instanceof SanityClient ? options.client : createClient(options.client)

  if (client.config().apiVersion === '1') {
    if (process.env.NODE_ENV === 'development' && !didWarnAboutNoApiVersion) {
      console.warn(
        `
No API version specified, defaulting to \`${DEFAULT_API_VERSION}\` which supports perspectives and Content Releases.
You can find the latest version in the Sanity changelog: https://www.sanity.io/changelog.
    `.trim(),
      )

      didWarnAboutNoApiVersion = true
    }

    client = client.withConfig({apiVersion: DEFAULT_API_VERSION})
  }

  // Determine if preview is enabled and configure the client accordingly
  let previewEnabled = false
  if (preview) {
    if (!preview.token) {
      throw new Error('Enabling preview mode requires a token.')
    }

    previewEnabled = isPreviewEnabled(client.config().projectId!, preview.session)

    if (previewEnabled) {
      const apiVersion = client.config().apiVersion
      let perspective: ClientPerspective
      if (supportsPerspectiveStack(apiVersion)) {
        perspective = getPerspective(preview.session)
      } else {
        if (process.env.NODE_ENV === 'development' && !didWarnAboutNoPerspectiveSupport) {
          console.warn(
            `API version \`${apiVersion}\` does not support perspective stacks. Using \`previewDrafts\` perspective. Consider upgrading to \`v2025-02-19\` or later for full perspective support.`,
          )

          didWarnAboutNoPerspectiveSupport = true
        }
        perspective = 'previewDrafts'
      }

      client = client.withConfig({
        useCdn: false,
        token: preview.token,
        perspective,
      })

      // Set server client for react-loader when in preview mode
      const {setServerClient} = await import('@sanity/react-loader')
      setServerClient(client)
    }
  }

  // Server client will be initialized lazily on first loadQuery call

  const {apiHost, projectId, dataset, apiVersion} = client.config()
  const providerValue: SanityProviderValue = {
    projectId: projectId!,
    dataset: dataset!,
    apiHost,
    apiVersion: apiVersion!,
    previewEnabled,
    perspective: client.config().perspective || 'published',
    stegaEnabled: client.config().stega?.enabled ?? false,
  }

  const sanityContext: SanityContext = {
    /**
     * Loads a Sanity query with client-side loader support and Hydrogen cache integration.
     * Bypasses Hydrogen cache in preview mode.
     */
    async loadQuery<Result = Any, Query extends string = string>(
      query: Query,
      params: QueryParams | QueryWithoutParams,
      loaderOptions?: LoadQueryOptions<ClientReturn<Query, Result>>,
    ): Promise<QueryResponseInitial<ClientReturn<Query, Result>>> {
      if (!withCache || previewEnabled) {
        const {loadQuery} = await import('@sanity/react-loader')
        return await loadQuery<ClientReturn<Query, Result>>(query, params, loaderOptions)
      }

      const cacheStrategy =
        loaderOptions?.hydrogen?.cache || defaultStrategy || DEFAULT_CACHE_STRATEGY
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

          const {loadQuery} = await import('@sanity/react-loader')
          return await loadQuery<ClientReturn<Query, Result>>(query, params, loaderOptions)
        },
      )
    },

    /**
     * Executes a Sanity query with Hydrogen cache integration.
     * Direct client fetch without loader integration. Bypasses cache in preview mode.
     */
    async fetch<Result = Any, Query extends string = string>(
      query: Query,
      params: QueryParams | QueryWithoutParams = {},
      fetchOptions?: Pick<
        LoadQueryOptions<Result>,
        'perspective' | 'hydrogen' | 'useCdn' | 'headers' | 'tag'
      >,
    ): Promise<ClientReturn<Query, Result>> {
      if (!withCache || previewEnabled) {
        return await client.fetch<ClientReturn<Query, Result>>(query, params, fetchOptions)
      }

      const cacheStrategy =
        fetchOptions?.hydrogen?.cache || defaultStrategy || DEFAULT_CACHE_STRATEGY
      const queryHash = await hashQuery(query, params)

      return await withCache.run(
        {cacheKey: queryHash, cacheStrategy, shouldCacheResult: () => true},
        async ({addDebugData}: CacheActionFunctionParam): Promise<ClientReturn<Query, Result>> => {
          // Name displayed in the subrequest profiler
          const displayName = fetchOptions?.hydrogen?.debug?.displayName || 'fetch Sanity'

          addDebugData({
            displayName,
          })

          return await client.fetch<ClientReturn<Query, Result>>(query, params, fetchOptions)
        },
      )
    },

    /**
     * Automatic query method that automatically adapts based on preview mode state.
     * Uses `loadQuery` (with client-side loader integration) when preview is enabled, `fetch` otherwise.
     * Bypasses cache in preview mode.
     */
    async query<Result = Any, Query extends string = string>(
      query: Query,
      params?: QueryParams | QueryWithoutParams,
      queryOptions?: LoadQueryOptions<ClientReturn<Query, Result>> & FetchOptions<Result>,
    ): Promise<QueryResponseInitial<ClientReturn<Query, Result>> | ClientReturn<Query, Result>> {
      return await (previewEnabled ? this.loadQuery : this.fetch)(query, params, queryOptions)
    },

    /** The configured Sanity client instance */
    client,

    /** Preview configuration with session-based state, undefined when preview is not configured */
    preview: preview ? {...preview, enabled: previewEnabled} : undefined,

    /**
     * React Provider component that serializes Sanity configuration across server-client boundary.
     */
    SanityProvider({children}: PropsWithChildren<object>) {
      return createElement(
        SanityProvider,
        {
          value: Object.freeze(providerValue),
        },
        children,
      )
    },
  }

  return sanityContext
}
