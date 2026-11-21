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
  /**
   * The incoming request. Preview mode reads the perspective from its URL.
   */
  request: Request

  /**
   * Hydrogen's cache, for example `await caches.open('hydrogen-v1')`. Without it, queries aren't
   * cached.
   */
  cache?: CacheInstance | undefined

  /**
   * Keeps the worker alive while the cache revalidates. Pass the execution context's `waitUntil`.
   */
  waitUntil?: WaitUntil | undefined

  /**
   * Sanity client or configuration to use. Keep the default `useCdn: true`: `query` and `fetch`
   * read fresh content from the API CDN, and preview mode switches to the live API.
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
   * Enables preview mode. Leave it `undefined` when the preview token or session secret isn't
   * set, and the context reads published content only.
   */
  preview?: {
    /** A Sanity token with the Viewer role or higher, to read drafts. */
    token: string
    /** The preview session, from `PreviewSession.init(request, [env.SESSION_SECRET])`. */
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
   * Queries Sanity and returns the `{data, sourceMap, perspective}` shape that
   * `useQuery` takes as `initial`. Use it in preview mode only; `query` picks it for you.
   * Outside preview mode, the result is cached with Hydrogen's cache.
   * @see https://www.sanity.io/docs/loaders
   */
  loadQuery<Result = Any, Query extends string = string>(
    query: Query,
    params?: ClientParams<Query, QueryParams | QueryWithoutParams>,
    options?: LoadQueryOptions<ClientReturn<Query, Result>>,
  ): Promise<QueryResponseInitial<ClientReturn<Query, Result>>>

  /**
   * Queries Sanity and returns the result, cached with Hydrogen's cache. Use it for data that
   * doesn't need live preview. Preview mode reads drafts and skips the cache.
   */
  fetch<Result = Any, Query extends string = string>(
    query: Query,
    params?: ClientParams<Query, QueryParams | QueryWithoutParams>,
    options?: FetchOptions<ClientReturn<Query, Result>>,
  ): Promise<ClientReturn<Query, Result>>

  /**
   * The recommended way to query Sanity in a loader. Pass the return value to `<Query>` as
   * `options.initial`.
   *
   * Outside preview mode it calls `fetch` and returns the result. In preview mode it calls
   * `loadQuery` and returns `{data, sourceMap, perspective}`, so `<Query>` can render live updates.
   *
   * @example
   * ```ts
   * export async function loader({context}: Route.LoaderArgs) {
   *   const initial = await context.sanity.query(PAGE_QUERY, {slug: 'home'})
   *   return {initial}
   * }
   * ```
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

  /**
   * Wraps the app in `entry.server.tsx`, so `<Sanity>`, `Image` and the preview components can
   * read the configuration while rendering.
   */
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
 * Creates the per-request Sanity context. Call it in `server.ts` and set the result as
 * `context.sanity`, before React Router handles the request.
 *
 * @example
 * ```ts
 * routerContext.sanity = await createSanityContext({
 *   request,
 *   cache: routerContext.cache,
 *   waitUntil: routerContext.waitUntil,
 *   client: {projectId: env.SANITY_PROJECT_ID, dataset: env.SANITY_DATASET, apiVersion: '2025-02-19'},
 * })
 * ```
 *
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

  const sanity = {
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
      // Read the methods from `sanity`, not `this`, so a destructured `query` still works.
      if (previewEnabled) {
        // Preview mode doesn't cache, so the `hydrogen` options don't apply
        const loadQueryOptions = queryOptions && {...queryOptions, hydrogen: undefined}
        return await sanity.loadQuery<Result, Query>(query, params ?? {}, loadQueryOptions)
      }
      return await sanity.fetch<Result, Query>(query, params, queryOptions)
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

  return sanity
}
