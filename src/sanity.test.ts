import { RawQueryResponse } from '@sanity/client'
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import { CacheShort } from '@shopify/hydrogen';
import { createSanityClient, type CreateSanityClientOptions } from './sanity';
import { getCacheControlHeader, sha256 } from './utils';

/** @see https://miniflare.dev/testing/vitest#isolated-storage */
const describe = setupMiniflareIsolatedStorage()

const TEST_CLIENT: CreateSanityClientOptions = {
    projectId: 'project',
    dataset: 'dataset'
}

describe("createSanityClient", () => {
    test("should return a Sanity client", () => {
        const sanity = createSanityClient(TEST_CLIENT)
        expect(sanity).toBeDefined()
        expect(sanity).toHaveProperty('query')
        expect(sanity).toHaveProperty('config')
    })

    test("should validate configuration", () => {
        expect(() =>
            createSanityClient({ projectId: TEST_CLIENT.projectId } as CreateSanityClientOptions)
        ).toThrowErrorMatchingInlineSnapshot('"Configuration must contain `dataset`"')
        expect(() =>
            createSanityClient({ dataset: TEST_CLIENT.dataset } as CreateSanityClientOptions)
        ).toThrowErrorMatchingInlineSnapshot('"Configuration must contain `projectId`"')
    })

    test("should use CDN by default", () => {
        expect(createSanityClient(TEST_CLIENT)).toHaveProperty('config.useCdn', true)
    })

    test("caches requests", async () => {
        const QUERY = `*` as const
        const RESPONSE_BODY: RawQueryResponse<[]> = {
            q: QUERY,
            ms: 10,
            result: []
        }

        const cache = await caches.open('sanity')
        let sanity = createSanityClient({ ...TEST_CLIENT, cache })

        /**
         * @todo: `@sanity/client` provides `url` and `cdnUrl` (both deprecated),
         * but configuring `apiHost` there doesn't seem to work properly?
         * This test is very brittle because of that...
         * Is there a bug in that package?
         */
        const { projectId, apiVersion, dataset, apiHost } = sanity.config
        const { protocol, host } = new URL(apiHost)

        /**
         * Cache request key
         * `apiHost + apiVersion + endpoint(with `cache`) + dataset + queryHash`
         * @example https://api.sanity.io/v1/cache/query/684888c0ebb17f374298b65ee2807526c066094c701bcc7ebbe1c1095f494fc1
         */
        const REQUEST_URL = new URL(await sha256(QUERY), `${apiHost}/v${apiVersion}/cache/query/${dataset}`)
        const cacheKey = new Request(REQUEST_URL.toString(), {
            headers: {
                'Cache-Control': getCacheControlHeader(CacheShort())
            }
        })

        const queryUrl = `${protocol}//${projectId}.*${host.replace('api.', '')}/v${apiVersion}/data/query/${dataset}`
        const queryHandler = rest.get(queryUrl, (_, response, context) => {
            return response(context.json(RESPONSE_BODY))
        })

        const server = setupServer(queryHandler)

        /** Throw when no matching mocked request is found */
        server.listen({ onUnhandledRequest: 'error' })

        await sanity.query(QUERY)
        await expect(cache.match(cacheKey)).resolves.toBeDefined()
        await cache.delete(cacheKey)

        sanity = createSanityClient({ ...TEST_CLIENT, cache, waitUntil: async () => { } })

        await sanity.query(QUERY)
        await expect(cache.match(cacheKey)).resolves.toBeDefined()
        await cache.delete(cacheKey)

        server.close()
    })
})