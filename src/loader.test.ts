/* eslint-disable max-nested-callbacks */
import type {QueryStore} from '@sanity/react-loader'
import {CacheShort, createWithCache} from '@shopify/hydrogen'
import groq from 'groq'
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {createClient, SanityClient} from './client'
import {createSanityLoader} from './loader'
import {hashQuery} from './utils'

const loadQuery = vi.hoisted<QueryStore['loadQuery']>(() => vi.fn().mockResolvedValue(null))

vi.mock('@sanity/react-loader', async (importOriginal) => {
  const module = await importOriginal<typeof import('@sanity/react-loader')>()
  const queryStore = module.createQueryStore({client: false, ssr: true})

  return {
    ...module,
    createQueryStore: vi.fn().mockReturnValue({
      ...queryStore,
      loadQuery,
    }),
  }
})

// Mock the global caches object
const cache: Cache = {
  add: vi.fn().mockResolvedValue(undefined),
  addAll: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(true),
  keys: vi.fn().mockResolvedValue([]),
  match: vi.fn().mockResolvedValue(undefined),
  matchAll: vi.fn().mockResolvedValue([]),
  put: vi.fn().mockResolvedValue(undefined),
}

function waitUntil() {
  return Promise.resolve()
}

type WithCache = ReturnType<typeof createWithCache>
const withCache: WithCache = vi.fn().mockImplementation(createWithCache({cache, waitUntil}))

const client = createClient({projectId: 'my-project-id', dataset: 'my-dataset'})

const query = groq`true`
const params = {}
const hashedQuery = await hashQuery(query, params)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('the loader', () => {
  const loader = createSanityLoader({withCache, client})

  it('should return a client', () => {
    expect(loader.client).toSatisfy((loaderClient) => loaderClient instanceof SanityClient)
  })

  it('queries should get cached using the default caching strategy', async () => {
    const strategy = CacheShort()

    const loaderWithDefaultStrategy = createSanityLoader({
      withCache,
      client,
      strategy,
    })

    await loaderWithDefaultStrategy.loadQuery<boolean>(query, params)
    expect(withCache).toHaveBeenCalledWith(hashedQuery, strategy, expect.any(Function))
    expect(cache.put).toHaveBeenCalled()
  })

  it('queries should use the cache strategy passed in `loadQuery`', async () => {
    const strategy = CacheShort()
    await loader.loadQuery<boolean>(query, params, {hydrogen: {cache: strategy}})
    expect(withCache).toHaveBeenCalledWith(hashedQuery, strategy, expect.any(Function))
    expect(cache.put).toHaveBeenCalled()
  })
})

describe('when configured for preview', () => {
  const previewLoader = createSanityLoader({
    withCache,
    client,
    preview: {
      enabled: true,
      token: 'my-token',
      studioUrl: 'https://example.com',
    },
  })

  it('should throw if a token is not provided', () => {
    expect(() =>
      // @ts-expect-error
      createSanityLoader({cache, waitUntil, client, preview: {enabled: true}})
    ).toThrowErrorMatchingInlineSnapshot(`[Error: Enabling preview mode requires a token.]`)
  })

  it(`shouldn't use API CDN`, () => {
    expect(previewLoader.client.config().useCdn).toBe(false)
  })

  it('should use the `previewDrafts` perspective', () => {
    expect(previewLoader.client.config().perspective).toBe('previewDrafts')
  })

  it('should enable preview mode', () => {
    expect(previewLoader.preview?.enabled).toBe(true)
  })

  it(`shouldn't cache queries`, async () => {
    await previewLoader.loadQuery<boolean>(query)
    expect(loadQuery).toHaveBeenCalledOnce()
    expect(cache.put).not.toHaveBeenCalled()
  })
})
