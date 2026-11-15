import {afterAll, beforeAll, beforeEach, describe, expect, it} from 'vitest'

import {sanityContext, SanityRouterError} from '../src'
import {memoryCache} from '../src/cache'
import {loader as enablePreview} from '../src/preview/route'
import {createSanityMiddleware, type SanityMiddlewareConfig} from '../src/server'
import {startFakeLake, VALID_SECRET, type FakeLake} from './fake-lake'
import {runMiddleware, setCookies, toCookieHeader} from './helpers'

const QUERY = '*[_type == "page" && slug.current == $slug][0]{title}'
let lake: FakeLake

beforeAll(async () => {
  lake = await startFakeLake((_query, params) => {
    const drafts = params.get('perspective') === 'drafts'
    return {result: {title: drafts ? 'Draft title' : 'Published title'}, syncTags: ['s1:page']}
  })
})
afterAll(() => lake.close())
beforeEach(() => {
  lake.requests.length = 0
})

const baseConfig = (overrides: Partial<SanityMiddlewareConfig> = {}): SanityMiddlewareConfig => ({
  client: lake.client(),
  serverToken: 'sk-server-token',
  studioUrl: 'https://studio.example.com',
  preview: {sessionSecrets: ['s3cret']},
  ...overrides,
})

/** Enters preview through the real preview route and returns the cookie header. */
async function enterPreview(config: SanityMiddlewareConfig, headers: HeadersInit = {}): Promise<string[]> {
  const middleware = createSanityMiddleware(config)
  const url = `https://shop.example.com/api/preview?sanity-preview-secret=${VALID_SECRET}&sanity-preview-pathname=/products/a`
  const response = await runMiddleware(middleware, new Request(url, {headers}), (context) =>
    enablePreview({request: new Request(url, {headers}), context}),
  )
  expect(response.status).toBe(307)
  return setCookies(response)
}

describe('sanity.fetch in production', () => {
  it('reads published content from the API CDN with cacheMode=noStale and no token', async () => {
    const middleware = createSanityMiddleware(baseConfig())
    let result: unknown
    const response = await runMiddleware(middleware, new Request('https://shop.example.com/'), async (context) => {
      result = await context.get(sanityContext).fetch({query: QUERY, params: {slug: 'home'}})
      return new Response('ok')
    })

    expect(result).toEqual({data: {title: 'Published title'}, syncTags: ['s1:page']})
    const [request] = lake.requests
    expect(request?.params.get('perspective')).toBe('published')
    expect(request?.params.get('cacheMode')).toBe('noStale')
    expect(request?.params.has('resultSourceMap')).toBe(false)
    expect(request?.headers.authorization).toBeUndefined()
    expect(response.headers.get('Cache-Control')).toBeNull()
    expect(response.headers.get('Server-Timing')).toMatch(/^sanity;desc="hit=0 stale=0 miss=0 bypass=1";dur=/)
  })

  it('serves the second request from the app cache', async () => {
    const middleware = createSanityMiddleware(baseConfig({cache: {store: memoryCache()}}))
    const run = () =>
      runMiddleware(middleware, new Request('https://shop.example.com/'), async (context) => {
        await context.get(sanityContext).fetch({query: QUERY, params: {slug: 'home'}})
        return new Response('ok')
      })
    const first = await run()
    const second = await run()
    expect(lake.requests).toHaveLength(1)
    expect(first.headers.get('Server-Timing')).toContain('miss=1')
    expect(second.headers.get('Server-Timing')).toContain('hit=1')
  })

  it('skips the app cache and sends lastLiveEventId when the live event cookie is present', async () => {
    const store = memoryCache()
    const middleware = createSanityMiddleware(baseConfig({cache: {store}}))
    const run = (cookie?: string) =>
      runMiddleware(
        middleware,
        new Request('https://shop.example.com/', {headers: cookie ? {Cookie: cookie} : {}}),
        async (context) => {
          await context.get(sanityContext).fetch({query: QUERY, params: {slug: 'home'}})
          return new Response('ok')
        },
      )
    await run()
    await run('__sanity_live_event=evt-42')
    expect(lake.requests).toHaveLength(2)
    expect(lake.requests[1]?.params.get('lastLiveEventId')).toBe('evt-42')
  })

  it('collects the sync tags of the request and emits the opt-in CDN tag header', async () => {
    const middleware = createSanityMiddleware(baseConfig({cdnTags: {header: 'Cache-Tag'}}))
    let tags: string[] = []
    const response = await runMiddleware(middleware, new Request('https://shop.example.com/'), async (context) => {
      const sanity = context.get(sanityContext)
      await sanity.fetch({query: QUERY, params: {slug: 'a'}})
      tags = sanity.syncTags()
      return new Response('ok')
    })
    expect(tags).toEqual(['s1:page'])
    expect(response.headers.get('Cache-Tag')).toBe('sanity-p1-production,s1:page')
  })

  it('keeps cookies that other middleware or the route wrote', async () => {
    const middleware = createSanityMiddleware(baseConfig())
    const cookies = await enterPreview(baseConfig())
    const url = 'https://shop.example.com/api/preview'
    const response = await runMiddleware(
      middleware,
      new Request(url, {method: 'POST', headers: {Cookie: toCookieHeader(cookies), Origin: 'https://shop.example.com'}}),
      async (context) => {
        const {action} = await import('../src/preview/route')
        const exit = await action({
          request: new Request(url, {method: 'POST', headers: {Cookie: toCookieHeader(cookies), Origin: 'https://shop.example.com'}}),
          context,
        })
        exit.headers.append('Set-Cookie', 'cart=abc; Path=/')
        return exit
      },
    )
    const written = setCookies(response)
    expect(written.some((cookie) => cookie.startsWith('cart=abc'))).toBe(true)
    expect(written.some((cookie) => cookie.startsWith('__sanity_preview='))).toBe(true)
  })
})

describe('sanity.fetch in preview', () => {
  it('reads drafts from the live API with the server token, stega and no app cache', async () => {
    const store = memoryCache()
    const config = baseConfig({cache: {store}})
    const cookies = await enterPreview(config)
    lake.requests.length = 0

    const middleware = createSanityMiddleware(config)
    let result: unknown
    const response = await runMiddleware(
      middleware,
      new Request('https://shop.example.com/', {headers: {Cookie: toCookieHeader(cookies)}}),
      async (context) => {
        const sanity = context.get(sanityContext)
        expect(sanity.preview).toEqual({enabled: true, perspective: 'drafts'})
        result = await sanity.fetch({query: QUERY, params: {slug: 'home'}})
        await sanity.fetch({query: QUERY, params: {slug: 'home'}})
        return new Response('ok')
      },
    )

    expect(result).toMatchObject({data: {title: 'Draft title'}})
    expect(lake.requests).toHaveLength(2)
    const [request] = lake.requests
    expect(request?.headers.authorization).toBe('Bearer sk-server-token')
    expect(request?.params.get('perspective')).toBe('drafts')
    expect(request?.params.has('cacheMode')).toBe(false)
    expect(request?.params.get('resultSourceMap')).toBe('withKeyArraySelector')
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
  })

  it('drops CDN tag headers from preview responses', async () => {
    const config = baseConfig({cdnTags: {header: 'Surrogate-Key'}})
    const cookies = await enterPreview(config)
    const response = await runMiddleware(
      createSanityMiddleware(config),
      new Request('https://shop.example.com/', {headers: {Cookie: toCookieHeader(cookies)}}),
      () => new Response('ok', {headers: {'Cache-Tag': 'leak', 'Surrogate-Key': 'leak'}}),
    )
    expect(response.headers.get('Cache-Tag')).toBeNull()
    expect(response.headers.get('Surrogate-Key')).toBeNull()
  })

  it('ignores a preview session when the config has no server token', async () => {
    const cookies = await enterPreview(baseConfig())
    const config = baseConfig({serverToken: undefined})
    await runMiddleware(
      createSanityMiddleware(config),
      new Request('https://shop.example.com/', {headers: {Cookie: toCookieHeader(cookies)}}),
      (context) => {
        expect(context.get(sanityContext).preview.enabled).toBe(false)
        return new Response('ok')
      },
    )
  })

  it('ignores a preview session for another dataset', async () => {
    const cookies = await enterPreview(baseConfig())
    const config = baseConfig({client: lake.client().withConfig({dataset: 'staging'})})
    await runMiddleware(
      createSanityMiddleware(config),
      new Request('https://shop.example.com/', {headers: {Cookie: toCookieHeader(cookies)}}),
      (context) => {
        expect(context.get(sanityContext).preview.enabled).toBe(false)
        return new Response('ok')
      },
    )
  })
})

describe('request isolation', () => {
  it('keeps preview state per request when requests interleave', async () => {
    const config = baseConfig()
    const cookies = await enterPreview(config)
    const middleware = createSanityMiddleware(config)
    const seen: Record<string, unknown> = {}
    let releasePreview: () => void = () => {}
    const previewGate = new Promise<void>((resolve) => {
      releasePreview = resolve
    })

    await Promise.all([
      runMiddleware(
        middleware,
        new Request('https://shop.example.com/a', {headers: {Cookie: toCookieHeader(cookies)}}),
        async (context) => {
          await previewGate
          const {data} = await context.get(sanityContext).fetch({query: QUERY, params: {slug: 'a'}})
          seen.preview = data
          return new Response('ok')
        },
      ),
      runMiddleware(middleware, new Request('https://shop.example.com/b'), async (context) => {
        const {data} = await context.get(sanityContext).fetch({query: QUERY, params: {slug: 'b'}})
        seen.production = data
        releasePreview()
        return new Response('ok')
      }),
    ])

    expect(seen).toEqual({preview: {title: 'Draft title'}, production: {title: 'Published title'}})
  })
})

describe('getRootData', () => {
  it('serializes no token outside preview, even when browserToken is set', async () => {
    const config = baseConfig({preview: {sessionSecrets: ['s3cret'], browserToken: 'sk-browser'}})
    await runMiddleware(createSanityMiddleware(config), new Request('https://shop.example.com/'), (context) => {
      const data = context.get(sanityContext).getRootData()
      // The fake Content Lake uses a custom host, so `apiHost` and `useProjectHostname` appear.
      expect(Object.keys(data).sort()).toEqual([
        'apiHost',
        'apiVersion',
        'dataset',
        'live',
        'preview',
        'previewRoute',
        'projectId',
        'studioUrl',
        'useProjectHostname',
      ])
      expect(data.apiHost).toBe(lake.url)
      expect(JSON.stringify(data)).not.toContain('sk-')
      return new Response('ok')
    })
  })

  it('serializes the browser token only in preview and only when opted in', async () => {
    const config = baseConfig({preview: {sessionSecrets: ['s3cret'], browserToken: 'sk-browser'}})
    const cookies = await enterPreview(config)
    await runMiddleware(
      createSanityMiddleware(config),
      new Request('https://shop.example.com/', {headers: {Cookie: toCookieHeader(cookies)}}),
      (context) => {
        const data = context.get(sanityContext).getRootData()
        expect(data.browserToken).toBe('sk-browser')
        expect(JSON.stringify(data)).not.toContain('sk-server-token')
        return new Response('ok')
      },
    )
  })
})

describe('review fixes', () => {
  it('ignores a malformed or oversized live event cookie instead of failing the request', async () => {
    const store = memoryCache()
    const middleware = createSanityMiddleware(baseConfig({cache: {store}}))
    const run = (cookie: string) =>
      runMiddleware(middleware, new Request('https://shop.example.com/', {headers: {Cookie: cookie}}), async (context) => {
        await context.get(sanityContext).fetch({query: QUERY, params: {slug: 'cookie'}})
        return new Response('ok')
      })
    expect((await run('__sanity_live_event=%')).status).toBe(200)
    expect((await run(`__sanity_live_event=${'a'.repeat(500)}`)).status).toBe(200)
    // Neither cookie skipped the cache: one API call, then a hit.
    expect(lake.requests).toHaveLength(1)
    expect(lake.requests[0]?.params.has('lastLiveEventId')).toBe(false)
  })

  it('appends the CDN tag header to tags that the route wrote', async () => {
    const middleware = createSanityMiddleware(baseConfig({cdnTags: {header: 'Cache-Tag'}}))
    const response = await runMiddleware(middleware, new Request('https://shop.example.com/'), async (context) => {
      await context.get(sanityContext).fetch({query: QUERY, params: {slug: 'a'}})
      return new Response('ok', {headers: {'Cache-Tag': 'product-42'}})
    })
    expect(response.headers.get('Cache-Tag')).toBe('product-42, sanity-p1-production,s1:page')
  })

  it('uses the short default TTL for a per-process store, and the long one for a global store', async () => {
    const {defaultStrategy} = await import('../src/server/request-context')
    const {kvCache} = await import('../src/cache')
    const kv = kvCache({store: {get: async () => null, put: async () => {}, delete: async () => {}}})
    expect(defaultStrategy(baseConfig({cache: {store: memoryCache()}, live: {secret: 's'}})).maxAge).toBe(10)
    expect(defaultStrategy(baseConfig({cache: {store: kv}, live: {secret: 's'}})).maxAge).toBe(3600)
    expect(defaultStrategy(baseConfig({cache: {store: kv}})).maxAge).toBe(10)
  })
})

describe('errors', () => {
  it('throws RRS010 when a loader reads the context without the middleware', async () => {
    const {RouterContextProvider} = await import('react-router')
    const context = new RouterContextProvider()
    const sanity = context.get(sanityContext)
    expect(() => sanity.fetch({query: QUERY})).toThrow(SanityRouterError)
    expect(() => sanity.preview).toThrow(/RRS010/)
  })

  it('throws RRS011 when the config has no client', async () => {
    // @ts-expect-error -- The type requires `client`. A JavaScript caller can still omit it.
    const middleware = createSanityMiddleware(() => ({...baseConfig(), client: undefined}))
    await expect(runMiddleware(middleware, new Request('https://shop.example.com/'), () => new Response())).rejects.toThrow(
      /RRS011/,
    )
  })
})
