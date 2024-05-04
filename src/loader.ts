import {
  type ClientConfig,
  createClient,
  type QueryParams,
  type QueryWithoutParams,
  type ResponseQueryOptions,
  type SanityClient,
} from '@sanity/client'
import {createQueryStore, type QueryResponseInitial} from '@sanity/react-loader'
import {CacheLong, createWithCache} from '@shopify/hydrogen'

import type {CachingStrategy} from './types'
import {hashQuery} from './utils'

export type CreateSanityLoaderOptions = {
  withCache: ReturnType<typeof createWithCache>
  config: ClientConfig & Required<Pick<ClientConfig, 'projectId' | 'dataset'>>
  strategy?: CachingStrategy | null
  preview?: {enabled: boolean; token: string; studioUrl: string}
}

interface RequestInit {
  hydrogen?: {
    cache?: CachingStrategy
  }
}

type HydrogenResponseQueryOptions = Omit<ResponseQueryOptions, 'next' | 'cache'> & {
  hydrogen?: 'hydrogen' extends keyof RequestInit ? RequestInit['hydrogen'] : never
}

type LoadQueryOptions = Pick<
  HydrogenResponseQueryOptions,
  'perspective' | 'hydrogen' | 'useCdn' | 'stega'
>

export type Sanity = {
  loadQuery<T = any>(
    query: string,
    params?: QueryParams,
    options?: LoadQueryOptions
  ): Promise<QueryResponseInitial<T>>
  client: SanityClient
  preview?: {
    enabled: boolean
    token: string
    studioUrl: string
  }
}

const queryStore = createQueryStore({client: false, ssr: true})

/**
 * Configure Sanity's React Loader and Client.
 */
export function createSanityLoader(options: CreateSanityLoaderOptions): Sanity {
  const {withCache, config, preview, strategy} = options
  let client = createClient(config)

  if (preview && preview.enabled) {
    if (!preview.token) {
      throw new Error('Enabling preview mode requires a token.')
    }

    const previewConfig = {
      useCdn: false,
      token: preview.token,
      perspective: 'previewDrafts' as const,
      stega: {enabled: true, studioUrl: preview.studioUrl},
    }

    client = client.withConfig(previewConfig)
  }

  queryStore.setServerClient(client)

  const sanity: Sanity = {
    async loadQuery<T>(
      query: string,
      params: QueryParams | QueryWithoutParams,
      loaderOptions?: LoadQueryOptions
    ): Promise<QueryResponseInitial<T>> {
      const cacheStrategy = loaderOptions?.hydrogen?.cache || strategy || CacheLong()

      if (preview && preview.enabled) {
        return queryStore.loadQuery<T>(query, params, loaderOptions)
      }

      const queryHash = await hashQuery(query, params)

      return withCache(queryHash, cacheStrategy, () => {
        return queryStore.loadQuery<T>(query, params, loaderOptions)
      })
    },
    client,
    preview,
  }

  return sanity
}
