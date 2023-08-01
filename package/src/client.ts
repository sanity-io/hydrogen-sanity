import {
  type ClientConfig,
  type ClientPerspective,
  createClient,
  type FilteredResponseQueryOptions,
  type QueryParams,
  type RawQueryResponse,
  type SanityClient,
  type UnfilteredResponseQueryOptions,
} from '@sanity/preview-kit/client'
import {CacheLong, createWithCache} from '@shopify/hydrogen'

import type {PreviewSession} from './preview'
import type {CachingStrategy, EnvironmentOptions} from './types'

type CreateSanityClientOptions = EnvironmentOptions & {
  config: ClientConfig & Required<Pick<ClientConfig, 'projectId' | 'dataset'>>
  preview?: {
    session: PreviewSession
    token: string
    perspective?: ClientPerspective
  }
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
  preview?:
    | {session: PreviewSession; projectId: string; dataset: string; token: string}
    | {session: PreviewSession}
  query<T>(options: useSanityQuery): Promise<T>
  query<T>(options: useRawSanityQuery): Promise<RawQueryResponse<T>>
}

/**
 * Create Sanity provider with API client.
 */
export function createSanityClient(options: CreateSanityClientOptions): Sanity {
  const {cache, waitUntil, preview, config} = options

  const sanity: Sanity = {
    client: createClient(config),
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
          return sanity.client.fetch(query, params)
        }

        // NOTE: satisfy union type
        if (queryOptions.filterResponse === false) {
          return sanity.client.fetch(query, params, queryOptions)
        }

        return sanity.client.fetch(query, params, queryOptions)
      })
    },
  }

  if (preview) {
    sanity.preview = {session: preview.session}

    if (preview.session.has('projectId')) {
      sanity.preview = {
        ...sanity.preview,
        projectId: config.projectId,
        dataset: config.dataset,
        token: preview.token,
      }

      sanity.client = sanity.client.withConfig({
        useCdn: false,
        token: preview.token,
        perspective: preview.perspective || 'previewDrafts',
        ignoreBrowserTokenWarning: true,
      })

      sanity.query = ({query, params, queryOptions}) => {
        if (!queryOptions) {
          return sanity.client.fetch(query, params)
        }

        // NOTE: satisfy union type
        if (queryOptions.filterResponse === false) {
          return sanity.client.fetch(query, params, queryOptions)
        }

        return sanity.client.fetch(query, params, queryOptions)
      }
    }
  }

  return sanity
}

export function isPreviewModeEnabled(
  preview?: Sanity['preview']
): preview is {session: PreviewSession; projectId: string; dataset: string; token: string} {
  // @ts-expect-error
  return Boolean(preview && preview.token && preview.token !== null)
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
