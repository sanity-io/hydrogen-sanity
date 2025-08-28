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
import {loadQuery, type QueryResponseInitial, setServerClient} from '@sanity/react-loader'
import {
  CacheNone,
  type CachingStrategy,
  createWithCache,
  type HydrogenSession,
} from '@shopify/hydrogen'
import {createElement, type PropsWithChildren, type ReactNode} from 'react'

import {DEFAULT_API_VERSION, DEFAULT_CACHE_STRATEGY} from './constants'
import type {SanityPreviewSession} from './preview/session'
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

  preview?: CreateSanityContextOptions['preview'] & {
    /**
     * Whether preview mode is currently enabled based on session detection
     */
    enabled: boolean

    /**
     * The client used for preview requests.
     */
    client: SanityClient
  }

  SanityProvider: (props: PropsWithChildren<object>) => ReactNode
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

  // Determine if preview is enabled using session-based detection or legacy enabled flag
  let isPreviewEnabled = false
  let previewClient: SanityClient | undefined
  if (preview) {
    if (!preview.token) {
      throw new Error('Enabling preview mode requires a token.')
    }

    const sessionProjectId = preview.session?.get('projectId')
    isPreviewEnabled = Boolean(sessionProjectId && sessionProjectId === client.config().projectId)

    if (isPreviewEnabled) {
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

      previewClient = client.withConfig({
        useCdn: false,
        token: preview.token,
        perspective,
        stega: {
          ...client.config().stega,
          enabled: true,
          studioUrl: preview.studioUrl,
        },
      })
    }
  }

  setServerClient(previewClient ?? client)

  const {apiHost, projectId, dataset} = client.config()
  const providerValue: SanityProviderValue = {
    projectId: projectId!,
    dataset: dataset!,
    apiHost,
    preview: isPreviewEnabled,
  }

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
      const cacheStrategy = isPreviewEnabled
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

    preview: preview ? {...preview, client: previewClient!, enabled: isPreviewEnabled} : undefined,

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

  return sanity
}
