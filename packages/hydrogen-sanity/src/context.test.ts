import type {QueryStore} from '@sanity/react-loader'
import {CacheShort, type WithCache} from '@shopify/hydrogen'
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {createClient, SanityClient} from './client'
import {DEFAULT_API_VERSION} from './constants'
import {createSanityContext} from './context'
import {SanityPreviewSession} from './preview/session'
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
  withCache = module.createWithCache({
    cache,
    waitUntil: () => Promise.resolve(),
    request: new Request('http://localhost'),
  })

  return {
    ...module,
    createWithCache: vi.fn().mockReturnValue(withCache),
  }
})

vi.mock('@sanity/react-loader', async (importOriginal) => {
  const module = await importOriginal<typeof import('@sanity/react-loader')>()

  return {
    ...module,
    loadQuery,
  }
})

const runWithCache = vi.spyOn(withCache!, 'run')

const consoleWarn = vi.spyOn(console, 'warn')
const consoleError = vi.spyOn(console, 'error')

const client = createClient({projectId: 'my-project-id', dataset: 'my-dataset'})

const query = `true`
const params = {}
const hashedQuery = await hashQuery(query, params)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('the Sanity request context', () => {
  const request = new Request('http://localhost')
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
    expect(runWithCache).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({cacheKey: hashedQuery, cacheStrategy: defaultStrategy}),
      expect.any(Function),
    )
    expect(cache.put).toHaveBeenCalledOnce()
  })

  it('queries should use the cache strategy passed in `loadQuery`', async () => {
    const strategy = CacheShort()
    await sanityContext.loadQuery<boolean>(query, params, {
      hydrogen: {cache: strategy},
    })
    expect(runWithCache).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({cacheKey: hashedQuery, cacheStrategy: strategy}),
      expect.any(Function),
    )
    expect(cache.put).toHaveBeenCalledOnce()
  })

  it('should use the API CDN', () => {
    expect(sanityContext.client.config().useCdn).toBe(true)
  })

  it('should set a default API version', () => {
    expect(sanityContext.client.config().apiVersion).toBe(DEFAULT_API_VERSION.slice(1))
  })

  it('should warn if no API version is specified', () => {
    createSanityContext({request, cache, client})
    expect(consoleWarn).toHaveBeenCalledOnce()
    expect(consoleWarn.mock.lastCall?.at(0)).toMatchInlineSnapshot(`
      "No API version specified, defaulting to \`v2025-02-19\` which supports perspectives and Content Releases.

      You can find the latest version in the Sanity changelog: https://www.sanity.io/changelog'"
    `)
  })

  it('should not enable preview mode if no preview configuration is provided', () => {
    expect(sanityContext.preview).toBeNull()
  })
})

describe('when configured for preview', async () => {
  const request = new Request('http://localhost')
  const session = await SanityPreviewSession.init(request, ['secret'])
  const previewContext = createSanityContext({
    request,
    cache,
    client,
    preview: {
      token: 'my-token',
      studioUrl: '/',
      session,
    },
  })

  it(`shouldn't use API CDN`, () => {
    expect(previewContext.client.config().useCdn).toBe(false)
  })

  it.todo('should use the `previewDrafts` perspective', () => {
    expect(previewContext.client.config().perspective).toBe('previewDrafts')
  })

  it('should enable preview mode', () => {
    expect(previewContext.preview).toBeTruthy()
  })

  it(`shouldn't cache queries`, async () => {
    await previewContext.loadQuery<boolean>(query)
    expect(loadQuery).toHaveBeenCalledOnce()
    expect(cache.put).not.toHaveBeenCalledOnce()
  })

  it('should log an error if no token is provided', () => {
    // @ts-expect-error - we want to test the error case
    createSanityContext({request, cache, client, preview: {session}})
    expect(consoleError).toHaveBeenCalledOnce()
    expect(consoleError.mock.lastCall?.at(0)).toMatchInlineSnapshot(
      `"Enabling preview mode requires a token."`,
    )
  })

  it('should log an error if no session is provided', () => {
    // @ts-expect-error - we want to test the error case
    createSanityContext({request, cache, client, preview: {token: 'my-token'}})
    expect(consoleError).toHaveBeenCalledOnce()
    expect(consoleError.mock.lastCall?.at(0)).toMatchInlineSnapshot(
      `"Enabling preview mode requires a session."`,
    )
  })
})
