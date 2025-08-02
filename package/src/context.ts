import {loadQuery, type QueryResponseInitial, setServerClient} from '@sanity/react-loader'
import {
  CacheNone,
  type CachingStrategy,
  createWithCache,
  type HydrogenSession,
  type WithCache,
} from '@shopify/hydrogen'

import {
  type ClientConfig,
  type ClientPerspective,
  createClient,
  type QueryParams,
  type QueryWithoutParams,
  type ResponseQueryOptions,
  SanityClient,
} from './client'
import {DEFAULT_API_VERSION, DEFAULT_CACHE_STRATEGY} from './constants'
import type {SanityPreviewSession} from './preview/session'
import {getPerspective} from './utils'
import {hashQuery, supportsPerspectiveStack} from './utils'

type WaitUntil = (promise: Promise<unknown>) => void

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
  preview?:
    | {
        /**
         * @deprecated Use session-based preview detection instead.
         */
        enabled: boolean
        token: string
        studioUrl: string
      }
    | {
        token: string
        studioUrl: string
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
     *
     * NOTE: Only available in recent version of Hydrogen.
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

export type SanityContext = {
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

  preview?: CreateSanityContextOptions['preview'] & {
    /**
     * Whether preview mode is currently enabled based on session detection
     */
    enabled: boolean
  }
}

/**
 * @public
 */
export function createSanityContext(options: CreateSanityContextOptions): SanityContext {
  const {cache, waitUntil = () => Promise.resolve(), request, preview, defaultStrategy} = options
  const withCache = cache ? createWithCache({cache, waitUntil, request}) : null
  let client =
    options.client instanceof SanityClient ? options.client : createClient(options.client)

  if (client.config().apiVersion === '1') {
    console.warn(
      `
No API version specified, defaulting to \`${DEFAULT_API_VERSION}\` which supports perspectives and Content Releases.
You can find the latest version in the Sanity changelog: https://www.sanity.io/changelog.
    `.trim(),
    )
    client = client.withConfig({apiVersion: DEFAULT_API_VERSION})
  }

  // Determine if preview is enabled using session-based detection or legacy enabled flag
  let isPreviewEnabled = false
  if (preview) {
    if (!preview.token) {
      throw new Error('Enabling preview mode requires a token.')
    }

    if ('session' in preview) {
      isPreviewEnabled = preview.session.get('projectId') === client.config().projectId
    } else {
      isPreviewEnabled = preview.enabled
    }

    if (isPreviewEnabled) {
      const apiVersion = client.config().apiVersion
      let perspective: ClientPerspective
      if (supportsPerspectiveStack(apiVersion)) {
        if ('session' in preview) {
          perspective = getPerspective(preview.session)
        } else {
          perspective = 'drafts'
        }
      } else {
        console.warn(
          `API version \`${apiVersion}\` does not support perspective stacks. Using \`previewDrafts\` perspective. Consider upgrading to \`v2025-02-19\` or later for full perspective support.`,
        )
        perspective = 'previewDrafts'
      }

      const previewClient = client.withConfig({
        useCdn: false,
        token: preview.token,
        perspective,
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
  } else {
    setServerClient(client)
  }

  const sanity = {
    async loadQuery<T>(
      query: string,
      params: QueryParams | QueryWithoutParams,
      loaderOptions?: LoadQueryOptions<T>,
    ): Promise<QueryResponseInitial<T>> {
      if (!withCache) {
        return await loadQuery<T>(query, params, loaderOptions)
      }

      // Don't store response if preview is enabled
      const cacheStrategy = isPreviewEnabled
        ? CacheNone()
        : loaderOptions?.hydrogen?.cache || defaultStrategy || DEFAULT_CACHE_STRATEGY

      const queryHash = await hashQuery(query, params)
      const shouldCacheResult = loaderOptions?.hydrogen?.shouldCacheResult ?? (() => true)

      const runWithCache = async function runWithCache(
        args?: Parameters<Parameters<WithCache['run']>[1]>[0],
      ): Promise<QueryResponseInitial<T>> {
        // eslint-disable-next-line no-process-env
        if (process.env.NODE_ENV === 'development' && args?.addDebugData) {
          // Name displayed in the subrequest profiler
          const displayName = loaderOptions?.hydrogen?.debug?.displayName || 'query Sanity'

          args.addDebugData({
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
    preview: preview ? {...preview, enabled: isPreviewEnabled} : undefined,
  }

  return sanity
}
