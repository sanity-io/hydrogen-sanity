import {
  type Any,
  type ClientConfig,
  type ClientParams,
  type ClientPerspective,
  type ClientReturn,
  createClient,
  type QueryParams,
  type QueryWithoutParams,
  type ResponseQueryOptions,
  SanityClient,
} from '@sanity/client'
import type {QueryResponseInitial} from '@sanity/react-loader'
import type {CacheInstance, CachingStrategy} from '@shopify/hydrogen'
import {createElement, type PropsWithChildren, type ReactNode} from 'react'

import {createCachedRun, type CachedRunKey} from './cache'
import {DEFAULT_API_VERSION, DEFAULT_CACHE_STRATEGY} from './constants'
import type {SanityPreviewSession} from './preview/session'
import {isPreviewEnabled} from './preview/utils'
import {SanityProvider, type SanityProviderValue} from './provider'
import type {HydrogenSession, WaitUntil} from './types'
import {getPerspective, getPerspectiveFromUrl} from './utils'
import {supportsPerspectiveStack} from './utils'

let didWarnAboutNoApiVersion = false
let didWarnAboutNoPerspectiveSupport = false
let didWarnAboutLoadQuery = false

export type CreateSanityContextOptions = {
  request: Request

  cache?: CacheInstance | undefined
  waitUntil?: WaitUntil | undefined

  /**
   * Sanity client or configuration to use.
   */
  client: SanityClient | ClientConfig

  /**
   * The default caching strategy for `query`, `fetch` and `loadQuery` subrequests.
   * @see https://shopify.dev/docs/custom-storefronts/hydrogen/caching#caching-strategies
   *
   * @defaultValue `Cache.long()`
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
     * Whether to cache the result of the query or not.
     * @defaultValue `() => true`
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
     * Whether to cache the query result. Return `false` to skip caching, for example for an
     * empty result.
     * @defaultValue `() => true`
     */
    shouldCacheResult?: (value: T) => boolean
  }
}

/**
 * Options for `query`. Outside preview mode `query` calls `fetch`, so `shouldCacheResult`
 * receives the query result. Preview mode doesn't cache.
 */
export type QueryOptions<T> = Omit<LoadQueryOptions<T>, 'hydrogen'> & FetchOptions<T>

export interface SanityContext {
  /**
   * Query Sanity using the loader.
   * @see https://www.sanity.io/docs/loaders
   */
  loadQuery<Result = Any, Query extends string = string>(
    query: Query,
    params?: ClientParams<Query, QueryParams | QueryWithoutParams>,
    options?: LoadQueryOptions<ClientReturn<Query, Result>>,
  ): Promise<QueryResponseInitial<ClientReturn<Query, Result>>>

  /**
   * Query Sanity using direct client fetch with Hydrogen caching.
   * Use this when you need direct client results without react-loader integration.
   * Automatically disables caching in preview mode for real-time updates.
   */
  fetch<Result = Any, Query extends string = string>(
    query: Query,
    params?: ClientParams<Query, QueryParams | QueryWithoutParams>,
    options?: FetchOptions<ClientReturn<Query, Result>>,
  ): Promise<ClientReturn<Query, Result>>

  /**
   * Conditionally query Sanity using either loadQuery (for preview mode) or fetch (for static mode).
   * This optimizes bundle size by only loading `@sanity/react-loader` dependencies when in preview mode.
   */
  query<Result = Any, Query extends string = string>(
    query: Query,
    params?: ClientParams<Query, QueryParams | QueryWithoutParams>,
    options?: QueryOptions<ClientReturn<Query, Result>>,
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
 * Fetches a query in the shape that `@sanity/react-loader`'s `loadQuery` returns.
 *
 * This does not call react-loader's `loadQuery`: it reads a module-level client that
 * `setServerClient` replaces, so concurrent requests in one worker would share it, and a
 * public request could read drafts with a preview request's token.
 */
async function fetchQueryResponse<T>(
  client: SanityClient,
  query: string,
  params: QueryParams | QueryWithoutParams | undefined,
  options: LoadQueryOptions<T> | undefined,
  previewEnabled: boolean,
): Promise<QueryResponseInitial<T>> {
  const perspective: ClientPerspective =
    options?.perspective ?? client.config().perspective ?? 'published'
  const {result, resultSourceMap} = await client.fetch<T>(query, params ?? {}, {
    filterResponse: false,
    perspective,
    ...(options?.useCdn === undefined ? {} : {useCdn: options.useCdn}),
    ...(options?.stega === undefined ? {} : {stega: options.stega}),
    ...(options?.headers === undefined ? {} : {headers: options.headers}),
    ...(options?.tag === undefined ? {} : {tag: options.tag}),
    // Preview responses feed `useQuery` and overlays, which need keyed source map paths.
    ...(previewEnabled ? {useCdn: false, resultSourceMap: 'withKeyArraySelector'} : {}),
  })
  return {data: result, sourceMap: resultSourceMap, perspective}
}

/**
 * @public
 */
export async function createSanityContext(
  options: CreateSanityContextOptions,
): Promise<SanityContext> {
  const {cache, waitUntil = () => Promise.resolve(), request, preview, defaultStrategy} = options
  const cachedRun = cache ? createCachedRun({cache, waitUntil}) : null
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

      // Prefer URL param over session — the cookie may lag behind the iframe reload.
      const urlPerspective = getPerspectiveFromUrl(request.url)

      if (
        urlPerspective !== undefined &&
        !(Array.isArray(urlPerspective) && !supportsPerspectiveStack(apiVersion))
      ) {
        perspective = urlPerspective
      } else if (supportsPerspectiveStack(apiVersion)) {
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
    }
  }

  /**
   * Scopes a cache entry to the method (`loadQuery` and `fetch` cache different shapes), the
   * client configuration and the perspective, so two contexts never share an entry.
   */
  function cacheKey(
    method: 'loadQuery' | 'fetch',
    query: string,
    params: QueryParams | QueryWithoutParams,
    perspective: ClientPerspective | undefined,
  ): CachedRunKey {
    const config = client.config()
    const resolvedPerspective = perspective ?? config.perspective ?? 'published'
    return [
      'hydrogen-sanity',
      method,
      config.apiHost,
      config.projectId ?? null,
      config.dataset ?? null,
      config.apiVersion,
      Array.isArray(resolvedPerspective) ? resolvedPerspective.join(',') : resolvedPerspective,
      query,
      JSON.stringify(params ?? {}),
    ]
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
  const studioUrl = client.config().stega?.studioUrl
  if (previewEnabled && typeof studioUrl === 'string') {
    providerValue.studioUrl = studioUrl
  }

  return {
    /**
     * Loads a Sanity query with client-side loader support and Hydrogen cache integration.
     * Bypasses Hydrogen cache in preview mode.
     */
    async loadQuery<Result = Any, Query extends string = string>(
      query: Query,
      params: QueryParams | QueryWithoutParams,
      loaderOptions?: LoadQueryOptions<ClientReturn<Query, Result>>,
    ): Promise<QueryResponseInitial<ClientReturn<Query, Result>>> {
      // Warn users to migrate to `query` method when using loadQuery outside preview mode
      if (!previewEnabled && process.env.NODE_ENV === 'development' && !didWarnAboutLoadQuery) {
        console.warn(
          `\`loadQuery\` is being called outside of preview mode. Consider using \`query\` instead, which automatically handles both preview and production modes efficiently, or use \`fetch\`. \`loadQuery\` is intended to be called conditionally in preview and visual editing contexts.`,
        )
        didWarnAboutLoadQuery = true
      }

      const run = () =>
        fetchQueryResponse<ClientReturn<Query, Result>>(
          client,
          query,
          params,
          loaderOptions,
          previewEnabled,
        )

      if (!cachedRun || previewEnabled) {
        return await run()
      }

      const cacheStrategy =
        loaderOptions?.hydrogen?.cache || defaultStrategy || DEFAULT_CACHE_STRATEGY
      const shouldCacheResult = loaderOptions?.hydrogen?.shouldCacheResult ?? (() => true)

      return await cachedRun(
        {
          key: cacheKey('loadQuery', query, params, loaderOptions?.perspective),
          strategy: cacheStrategy,
          shouldCache: shouldCacheResult,
        },
        run,
      )
    },

    /**
     * Executes a Sanity query with Hydrogen cache integration.
     * Direct client fetch without loader integration. Bypasses cache in preview mode.
     */
    async fetch<Result = Any, Query extends string = string>(
      query: Query,
      params: QueryParams | QueryWithoutParams = {},
      options?: Pick<
        FetchOptions<ClientReturn<Query, Result>>,
        'perspective' | 'hydrogen' | 'useCdn' | 'headers' | 'tag' | 'cacheMode'
      >,
    ): Promise<ClientReturn<Query, Result>> {
      // Hydrogen's cache already serves stale content while it revalidates, so a stale API CDN
      // response would stack a second window of staleness. The client applies `cacheMode` only
      // to API CDN requests. Pass `cacheMode: undefined` to opt out.
      const fetchOptions: NonNullable<typeof options> = {cacheMode: 'noStale', ...options}

      if (!cachedRun || previewEnabled) {
        return await client.fetch<ClientReturn<Query, Result>>(query, params, fetchOptions)
      }

      const cacheStrategy =
        fetchOptions?.hydrogen?.cache || defaultStrategy || DEFAULT_CACHE_STRATEGY
      const shouldCacheResult = fetchOptions.hydrogen?.shouldCacheResult ?? (() => true)

      return await cachedRun(
        {
          key: cacheKey('fetch', query, params, fetchOptions.perspective),
          strategy: cacheStrategy,
          shouldCache: shouldCacheResult,
        },
        async (): Promise<ClientReturn<Query, Result>> => {
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
      queryOptions?: QueryOptions<ClientReturn<Query, Result>>,
    ): Promise<QueryResponseInitial<ClientReturn<Query, Result>> | ClientReturn<Query, Result>> {
      if (previewEnabled) {
        // Preview mode doesn't cache, so the `hydrogen` options don't apply
        const loadQueryOptions = queryOptions && {...queryOptions, hydrogen: undefined}
        return await this.loadQuery<Result, Query>(query, params ?? {}, loadQueryOptions)
      }
      return await this.fetch<Result, Query>(query, params, queryOptions)
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
  } satisfies SanityContext
}
