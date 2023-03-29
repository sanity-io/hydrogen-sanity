import { createClient, type QueryParams, type RequestOptions } from '@sanity/client'
import { CacheShort } from '@shopify/hydrogen';
import type { CachingStrategy, EnvironmentOptions } from './hydrogen'
import { getCacheControlHeader, sha256 } from './utils';

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
        async query(query, payload) {
            const { params, options = {}, cache: cacheStrategy = CacheShort() } = payload ?? {}

            if (!cache) {
                return await client.fetch(query, params, options)
            }

            const { projectId, apiVersion, dataset, apiHost } = this.config

            /**
             * Cache request key
             * `apiHost + apiVersion + endpoint(with `cache`) + dataset + queryHash`
             * @example https://api.sanity.io/v1/cache/query/684888c0ebb17f374298b65ee2807526c066094c701bcc7ebbe1c1095f494fc1
             */
            const requestUrl = new URL(await sha256(query), `${apiHost}/v${apiVersion}/cache/query/${dataset}`)
            const cacheKey = new Request(requestUrl.toString(), {
                headers: {
                    'Cache-Control': getCacheControlHeader(cacheStrategy)
                }
            })

            // Check if there's a match for this key.
            let cachedResponse: Response | undefined;
            try {
                cachedResponse = await cache.match(cacheKey);
            } catch (e) {
                console.error(e)
            }

            if (!cachedResponse) {
                // Since there's no match, fetch a fresh response.
                const result = await client.fetch(query, params, options)

                try {
                    const response = new Response(result, {
                        headers: cacheKey.headers,
                    })

                    // Store the response in cache to be re-used the next time.
                    const put = cache.put(cacheKey, response)

                    waitUntil?.(put)

                    await put
                } catch (e) {
                    console.error(e)
                }

                return result
            }

            return cachedResponse.body;
        },
        get config() {
            const { apiHost, apiVersion, useCdn } = client.config()
            return Object.assign({}, options, { useCdn, apiHost, apiVersion })
        },
        cache,
    }

    return sanity
}
