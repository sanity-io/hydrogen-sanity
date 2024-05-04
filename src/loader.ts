import {createQueryStore, type QueryResponseInitial} from '@sanity/react-loader'
import {CacheLong, createWithCache} from '@shopify/hydrogen'

import {
  type ClientConfig,
  createClient,
  type QueryParams,
  type QueryWithoutParams,
  type ResponseQueryOptions,
  SanityClient,
} from './client'
import type {CachingStrategy} from './types'
import {hashQuery} from './utils'

export type CreateSanityLoaderOptions = {
  withCache: ReturnType<typeof createWithCache>
  client: SanityClient | ClientConfig
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
  const {withCache, preview, strategy} = options
  let client =
    options.client instanceof SanityClient ? options.client : createClient(options.client)

  /**
   * TODO: should this default to the latest API version?
   * Or at least warn if a version that doesn't support perspectivves is used?
   */
  if (client.config().apiVersion === '1') {
    client = client.withConfig({apiVersion: 'v2022-03-07'})
  }

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
