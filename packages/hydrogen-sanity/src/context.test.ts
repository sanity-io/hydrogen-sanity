import {createClient, SanityClient} from '@sanity/client'
import type {QueryStore} from '@sanity/react-loader'
import {CacheShort, type WithCache} from '@shopify/hydrogen'
import groq from 'groq'
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {createSanityContext} from './context'
import {PreviewSession} from './fixtures'
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
    request: new Request('https://example.com'),
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

const projectId = 'my-project-id'
const client = createClient({projectId, dataset: 'my-dataset'})

const query = groq`true`
const params = {}
const hashedQuery = await hashQuery(query, params)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('the Sanity request context', () => {
  const request = new Request('https://example.com')
  const sanity = createSanityContext({request, cache, client})

  it('should return a client', () => {
    expect(sanity.client).toSatisfy((contextClient) => contextClient instanceof SanityClient)
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
    await sanity.loadQuery<boolean>(query, params, {
      hydrogen: {cache: strategy},
    })
    expect(runWithCache).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({cacheKey: hashedQuery, cacheStrategy: strategy}),
      expect.any(Function),
    )
    expect(cache.put).toHaveBeenCalledOnce()
  })
})

describe('when configured for preview', () => {
  const request = new Request('https://example.com')
  const previewSession = new PreviewSession()
  previewSession.set('projectId', projectId)

  const sanity = createSanityContext({
    request,
    cache,
    client,
    preview: {
      token: 'my-token',
      session: previewSession,
    },
  })

  it('should throw if a token is not provided', () => {
    expect(() =>
      // @ts-expect-error meant to test invalid configuration
      createSanityContext({client, preview: {enabled: true}}),
    ).toThrowErrorMatchingInlineSnapshot(`[Error: Enabling preview mode requires a token.]`)
  })

  it.todo(`shouldn't use API CDN`, () => {
    expect(sanity.client.config().useCdn).toBe(false)
  })

  it.todo('should use the `previewDrafts` perspective', () => {
    expect(sanity.client.config().perspective).toBe('previewDrafts')
  })

  it('should enable preview mode', () => {
    expect(sanity.preview?.enabled).toBe(true)
  })

  it(`shouldn't cache queries`, async () => {
    await sanity.loadQuery<boolean>(query)
    expect(loadQuery).toHaveBeenCalledOnce()
    expect(cache.put).not.toHaveBeenCalledOnce()
  })
})

describe('session-based preview detection', () => {
  const request = new Request('https://example.com')
  const previewSession = new PreviewSession()
  previewSession.set('projectId', projectId)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should enable preview when provided session contains matching project ID', () => {
    const context = createSanityContext({
      request,
      cache,
      client,
      preview: {
        token: 'my-token',
        session: previewSession,
      },
    })

    expect(context.preview?.enabled).toBe(true)
  })

  it('should disable preview when provided session contains different project ID', () => {
    previewSession.set('projectId', 'different-project-id')

    const context = createSanityContext({
      request,
      cache,
      client,
      preview: {
        token: 'my-token',
        session: previewSession,
      },
    })

    expect(context.preview?.enabled).toBe(false)
  })

  it('should disable preview when provided session contains no project ID', () => {
    previewSession.unset('projectId')

    const context = createSanityContext({
      request,
      cache,
      client,
      preview: {
        token: 'my-token',
        session: previewSession,
      },
    })

    expect(context.preview?.enabled).toBe(false)
  })
})

describe('stegaEnabled serialization', () => {
  const request = new Request('https://example.com')

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should set stegaEnabled to false when preview is enabled but stega not configured', () => {
    const previewSession = new PreviewSession()
    previewSession.set('projectId', projectId)

    const context = createSanityContext({
      request,
      cache,
      client,
      preview: {
        token: 'my-token',
        session: previewSession,
      },
    })

    const providerProps = (context.SanityProvider({children: null}) as {props: {value: unknown}})
      .props
    expect(providerProps.value.stegaEnabled).toBe(false) // stega is opt-in, not automatic
    expect(providerProps.value.previewEnabled).toBe(true)
  })

  it('should set stegaEnabled to false when preview is disabled', () => {
    const context = createSanityContext({
      request,
      cache,
      client,
    })

    const providerProps = (context.SanityProvider({children: null}) as {props: {value: unknown}})
      .props
    expect(providerProps.value.stegaEnabled).toBe(false)
    expect(providerProps.value.previewEnabled).toBe(false)
  })

  it('should set stegaEnabled to false when preview session contains different project ID', () => {
    const previewSession = new PreviewSession()
    previewSession.set('projectId', 'different-project-id')

    const context = createSanityContext({
      request,
      cache,
      client,
      preview: {
        token: 'my-token',
        session: previewSession,
      },
    })

    const providerProps = (context.SanityProvider({children: null}) as {props: {value: unknown}})
      .props
    expect(providerProps.value.stegaEnabled).toBe(false)
    expect(providerProps.value.previewEnabled).toBe(false)
  })

  it('should set stegaEnabled to false when preview session contains no project ID', () => {
    const previewSession = new PreviewSession()
    // Don't set projectId

    const context = createSanityContext({
      request,
      cache,
      client,
      preview: {
        token: 'my-token',
        session: previewSession,
      },
    })

    const providerProps = (context.SanityProvider({children: null}) as {props: {value: unknown}})
      .props
    expect(providerProps.value.stegaEnabled).toBe(false)
    expect(providerProps.value.previewEnabled).toBe(false)
  })

  it('should work with Hydrogen session for stegaEnabled', () => {
    const hydrogenSession = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'projectId') return projectId
        return undefined
      }),
      set: vi.fn(),
      unset: vi.fn(),
      has: vi.fn(),
      commit: vi.fn(),
      destroy: vi.fn(),
    }

    const context = createSanityContext({
      request,
      cache,
      client,
      preview: {
        token: 'my-token',
        session: hydrogenSession as unknown as PreviewSession,
      },
    })

    const providerProps = (context.SanityProvider({children: null}) as {props: {value: unknown}})
      .props
    expect(providerProps.value.stegaEnabled).toBe(false) // stega is opt-in, not automatic
    expect(providerProps.value.previewEnabled).toBe(true)
  })

  it('should include stegaEnabled in provider value interface', () => {
    const context = createSanityContext({
      request,
      cache,
      client,
    })

    const providerProps = (context.SanityProvider({children: null}) as {props: {value: unknown}})
      .props
    const providerValue = providerProps.value

    // Ensure all expected properties are present
    expect(providerValue).toHaveProperty('projectId')
    expect(providerValue).toHaveProperty('dataset')
    expect(providerValue).toHaveProperty('apiHost')
    expect(providerValue).toHaveProperty('apiVersion')
    expect(providerValue).toHaveProperty('previewEnabled')
    expect(providerValue).toHaveProperty('perspective')
    expect(providerValue).toHaveProperty('stegaEnabled')

    // Type assertion to ensure stegaEnabled is boolean
    expect(typeof providerValue.stegaEnabled).toBe('boolean')
  })

  it('should enable stegaEnabled when explicitly configured in client', () => {
    const previewSession = new PreviewSession()
    previewSession.set('projectId', projectId)

    const clientWithStega = createClient({
      projectId,
      dataset: 'production',
      stega: {
        enabled: true,
        studioUrl: 'https://test.sanity.studio',
      },
    })

    const context = createSanityContext({
      request,
      cache,
      client: clientWithStega,
      preview: {
        token: 'my-token',
        session: previewSession,
      },
    })

    const providerProps = (context.SanityProvider({children: null}) as {props: {value: unknown}})
      .props
    expect(providerProps.value.stegaEnabled).toBe(true)
    expect(providerProps.value.previewEnabled).toBe(true)
  })

  it('should maintain independence between preview and stegaEnabled flags', () => {
    const previewSession = new PreviewSession()
    previewSession.set('projectId', projectId)

    const contextWithPreview = createSanityContext({
      request,
      cache,
      client,
      preview: {
        token: 'my-token',
        session: previewSession,
      },
    })

    const contextWithoutPreview = createSanityContext({
      request,
      cache,
      client,
    })

    const providerPropsWithPreview = (
      contextWithPreview.SanityProvider({children: null}) as {props: {value: unknown}}
    ).props
    const providerPropsWithoutPreview = (
      contextWithoutPreview.SanityProvider({children: null}) as {props: {value: unknown}}
    ).props

    // Preview can be true while stegaEnabled remains false (stega is opt-in)
    expect(providerPropsWithPreview.value.previewEnabled).toBe(true)
    expect(providerPropsWithPreview.value.stegaEnabled).toBe(false)

    // Both should be false when preview is disabled
    expect(providerPropsWithoutPreview.value.previewEnabled).toBe(false)
    expect(providerPropsWithoutPreview.value.stegaEnabled).toBe(false)
  })

  it('should freeze provider value object', () => {
    const context = createSanityContext({
      request,
      cache,
      client,
    })

    const providerProps = (context.SanityProvider({children: null}) as {props: {value: unknown}})
      .props
    const providerValue = providerProps.value

    expect(Object.isFrozen(providerValue)).toBe(true)
  })
})
