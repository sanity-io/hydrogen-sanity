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

  return {
    ...module,
    loadQuery,
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

const withCache = createWithCache({cache, waitUntil, request: new Request('https://example.com')})
const runWithCache = vi.spyOn(withCache, 'run')

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
    expect(runWithCache).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({cacheKey: hashedQuery, cacheStrategy: strategy}),
      expect.any(Function),
    )
    expect(cache.put).toHaveBeenCalledOnce()
  })

  it('queries should use the cache strategy passed in `loadQuery`', async () => {
    const strategy = CacheShort()
    await loader.loadQuery<boolean>(query, params, {hydrogen: {cache: strategy}})
    expect(runWithCache).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({cacheKey: hashedQuery, cacheStrategy: strategy}),
      expect.any(Function),
    )
    expect(cache.put).toHaveBeenCalledOnce()
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
      // @ts-expect-error meant to test invalid configuration
      createSanityLoader({cache, waitUntil, client, preview: {enabled: true}}),
    ).toThrowErrorMatchingInlineSnapshot(`[Error: Enabling preview mode requires a token.]`)
  })

  it.todo(`shouldn't use API CDN`, () => {
    expect(previewLoader.client.config().useCdn).toBe(false)
  })

  it.todo('should use the `previewDrafts` perspective', () => {
    expect(previewLoader.client.config().perspective).toBe('previewDrafts')
  })

  it('should enable preview mode', () => {
    expect(previewLoader.preview?.enabled).toBe(true)
  })

  it(`shouldn't cache queries`, async () => {
    await previewLoader.loadQuery<boolean>(query)
    expect(loadQuery).toHaveBeenCalledOnce()
    expect(cache.put).not.toHaveBeenCalledOnce()
  })
})

describe('session-based preview detection', () => {
  const mockSession = {
    get: vi.fn(),
    set: vi.fn(),
    unset: vi.fn(),
    commit: vi.fn(),
    has: vi.fn(),
    destroy: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should enable preview when provided session contains matching project ID', () => {
    mockSession.get.mockReturnValue('my-project-id')

    const loader = createSanityLoader({
      withCache,
      client,
      preview: {
        token: 'my-token',
        studioUrl: 'https://example.com',
        session: mockSession,
      },
    })

    expect(loader.preview?.enabled).toBe(true)
    expect(mockSession.get).toHaveBeenCalledWith('projectId')
  })

  it('should disable preview when provided session contains different project ID', () => {
    mockSession.get.mockReturnValue('different-project-id')

    const loader = createSanityLoader({
      withCache,
      client,
      preview: {
        token: 'my-token',
        studioUrl: 'https://example.com',
        session: mockSession,
      },
    })

    expect(mockSession.get).toHaveBeenCalledWith('projectId')
    expect(loader.preview?.enabled).toBe(false)
  })

  it('should disable preview when provided session contains no project ID', () => {
    mockSession.get.mockReturnValue(undefined)

    const loader = createSanityLoader({
      withCache,
      client,
      preview: {
        token: 'my-token',
        studioUrl: 'https://example.com',
        session: mockSession,
      },
    })

    expect(mockSession.get).toHaveBeenCalledWith('projectId')
    expect(loader.preview?.enabled).toBe(false)
  })
})
