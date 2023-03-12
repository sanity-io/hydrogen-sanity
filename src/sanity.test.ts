import { createSanityClient, type CreateSanityClientOptions } from './sanity';
import { RawQueryResponse } from '@sanity/client'
import { rest } from 'msw'
import { setupServer } from 'msw/node'
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
        const cache = await caches.open('sanity')
        const sanity = createSanityClient({ ...TEST_CLIENT, cache })

        /**
         * @todo: `@sanity/client` provides `url` and `cdnUrl` (both deprecated),
         * but configuring `apiHost` there doesn't seem to work properly?
         * This test is very brittle because of that
         * Is there a bug in that package?
         */
        const { projectId, apiVersion, dataset, apiHost } = sanity.config
        const { protocol, host } = new URL(apiHost)
        const queryUrl = `${protocol}//${projectId}.*${host.replace('api.', '')}/v${apiVersion}/data/query/${dataset}`
        const queryHandler = rest.get(queryUrl, (_, response, context) => {
            return response(context.json<RawQueryResponse<string>>({
                q: QUERY,
                ms: 10,
                result: 'ok'
            }))
        })

        const server = setupServer(queryHandler)

        /** Throw when no matching mocked request is found */
        server.listen({ onUnhandledRequest: 'error' })

        console.log(await sanity.query(QUERY))

        server.close()
    })
})