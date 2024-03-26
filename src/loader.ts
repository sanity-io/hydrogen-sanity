import type {QueryParams} from '@sanity/client'
import {
  ClientConfig,
  ClientPerspective,
  createClient,
  RawQueryResponse,
  SanityClient,
  UnfilteredResponseQueryOptions,
} from '@sanity/client'
import {createQueryStore, QueryStore} from '@sanity/react-loader'
import {CacheLong, createWithCache} from '@shopify/hydrogen'

import type {CachingStrategy, EnvironmentOptions} from './types'

type CreateSanityLoaderOptions = EnvironmentOptions & {
  strategy?: CachingStrategy | null
  config: ClientConfig & Required<Pick<ClientConfig, 'projectId' | 'dataset'>>
  preview?: {token: string; studioUrl: string}
}

type LoadQueryParameters = Parameters<QueryStore['loadQuery']>
type LoadQueryCachedOptions = Partial<
  LoadQueryParameters[2] & {
    strategy?: CachingStrategy
    queryOptions: Partial<UnfilteredResponseQueryOptions>
  }
>

export type Sanity = {
  loadQuery: QueryStore['loadQuery']
  client: SanityClient
  preview?: boolean
}

const queryStore = createQueryStore({client: false, ssr: true})

/**
 * Configure Sanity's React Loader and Client.
 */
export function createSanityLoader(options: CreateSanityLoaderOptions): Sanity {
  const {cache, waitUntil, strategy = CacheLong(), config, preview} = options
  let previewMode = false
  let client = createClient(config)

  if (preview) {
    if (!preview.token) {
      throw new Error('Preview mode attempted but SANITY_API_TOKEN not provided to preview.token')
    }

    previewMode = true

    const previewConfig = {
      useCdn: false,
      token: preview.token,
      perspective: 'previewDrafts' as ClientPerspective,
      stega: {enabled: true, studioUrl: preview.studioUrl},
    }

    client = client.withConfig(previewConfig)
  }

  queryStore.setServerClient(client)

  const sanity: Sanity = {
    async loadQuery<T = any>(
      query: string,
      params: QueryParams = {},
      loadQueryCachedOptions?: LoadQueryCachedOptions
    ) {
      const cacheStrategy = loadQueryCachedOptions?.strategy ?? strategy

      // Skip Hydrogen cache when:
      // - in preview mode
      // - when not using Sanity CDN
      // - cache strategy is null
      if (previewMode || client.config().useCdn === false || !cacheStrategy) {
        return queryStore.loadQuery(query, params, loadQueryCachedOptions?.queryOptions)
      }

      const queryHash = await hashQuery(query, params)
      const withCache = createWithCache<T | RawQueryResponse<T>>({
        cache,
        waitUntil,
      })

      return withCache(queryHash, cacheStrategy, () => {
        return queryStore.loadQuery(query, params, loadQueryCachedOptions?.queryOptions)
      })
    },
    client,
    preview: previewMode,
  }

  return sanity
}

/**
 * Create an SHA-256 hash as a hex string
 * @see https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest#converting_a_digest_to_a_hex_string
 */
export async function sha256(message: string): Promise<string> {
  // encode as UTF-8
  const messageBuffer = await new TextEncoder().encode(message)
  // hash the message
  const hashBuffer = await crypto.subtle.digest('SHA-256', messageBuffer)
  // convert bytes to hex string
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Hash query and its parameters for use as cache key
 * NOTE: Oxygen deployment will break if the cache key is long or contains `\n`
 */
function hashQuery(query: LoadQueryParameters[0], params: LoadQueryParameters[1]): Promise<string> {
  let hash = query

  if (params !== null) {
    hash += JSON.stringify(params)
  }

  return sha256(hash)
}
