/* eslint-disable max-nested-callbacks */
import {SanityClient} from '@sanity/client'
import type {QueryStore} from '@sanity/react-loader'
import {CacheShort, createWithCache} from '@shopify/hydrogen'
import {beforeEach, describe, expect, it, vi} from 'vitest'

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

const projectId = 'my-project-id'
const dataset = 'my-dataset'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('the loader', async () => {
  const query = 'true'
  const params = {}
  const hashedQuery = await hashQuery(query, params)

  const loader = createSanityLoader({withCache, config: {projectId, dataset}})

  it('should return a client', () => {
    expect(loader.client).toSatisfy((client) => client instanceof SanityClient)
  })

  it('queries should get cached using the default caching strategy', async () => {
    const strategy = CacheShort()

    const loaderWithDefaultStrategy = createSanityLoader({
      withCache,
      config: {projectId, dataset},
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
    config: {
      projectId,
      dataset,
    },
    preview: {
      token: 'my-token',
      studioUrl: 'https://example.com',
    },
  })

  it('should throw if a token is not provided', () => {
    expect(() =>
      // @ts-expect-error
      createSanityLoader({cache, waitUntil, config: {projectId, dataset}, preview: {}})
    ).toThrowErrorMatchingInlineSnapshot(
      `[Error: Preview mode attempted but SANITY_API_TOKEN not provided to preview.token]`
    )
  })

  it(`shouldn't use API CDN`, () => {
    expect(previewLoader.client.config().useCdn).toBe(false)
  })

  it('should use the `previewDrafts` perspective', () => {
    expect(previewLoader.client.config().perspective).toBe('previewDrafts')
  })

  it('should enable preview mode', () => {
    expect(previewLoader.preview).toBe(true)
  })

  it(`shouldn't cache queries`, async () => {
    await previewLoader.loadQuery<boolean>('true')
    expect(loadQuery).toHaveBeenCalledOnce()
    expect(cache.put).not.toHaveBeenCalled()
  })
})

describe('when not configured for preview', () => {
  it(`shouldn't cache queries when using API`, async () => {
    const loader = createSanityLoader({
      withCache,
      config: {
        projectId,
        dataset,
        useCdn: false,
      },
    })

    expect(loader.client.config().useCdn).toBe(false)

    await loader.loadQuery<boolean>('true')
    expect(loadQuery).toHaveBeenCalledOnce()
    expect(cache.put).not.toHaveBeenCalled()
  })
})
