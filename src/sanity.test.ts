import { createSanityClient, CreateSanityClientOptions } from "./sanity";
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
        expect(createSanityClient(TEST_CLIENT).config).toHaveProperty('useCdn', true)
    })
})