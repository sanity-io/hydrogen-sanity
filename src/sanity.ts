import createClient, { type ClientConstructor } from 'picosanity'
import { type CacheShort } from '@shopify/hydrogen';

type CachingStrategy = ReturnType<typeof CacheShort>
type ClientConfig = Parameters<ClientConstructor>[0]
type QueryParams = { [key: string]: unknown }

export type CreateSanityClientOptions =
    & ClientConfig
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
    query: <R = any, Q = QueryParams>(
        query: string,
        payload?: {
            params?: Q,
            cache?: CachingStrategy
        }
    ) => Promise<R>
    config: ClientConfig
    cache?: Cache
}

export function createSanityClient(options: CreateSanityClientOptions): Sanity {
    const { cache, waitUntil, ...clientOptions } = options ?? {}

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
            return client.fetch(query, params ?? {})
        },
        get config() {
            return client.config()
        },
        cache,
    }

    return sanity
}