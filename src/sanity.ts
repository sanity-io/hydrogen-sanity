import { createClient, type ClientConfig, type QueryParams, type InitializedClientConfig } from '@sanity/client'
import type { CachingStrategy, EnvironmentOptions } from './types';

export type CreateSanityClientOptions =
    Omit<ClientConfig, 'useProjectHostname' | 'requester' | 'allowReconfigure'>
    & Required<Pick<ClientConfig, 'projectId' | 'dataset'>>
    & EnvironmentOptions

export type Sanity = {
    query: <R = any, Q = QueryParams>(
        query: string,
        payload?: {
            params?: Q,
            cache?: CachingStrategy
        }
    ) => Promise<R>
    config: InitializedClientConfig
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
        query(query, payload) {
            const { params } = payload ?? {}
            return client.fetch(query, params)
        },
        get config() {
            return client.config()
        },
        cache,
    }

    return sanity
}