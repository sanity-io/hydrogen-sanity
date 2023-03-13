import { createClient, type QueryParams, type RequestOptions } from '@sanity/client'
import type { CachingStrategy, EnvironmentOptions } from './hydrogen'

type ClientConfig = {
    /** Sanity project ID */
    projectId: string;

    /** Sanity dataset name */
    dataset: string;

    /** Provide proxy agent to in request headers */
    proxy?: string

    /** If using a custom API domain */
    apiHost?: string

    /** Sanity API version */
    apiVersion?: string;

    /** Prefix all requests with tag */
    requestTagPrefix?: string

    /** @see https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#sending_a_request_with_credentials_included */
    withCredentials?: boolean

    /** Timeout in millisecond for the request */
    timeout?: number

    /**
     * Use CDN-distributed, cached version of the Sanity API
     * @see https://www.sanity.io/docs/api-cdn
     * @defaultValue true
     */
    useCdn?: boolean

    /** 
     * Sanity token to authenticate requests 
     * @see https://www.sanity.io/docs/http-auth
     */
    token?: string
}

export type CreateSanityClientOptions = ClientConfig & EnvironmentOptions

export type Sanity = {
    query: <R = any, Q = QueryParams>(
        query: string,
        payload?: {
            params?: Q,
            cache?: CachingStrategy
            options?: RequestOptions
        }
    ) => Promise<R>
    config: ClientConfig & Required<Pick<ClientConfig, 'useCdn' | 'apiHost' | 'apiVersion'>>
    cache?: Cache
}


export function createSanityClient(options: CreateSanityClientOptions): Sanity {
    const { cache, waitUntil, useCdn = true, ...clientOptions } = options ?? {}

    if (!clientOptions.projectId) {
        throw new Error('Configuration must contain `projectId`')
    }

    if (!clientOptions.dataset) {
        throw new Error('Configuration must contain `dataset`')
    }

    const client = createClient({
        ...clientOptions,
        allowReconfigure: false,
        useCdn: useCdn
    })

    const sanity: Sanity = {
        query(query, payload) {
            const { params, options = {} } = payload ?? {}
            return client.fetch(query, params, options)
        },
        get config() {
            const { apiHost, apiVersion, useCdn } = client.config()
            return Object.assign({}, options, { useCdn, apiHost, apiVersion })
        },
        cache,
    }

    return sanity
}