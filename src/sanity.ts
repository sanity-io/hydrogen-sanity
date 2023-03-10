import { createClient, type ClientConfig, type QueryParams, type InitializedClientConfig } from '@sanity/client'
import { type CachingStrategy } from '@shopify/hydrogen';

export type CreateSanityClientOptions =
    Omit<ClientConfig, 'useProjectHostname' | 'requester'>
    & Required<Pick<ClientConfig, 'projectId' | 'dataset'>>
    & {
        /** 
         * A Cache API instance.
         * @see https://developer.mozilla.org/en-US/docs/Web/API/Cache
         */
        cache?: Cache;
        /** 
         * A runtime utility for serverless environments
         * @see https://developers.cloudflare.com/workers/runtime-apis/fetch-event/#waituntil
         */
        waitUntil?: ExecutionContext['waitUntil']
    }

export type Sanity = {
    config(): InitializedClientConfig,
    query: <R = any, Q = QueryParams>(
        query: string,
        payload?: {
            params?: Q,
            cache?: CachingStrategy
        }
    ) => Promise<R>
    cache?: Cache
}

export function createSanityClient(options: CreateSanityClientOptions): Sanity {
    const { cache, waitUntil, ...clientOptions } = options

    if (!clientOptions.projectId) {
        throw new Error('Configuration must contain `projectId`')
    }

    if (!clientOptions.dataset) {
        throw new Error('Configuration must contain `dataset`')
    }

    const client = createClient({
        ...clientOptions,
        useCdn: Boolean(options.useCdn ?? true),
    })


    const sanity: Sanity = {
        query(query, payload = {}) {
            const { params } = payload
            return client.fetch(query, params)
        },
        config() {
            return client.config()
        },
        cache,
    }

    return sanity
}