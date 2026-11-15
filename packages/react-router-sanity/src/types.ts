import type {
  ClientParams,
  ClientPerspective,
  ClientReturn,
  ContentSourceMap,
  QueryParams,
  SanityClient,
  SyncTag,
} from '@sanity/client'

/**
 * Describes the preview state of the current request.
 *
 * @public
 */
export interface PreviewState {
  /** Tells if the request is in preview. In preview, the SDK reads drafts with the server token. */
  enabled: boolean
  /** Sets the perspective that queries use. Outside preview, the value is always `published`. */
  perspective: ClientPerspective
  /** Sets the content variant that queries use. Studio sets the variant in Presentation. */
  variant?: string
}

/**
 * Sets how long the app cache keeps a query result.
 *
 * @public
 */
export interface CacheStrategy {
  /** Sets the number of seconds that a cached result stays fresh. */
  maxAge: number
  /**
   * Sets the number of seconds after `maxAge` that the SDK serves a stale result.
   * The SDK refreshes the result in the background during this time.
   */
  staleWhileRevalidate: number
}

/**
 * Sets the options of one `sanity.fetch` call.
 *
 * @public
 */
export interface FetchOptions<Q extends string = string> {
  /** Sets the GROQ query. Use `defineQuery` so that TypeGen infers the result type. */
  query: Q
  /** Sets the query parameters. */
  params?: ClientParams<Q> | QueryParams
  /** Adds tags that invalidate the cached result. The SDK also adds the sync tags of the result. */
  tags?: string[]
  /**
   * Sets the app-cache strategy for this call. Set `false` to skip the app cache.
   *
   * @defaultValue the `cache.strategy` of the middleware config
   */
  cache?: CacheStrategy | false
  /**
   * Enables stega encoding of strings in preview. Outside preview, the SDK always disables stega.
   *
   * @defaultValue `true` in preview when `studioUrl` is set
   */
  stega?: boolean
  /** Overrides the perspective. Outside preview, the SDK ignores this value and uses `published`. */
  perspective?: ClientPerspective
}

/**
 * Describes the result of one `sanity.fetch` call.
 *
 * @public
 */
export interface FetchResult<R> {
  /** Contains the query result. */
  data: R
  /** Contains the sync tags of the result. Return them from the loader to enable live updates. */
  syncTags: SyncTag[]
  /** Contains the Content Source Map. Only preview requests with a `studioUrl` have a source map. */
  sourceMap?: ContentSourceMap
}

/**
 * Describes the serializable Sanity data that the root loader sends to the browser.
 *
 * The data contains no secret. The `browserToken` field exists only when you opt in with
 * `preview.browserToken`, and only in preview.
 *
 * @public
 */
export interface SanityRootData {
  /** Identifies the Sanity project. */
  projectId: string
  /** Identifies the dataset. */
  dataset: string
  /** Sets the API version of browser clients. */
  apiVersion: string
  /** Gives the API host of browser clients. Exists only when the client uses a custom host. */
  apiHost?: string
  /** Tells browser clients not to put the project ID in the host name. Exists only when `false`. */
  useProjectHostname?: false
  /** Gives the Studio URL. Visual editing uses it to build edit links. */
  studioUrl?: string
  /** Gives the preview state of the request. */
  preview: PreviewState
  /** Gives the path of the preview resource route. Visual editing posts perspective changes to it. */
  previewRoute: string
  /** Gives a Viewer token for live drafts. Exists only when you opt in, and only in preview. */
  browserToken?: string
  /** Gives the live settings for `<SanityLive>`. */
  live: {
    /** Tells `<SanityLive>` to wait for the Sync Tag Invalidate Function. */
    waitFor?: 'function'
  }
}

/**
 * Gives Sanity access to loaders, actions and middleware for one request.
 *
 * Read it with `context.get(sanityContext)`.
 *
 * @public
 */
export interface SanityRequestContext {
  /**
   * Gives the client for this request. In preview, the client uses the server token and the
   * preview perspective. Use `fetch` for queries. Use `client` for other API calls.
   */
  readonly client: SanityClient
  /** Gives the preview state of this request. */
  readonly preview: PreviewState
  /**
   * Fetches a GROQ query for the current request.
   *
   * In production, the client reads from the API CDN with `cacheMode: 'noStale'` and uses the app
   * cache. In preview, the client reads from the live API with the server token and skips the cache.
   *
   * @param options - The query, its parameters, and per-call overrides.
   * @returns The result, the sync tags of the result, and the source map in preview.
   * @throws RRS010 when the Sanity middleware is not registered on the root route.
   * @example
   * ```ts
   * const {data, syncTags} = await context.get(sanityContext).fetch({query: PAGE_QUERY, params})
   * return {page: data, syncTags}
   * ```
   */
  fetch<const Q extends string>(options: FetchOptions<Q>): Promise<FetchResult<ClientReturn<Q, unknown>>>
  /**
   * Fetches a GROQ query and types the result as `R`. Use this form when TypeGen is not set up.
   *
   * @param options - The query, its parameters, and per-call overrides.
   * @returns The result, the sync tags of the result, and the source map in preview.
   */
  fetch<R>(options: FetchOptions): Promise<FetchResult<R>>
  /** Returns the sync tags of every `fetch` call in this request so far. */
  syncTags(): SyncTag[]
  /**
   * Returns the serializable data for the root loader. Return it as `sanity` from the root loader.
   *
   * @example
   * ```ts
   * export function loader({context}: Route.LoaderArgs) {
   *   return {sanity: context.get(sanityContext).getRootData()}
   * }
   * ```
   */
  getRootData(): SanityRootData
}
