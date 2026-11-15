import {afterAll, beforeAll, describe, expect, it} from 'vitest'

import {
  createNonce,
  createSanityCspDirectives,
  getSanityCspDirectives,
  serializeCsp,
  type SanityCspDirectives,
} from '../src/csp'
import {loader as enablePreview} from '../src/preview/route'
import {createSanityMiddleware, type SanityMiddlewareConfig} from '../src/server'
import {startFakeLake, VALID_SECRET, type FakeLake} from './fake-lake'
import {runMiddleware, setCookies, toCookieHeader} from './helpers'

const base = {projectId: 'p1', dataset: 'production'}

describe('createSanityCspDirectives', () => {
  it('allows the API, the API CDN and the dataset asset paths in production, and no framing', () => {
    expect(createSanityCspDirectives({...base, preview: false})).toEqual({
      connectSrc: ['https://p1.api.sanity.io', 'https://p1.apicdn.sanity.io'],
      imgSrc: ['https://cdn.sanity.io/images/p1/production/'],
      mediaSrc: ['https://cdn.sanity.io/files/p1/production/'],
    })
  })

  it('allows the Studio and the Dashboard to frame the page in preview, and inline overlay styles', () => {
    const directives = createSanityCspDirectives({...base, preview: true, studioUrl: 'https://acme.sanity.studio/desk'})
    expect(directives.frameAncestors).toEqual(["'self'", 'https://acme.sanity.studio', 'https://www.sanity.io'])
    expect(directives.styleSrc).toEqual(["'unsafe-inline'"])
  })

  it('leaves the Dashboard out on request, and covers an embedded Studio with self', () => {
    const directives = createSanityCspDirectives({...base, preview: true, studioUrl: '/studio', dashboard: false})
    expect(directives.frameAncestors).toEqual(["'self'"])
  })

  it('follows a custom API host, as the client does', () => {
    const staging = createSanityCspDirectives({...base, apiHost: 'https://api.sanity.work', preview: false})
    expect(staging.connectSrc).toEqual(['https://p1.api.sanity.work', 'https://p1.apicdn.sanity.work'])
    expect(staging.imgSrc).toEqual(['https://cdn.sanity.work/images/p1/production/'])

    const proxy = createSanityCspDirectives({
      ...base,
      apiHost: 'https://sanity-proxy.example.com',
      useProjectHostname: false,
      preview: false,
    })
    expect(proxy.connectSrc).toEqual(['https://sanity-proxy.example.com'])
  })

  it('gives only valid CSP sources: no wildcard in a path, and no nonce', () => {
    const all = Object.values(createSanityCspDirectives({...base, preview: true, studioUrl: 'https://s.example.com'})).flat()
    for (const source of all) {
      expect(source).not.toMatch(/'nonce-/)
      if (source.startsWith('https://')) expect(new URL(source).pathname).not.toContain('*')
    }
  })

  it('fits the directives type of Hydrogen createContentSecurityPolicy', () => {
    // A copy of the Hydrogen 2026.10 type (packages/hydrogen/src/core/csp/types.ts), reduced to
    // the keys the SDK writes. The assignment fails `tsc` when the shapes drift apart.
    type Sources = readonly string[] | null
    type HydrogenDirectives = {
      connectSrc?: Sources
      imgSrc?: Sources
      mediaSrc?: Sources
      styleSrc?: Sources
      frameAncestors?: Sources
    }
    const directives: SanityCspDirectives = createSanityCspDirectives({...base, preview: true})
    const hydrogen: HydrogenDirectives = directives
    expect(Object.keys(hydrogen).every((key) => /^[a-z]+(?:[A-Z][a-z]+)*$/.test(key))).toBe(true)
  })
})

describe('serializeCsp', () => {
  it('merges camelCase and kebab-case sets, removes duplicates and skips empty directives', () => {
    const header = serializeCsp(
      {defaultSrc: ["'self'"], 'img-src': ["'self'"], frameAncestors: ["'none'"], reportUri: null},
      {imgSrc: ['https://cdn.sanity.io/images/p1/production/', "'self'"], frameAncestors: ['https://studio.example.com']},
      {connectSrc: []},
    )
    expect(header).toBe(
      "default-src 'self'; img-src 'self' https://cdn.sanity.io/images/p1/production/; frame-ancestors https://studio.example.com",
    )
  })

  it('keeps none when no set adds sources', () => {
    expect(serializeCsp({frameAncestors: ["'none'"]}, createSanityCspDirectives({...base, preview: false}))).toContain(
      "frame-ancestors 'none'",
    )
  })
})

describe('createNonce', () => {
  it('returns a new base64 value of 16 bytes on each call', () => {
    const a = createNonce()
    expect(a).toMatch(/^[A-Za-z0-9+/]{22}==$/)
    expect(createNonce()).not.toBe(a)
  })
})

describe('getSanityCspDirectives', () => {
  let lake: FakeLake
  beforeAll(async () => {
    lake = await startFakeLake(() => ({result: null}))
  })
  afterAll(() => lake.close())

  const config = (): SanityMiddlewareConfig => ({
    client: lake.client(),
    serverToken: 'sk-server',
    studioUrl: 'https://studio.example.com',
    preview: {sessionSecrets: ['s3cret']},
  })

  it('reads the project, the API host, the Studio URL and the preview state from the request', async () => {
    const url = `https://shop.example.com/api/preview?sanity-preview-secret=${VALID_SECRET}&sanity-preview-pathname=/`
    const enable = await runMiddleware(createSanityMiddleware(config()), new Request(url), (context) =>
      enablePreview({request: new Request(url), context}),
    )

    const read = async (cookie?: string) => {
      let directives: SanityCspDirectives | undefined
      await runMiddleware(
        createSanityMiddleware(config()),
        new Request('https://shop.example.com/', {headers: cookie ? {Cookie: cookie} : {}}),
        (context) => {
          directives = getSanityCspDirectives(context)
          return new Response('ok')
        },
      )
      return directives
    }

    const production = await read()
    expect(production?.frameAncestors).toBeUndefined()
    // The fake Content Lake runs with `useProjectHostname: false`.
    expect(production?.connectSrc[0]).toBe(lake.url)

    const preview = await read(toCookieHeader(setCookies(enable)))
    expect(preview?.frameAncestors).toEqual(["'self'", 'https://studio.example.com', 'https://www.sanity.io'])
  })
})
