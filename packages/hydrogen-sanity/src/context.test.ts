import {createClient, SanityClient} from '@sanity/client'
import type {QueryStore} from '@sanity/react-loader'
import type {CachingStrategy} from '@shopify/hydrogen'
import groq from 'groq'
import {beforeEach, describe, expect, it, vi} from 'vitest'

import type {CachedRun, CachedRunContext, CachedRunOptions} from './cache'
import {createSanityContext} from './context'
import {MapCache, PreviewSession} from './fixtures'
import type {SanityProviderValue} from './provider'
import {hashQuery} from './utils'

// A cache that never returns an entry, for tests that don't exercise caching
const cache = vi.hoisted<Cache>(() => ({
  add: vi.fn().mockResolvedValue(undefined),
  addAll: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(true),
  keys: vi.fn().mockResolvedValue([]),
  match: vi.fn().mockResolvedValue(undefined),
  matchAll: vi.fn().mockResolvedValue([]),
  put: vi.fn().mockResolvedValue(undefined),
}))

const loadQuery = vi.hoisted<QueryStore['loadQuery']>(() => vi.fn().mockResolvedValue({data: true}))
const setServerClient = vi.hoisted(() => vi.fn())
const cachedRuns = vi.hoisted<Pick<CachedRunOptions<unknown>, 'key' | 'strategy'>[]>(() => [])

// Record each cached run, and let the installed Hydrogen do the caching
vi.mock('./cache', async (importOriginal) => {
  const module = await importOriginal<typeof import('./cache')>()

  return {
    ...module,
    createCachedRun: (context: CachedRunContext): CachedRun => {
      const run = module.createCachedRun(context)
      return (options, fn) => {
        cachedRuns.push({key: options.key, strategy: options.strategy})
        return run(options, fn)
      }
    },
  }
})

vi.mock('@sanity/react-loader', async (importOriginal) => {
  const module = await importOriginal<typeof import('@sanity/react-loader')>()

  return {
    ...module,
    loadQuery,
    setServerClient,
  }
})

const projectId = 'my-project-id'
const client = createClient({projectId, dataset: 'my-dataset'})
const query = groq`true`
const params = {}
const hashedQuery = await hashQuery(query, params)
const shortStrategy = {mode: 'public', maxAge: 1, staleWhileRevalidate: 9} satisfies CachingStrategy

// Collect background cache writes, so a test can wait for them before it reads the cache again
const pendingWrites: Promise<unknown>[] = []
const waitUntil = (promise: Promise<unknown>) => {
  pendingWrites.push(promise)
}
const flushWrites = () => Promise.all(pendingWrites.splice(0))

beforeEach(() => {
  vi.clearAllMocks()
  cachedRuns.length = 0
  pendingWrites.length = 0
})

describe('the Sanity request context', () => {
  const request = new Request('https://example.com')

  it('should return a client', async () => {
    const sanity = await createSanityContext({request, cache, client})
    expect(sanity.client).toSatisfy((contextClient) => contextClient instanceof SanityClient)
  })

  it('queries should get cached using the default caching strategy', async () => {
    const sanity = await createSanityContext({
      request,
      cache: new MapCache(),
      waitUntil,
      client,
      defaultStrategy: shortStrategy,
    })

    await sanity.loadQuery<boolean>(query, params)
    await flushWrites()
    await sanity.loadQuery<boolean>(query, params)

    expect(loadQuery).toHaveBeenCalledOnce()
    expect(cachedRuns[0]).toEqual({key: hashedQuery, strategy: shortStrategy})
  })

  it('queries should use the cache strategy passed in `loadQuery`', async () => {
    const sanity = await createSanityContext({request, cache: new MapCache(), waitUntil, client})

    await sanity.loadQuery<boolean>(query, params, {hydrogen: {cache: shortStrategy}})

    expect(cachedRuns[0]).toEqual({key: hashedQuery, strategy: shortStrategy})
  })

  it('fetch calls should get cached', async () => {
    const sanity = await createSanityContext({request, cache: new MapCache(), waitUntil, client})
    const response = {result: {title: 'Home'}, resultSourceMap: undefined, ms: 100}
    const fetch = vi.spyOn(sanity.client, 'fetch').mockResolvedValue(response)

    await sanity.fetch(query, params)
    await flushWrites()
    const result = await sanity.fetch(query, params)

    expect(result).toEqual(response)
    expect(fetch).toHaveBeenCalledOnce()
  })
})

describe('when configured for preview', () => {
  const request = new Request('https://example.com')
  const previewSession = new PreviewSession()
  previewSession.set('projectId', projectId)

  let sanity: Awaited<ReturnType<typeof createSanityContext>>

  beforeEach(async () => {
    sanity = await createSanityContext({
      request,
      cache: new MapCache(),
      waitUntil,
      client,
      preview: {
        token: 'my-token',
        session: previewSession,
      },
    })
  })

  it('should throw if a token is not provided', async () => {
    await expect(
      // @ts-expect-error meant to test invalid configuration
      createSanityContext({client, preview: {enabled: true}}),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: Enabling preview mode requires a token.]`)
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
    await flushWrites()
    await sanity.loadQuery<boolean>(query)

    expect(loadQuery).toHaveBeenCalledTimes(2)
    expect(cachedRuns).toHaveLength(0)
  })

  it(`shouldn't cache fetch calls`, async () => {
    const spy = vi.spyOn(sanity.client, 'fetch').mockResolvedValue({
      result: true,
      resultSourceMap: undefined,
      ms: 100,
    })

    await sanity.fetch<boolean>(query)
    await flushWrites()
    await sanity.fetch<boolean>(query)

    expect(spy).toHaveBeenCalledTimes(2)
    expect(cachedRuns).toHaveLength(0)
  })
})

describe('session-based preview detection', () => {
  const request = new Request('https://example.com')
  const previewSession = new PreviewSession()
  previewSession.set('projectId', projectId)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should enable preview when provided session contains matching project ID', async () => {
    const context = await createSanityContext({
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

  it('should disable preview when provided session contains different project ID', async () => {
    previewSession.set('projectId', 'different-project-id')

    const context = await createSanityContext({
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

  it('should disable preview when provided session contains no project ID', async () => {
    previewSession.unset('projectId')

    const context = await createSanityContext({
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

  it('should set stegaEnabled to false when preview is enabled but stega not configured', async () => {
    const previewSession = new PreviewSession()
    previewSession.set('projectId', projectId)

    const context = await createSanityContext({
      request,
      cache,
      client,
      preview: {
        token: 'my-token',
        session: previewSession,
      },
    })

    const providerProps = (
      context.SanityProvider({children: null}) as {props: {value: SanityProviderValue}}
    ).props
    expect(providerProps.value.stegaEnabled).toBe(false) // stega is opt-in, not automatic
    expect(providerProps.value.previewEnabled).toBe(true)
  })

  it('should set stegaEnabled to false when preview is disabled', async () => {
    const context = await createSanityContext({
      request,
      cache,
      client,
    })

    const providerProps = (
      context.SanityProvider({children: null}) as {props: {value: SanityProviderValue}}
    ).props
    expect(providerProps.value.stegaEnabled).toBe(false)
    expect(providerProps.value.previewEnabled).toBe(false)
  })

  it('should set stegaEnabled to false when preview session contains different project ID', async () => {
    const previewSession = new PreviewSession()
    previewSession.set('projectId', 'different-project-id')

    const context = await createSanityContext({
      request,
      cache,
      client,
      preview: {
        token: 'my-token',
        session: previewSession,
      },
    })

    const providerProps = (
      context.SanityProvider({children: null}) as {props: {value: SanityProviderValue}}
    ).props
    expect(providerProps.value.stegaEnabled).toBe(false)
    expect(providerProps.value.previewEnabled).toBe(false)
  })

  it('should set stegaEnabled to false when preview session contains no project ID', async () => {
    const previewSession = new PreviewSession()
    // Don't set projectId

    const context = await createSanityContext({
      request,
      cache,
      client,
      preview: {
        token: 'my-token',
        session: previewSession,
      },
    })

    const providerProps = (
      context.SanityProvider({children: null}) as {props: {value: SanityProviderValue}}
    ).props
    expect(providerProps.value.stegaEnabled).toBe(false)
    expect(providerProps.value.previewEnabled).toBe(false)
  })

  it('should work with Hydrogen session for stegaEnabled', async () => {
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

    const context = await createSanityContext({
      request,
      cache,
      client,
      preview: {
        token: 'my-token',
        session: hydrogenSession as unknown as PreviewSession,
      },
    })

    const providerProps = (
      context.SanityProvider({children: null}) as {props: {value: SanityProviderValue}}
    ).props
    expect(providerProps.value.stegaEnabled).toBe(false) // stega is opt-in, not automatic
    expect(providerProps.value.previewEnabled).toBe(true)
  })

  it('should include stegaEnabled in provider value interface', async () => {
    const context = await createSanityContext({
      request,
      cache,
      client,
    })

    const providerProps = (
      context.SanityProvider({children: null}) as {props: {value: SanityProviderValue}}
    ).props
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

  it('should enable stegaEnabled when explicitly configured in client', async () => {
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

    const context = await createSanityContext({
      request,
      cache,
      client: clientWithStega,
      preview: {
        token: 'my-token',
        session: previewSession,
      },
    })

    const providerProps = (
      context.SanityProvider({children: null}) as {props: {value: SanityProviderValue}}
    ).props
    expect(providerProps.value.stegaEnabled).toBe(true)
    expect(providerProps.value.previewEnabled).toBe(true)
  })

  it('should maintain independence between preview and stegaEnabled flags', async () => {
    const previewSession = new PreviewSession()
    previewSession.set('projectId', projectId)

    const contextWithPreview = await createSanityContext({
      request,
      cache,
      client,
      preview: {
        token: 'my-token',
        session: previewSession,
      },
    })

    const contextWithoutPreview = await createSanityContext({
      request,
      cache,
      client,
    })

    const providerPropsWithPreview = (
      contextWithPreview.SanityProvider({children: null}) as {props: {value: SanityProviderValue}}
    ).props
    const providerPropsWithoutPreview = (
      contextWithoutPreview.SanityProvider({children: null}) as {
        props: {value: SanityProviderValue}
      }
    ).props

    // Preview can be true while stegaEnabled remains false (stega is opt-in)
    expect(providerPropsWithPreview.value.previewEnabled).toBe(true)
    expect(providerPropsWithPreview.value.stegaEnabled).toBe(false)

    // Both should be false when preview is disabled
    expect(providerPropsWithoutPreview.value.previewEnabled).toBe(false)
    expect(providerPropsWithoutPreview.value.stegaEnabled).toBe(false)
  })

  it('should freeze provider value object', async () => {
    const context = await createSanityContext({
      request,
      cache,
      client,
    })

    const providerProps = (
      context.SanityProvider({children: null}) as {props: {value: SanityProviderValue}}
    ).props
    const providerValue = providerProps.value

    expect(Object.isFrozen(providerValue)).toBe(true)
  })
})

describe('perspective resolution priority', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should use URL param perspective over session value', async () => {
    const previewSession = new PreviewSession()
    previewSession.set('projectId', projectId)
    previewSession.set('perspective', 'drafts')

    const request = new Request('https://example.com/?sanity-preview-perspective=releaseId,drafts')

    const context = await createSanityContext({
      request,
      cache,
      client,
      preview: {
        token: 'my-token',
        session: previewSession,
      },
    })

    expect(context.client.config().perspective).toEqual(['releaseId', 'drafts'])
  })

  it('should fall back to session perspective when URL param is absent', async () => {
    const previewSession = new PreviewSession()
    previewSession.set('projectId', projectId)
    previewSession.set('perspective', 'drafts')

    const request = new Request('https://example.com/')

    const context = await createSanityContext({
      request,
      cache,
      client,
      preview: {
        token: 'my-token',
        session: previewSession,
      },
    })

    expect(context.client.config().perspective).toEqual(['drafts'])
  })

  it('should pass perspective explicitly to loadQuery in preview mode', async () => {
    const previewSession = new PreviewSession()
    previewSession.set('projectId', projectId)
    previewSession.set('perspective', 'drafts')

    const request = new Request('https://example.com/?sanity-preview-perspective=releaseId,drafts')

    const context = await createSanityContext({
      request,
      cache,
      client,
      preview: {
        token: 'my-token',
        session: previewSession,
      },
    })

    await context.loadQuery<boolean>(query, params)

    expect(loadQuery).toHaveBeenCalledWith(
      query,
      params,
      expect.objectContaining({
        perspective: ['releaseId', 'drafts'],
      }),
    )
  })

  it('should ignore URL param perspective stack when API version is too old', async () => {
    const previewSession = new PreviewSession()
    previewSession.set('projectId', projectId)

    const oldClient = createClient({
      projectId,
      dataset: 'my-dataset',
      apiVersion: '2024-01-01',
    })

    const request = new Request('https://example.com/?sanity-preview-perspective=releaseId,drafts')

    const context = await createSanityContext({
      request,
      cache,
      client: oldClient,
      preview: {
        token: 'my-token',
        session: previewSession,
      },
    })

    // Should fall back to previewDrafts since API version doesn't support stacks
    expect(context.client.config().perspective).toBe('previewDrafts')
  })

  it('should accept single URL param perspective even with old API version', async () => {
    const previewSession = new PreviewSession()
    previewSession.set('projectId', projectId)

    const oldClient = createClient({
      projectId,
      dataset: 'my-dataset',
      apiVersion: '2024-01-01',
    })

    const request = new Request('https://example.com/?sanity-preview-perspective=drafts')

    const context = await createSanityContext({
      request,
      cache,
      client: oldClient,
      preview: {
        token: 'my-token',
        session: previewSession,
      },
    })

    expect(context.client.config().perspective).toBe('drafts')
  })
})

describe('lazy-initialize loaders', () => {
  const request = new Request('https://example.com')

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shouldn't call `setServerClient` during context creation", async () => {
    await createSanityContext({
      request,
      cache,
      client,
    })

    expect(setServerClient).not.toHaveBeenCalled()
  })

  it('should call `setServerClient` on every `loadQuery` invocation', async () => {
    const context = await createSanityContext({
      request,
      cache,
      client,
    })

    await context.loadQuery<boolean>(query, params)
    expect(setServerClient).toHaveBeenCalledTimes(1)

    await context.loadQuery<boolean>(query, params)
    expect(setServerClient).toHaveBeenCalledTimes(2)
  })

  it('should call `setServerClient` with the preview-configured client', async () => {
    const previewSession = new PreviewSession()
    previewSession.set('projectId', projectId)

    const context = await createSanityContext({
      request,
      cache,
      client,
      preview: {
        token: 'my-token',
        session: previewSession,
      },
    })

    await context.loadQuery<boolean>(query, params)

    const calledWithClient = setServerClient.mock.calls[0][0]
    expect(calledWithClient.config().useCdn).toBe(false)
    expect(calledWithClient.config().token).toBe('my-token')
  })

  it('should display warning when `loadQuery` called outside preview mode in development', async () => {
    const originalNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const context = await createSanityContext({
      request,
      cache,
      client,
    })

    const callsBefore = warnSpy.mock.calls.length

    await context.loadQuery<boolean>(query, params)

    // Should have warned about loadQuery usage (may have other warnings too)
    expect(warnSpy.mock.calls.length).toBeGreaterThan(callsBefore)
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('`loadQuery` is being called outside of preview mode'),
    )

    const callsAfterFirst = warnSpy.mock.calls.length

    // Second call should not warn again about loadQuery
    await context.loadQuery<boolean>(query, params)
    expect(warnSpy.mock.calls.length).toBe(callsAfterFirst)

    warnSpy.mockRestore()
    process.env.NODE_ENV = originalNodeEnv
  })

  it("shouldn't display warning in production", async () => {
    const originalNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const context = await createSanityContext({
      request,
      cache,
      client,
    })

    await context.loadQuery<boolean>(query, params)

    expect(warnSpy).not.toHaveBeenCalled()

    warnSpy.mockRestore()
    process.env.NODE_ENV = originalNodeEnv
  })

  it("shouldn't display warning when in preview mode", async () => {
    const originalNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const previewSession = new PreviewSession()
    previewSession.set('projectId', projectId)

    const context = await createSanityContext({
      request,
      cache,
      client,
      preview: {
        token: 'my-token',
        session: previewSession,
      },
    })

    await context.loadQuery<boolean>(query, params)

    // Should not warn because we're in preview mode
    expect(warnSpy).not.toHaveBeenCalled()

    warnSpy.mockRestore()
    process.env.NODE_ENV = originalNodeEnv
  })
})
