import type {QueryStore} from '@sanity/react-loader'
import {CacheShort, WithCache} from '@shopify/hydrogen'
import groq from 'groq'
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {createClient, SanityClient} from './client'
import {createSanityContext} from './context'
import {hashQuery} from './utils'

// Mock the global caches object
const cache = vi.hoisted<Cache>(() => ({
  add: vi.fn().mockResolvedValue(undefined),
  addAll: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(true),
  keys: vi.fn().mockResolvedValue([]),
  match: vi.fn().mockResolvedValue(undefined),
  matchAll: vi.fn().mockResolvedValue([]),
  put: vi.fn().mockResolvedValue(undefined),
}))

// Mock the Sanity loader
const loadQuery = vi.hoisted<QueryStore['loadQuery']>(() => vi.fn().mockResolvedValue(null))

let withCache = vi.hoisted<WithCache | null>(() => null)

vi.mock('@shopify/hydrogen', async (importOriginal) => {
  const module = await importOriginal<typeof import('@shopify/hydrogen')>()
  withCache = vi
    .fn()
    .mockImplementation(module.createWithCache({cache, waitUntil: () => Promise.resolve()}))

  return {
    ...module,
    createWithCache: vi.fn().mockReturnValue(withCache),
  }
})

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

const client = createClient({projectId: 'my-project-id', dataset: 'my-dataset'})

const query = groq`true`
const params = {}
const hashedQuery = await hashQuery(query, params)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('the Sanity request context', () => {
  const request = new Request('https://example.com')
  const sanityContext = createSanityContext({request, cache, client})

  it('should return a client', () => {
    expect(sanityContext.client).toSatisfy((contextClient) => contextClient instanceof SanityClient)
  })

  it('queries should get cached using the default caching strategy', async () => {
    const defaultStrategy = CacheShort()

    const contextWithDefaultStrategy = createSanityContext({
      request,
      cache,
      client,
      defaultStrategy,
    })

    await contextWithDefaultStrategy.loadQuery<boolean>(query, params)
    expect(withCache).toHaveBeenCalledWith(hashedQuery, defaultStrategy, expect.any(Function))
    expect(cache.put).toHaveBeenCalled()
  })

  it('queries should use the cache strategy passed in `loadQuery`', async () => {
    const strategy = CacheShort()
    await sanityContext.loadQuery<boolean>(query, params, {
      hydrogen: {cache: strategy},
    })
    expect(withCache).toHaveBeenCalledWith(hashedQuery, strategy, expect.any(Function))
    expect(cache.put).toHaveBeenCalled()
  })
})

describe('when configured for preview', () => {
  const request = new Request('https://example.com')
  const previewContext = createSanityContext({
    request,
    cache,
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
      createSanityContext({client, preview: {enabled: true}}),
    ).toThrowErrorMatchingInlineSnapshot(`[Error: Enabling preview mode requires a token.]`)
  })

  it.todo(`shouldn't use API CDN`, () => {
    expect(previewContext.client.config().useCdn).toBe(false)
  })

  it.todo('should use the `previewDrafts` perspective', () => {
    expect(previewContext.client.config().perspective).toBe('previewDrafts')
  })

  it('should enable preview mode', () => {
    expect(previewContext.preview?.enabled).toBe(true)
  })

  it(`shouldn't cache queries`, async () => {
    await previewContext.loadQuery<boolean>(query)
    expect(loadQuery).toHaveBeenCalledOnce()
    expect(cache.put).not.toHaveBeenCalled()
  })
})
