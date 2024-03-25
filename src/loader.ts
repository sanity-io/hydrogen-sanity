import {
  ClientConfig,
  ClientPerspective,
  createClient,
  FilteredResponseQueryOptions,
  QueryParams,
  RawQueryResponse,
  SanityClient,
  UnfilteredResponseQueryOptions,
} from '@sanity/client'
import {createQueryStore, QueryResponseInitial, QueryStore} from '@sanity/react-loader'
import {CacheLong, createWithCache} from '@shopify/hydrogen'

import type {CachingStrategy, EnvironmentOptions} from './types'

type CreateSanityClientOptions = EnvironmentOptions & {
  config: ClientConfig & Required<Pick<ClientConfig, 'projectId' | 'dataset'>>
  preview?: {token: string; studioUrl: string}
}

type useSanityQuery = {
  query: string
  params?: QueryParams
  cache?: CachingStrategy
  queryOptions?: FilteredResponseQueryOptions
}

type useRawSanityQuery = {
  query: string
  params?: QueryParams
  cache?: CachingStrategy
  queryOptions: UnfilteredResponseQueryOptions
}

export type Sanity = {
  client: SanityClient
  loadQuery: QueryStore['loadQuery']
  preview?: boolean
  query<T>(options: useSanityQuery): Promise<QueryResponseInitial<T>>
  query<T>(options: useRawSanityQuery): Promise<QueryResponseInitial<T>>
}

const queryStore = createQueryStore({client: false, ssr: true})

/**
 * Configure Sanity's React Loader and Client.
 */
export function createSanityLoader(options: CreateSanityClientOptions): Sanity {
  const {cache, waitUntil, preview, config} = options
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
    client,
    loadQuery: queryStore.loadQuery,
    preview: previewMode,
    async query<T = any>({
      query,
      params,
      cache: strategy = CacheLong(),
      queryOptions,
    }: useSanityQuery | useRawSanityQuery) {
      const queryHash = await hashQuery(query, params)
      const withCache = createWithCache<T | RawQueryResponse<T>>({
        cache,
        waitUntil,
      })

      return withCache(queryHash, strategy, () => {
        if (!queryOptions) {
          return sanity.loadQuery(query, params)
        }

        // NOTE: satisfy union type
        if (queryOptions.filterResponse === false) {
          return sanity.loadQuery(query, params, queryOptions)
        }

        return sanity.loadQuery(query, params, queryOptions)
      })
    },
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
function hashQuery(
  query: useSanityQuery['query'],
  params: useSanityQuery['params']
): Promise<string> {
  let hash = query

  if (params !== null) {
    hash += JSON.stringify(params)
  }

  return sha256(hash)
}
