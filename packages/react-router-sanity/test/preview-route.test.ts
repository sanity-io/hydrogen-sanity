import {afterAll, beforeAll, describe, expect, it} from 'vitest'

import {sanityContext} from '../src'
import {action, loader, parsePerspective} from '../src/preview/route'
import {createSanityMiddleware, type SanityMiddlewareConfig} from '../src/server'
import {startFakeLake, VALID_SECRET, type FakeLake} from './fake-lake'
import {runMiddleware, setCookies, toCookieHeader} from './helpers'

let lake: FakeLake
beforeAll(async () => {
  lake = await startFakeLake(() => ({result: null}))
})
afterAll(() => lake.close())

const ORIGIN = 'https://shop.example.com'
const config = (overrides: Partial<SanityMiddlewareConfig> = {}): SanityMiddlewareConfig => ({
  client: lake.client(),
  serverToken: 'sk-server-token',
  preview: {sessionSecrets: ['s3cret']},
  ...overrides,
})

function enableUrl(secret: string, extra = '') {
  return `${ORIGIN}/api/preview?sanity-preview-secret=${secret}&sanity-preview-pathname=/products/a${extra}`
}

async function callLoader(url: string, headers: HeadersInit = {}, cfg = config()) {
  return runMiddleware(createSanityMiddleware(cfg), new Request(url, {headers}), (context) =>
    loader({request: new Request(url, {headers}), context}),
  )
}

async function callAction(init: RequestInit, cookies: string[], cfg = config()) {
  const headers = new Headers(init.headers)
  headers.set('Cookie', toCookieHeader(cookies))
  const request = () => new Request(`${ORIGIN}/api/preview`, {...init, headers})
  return runMiddleware(createSanityMiddleware(cfg), request(), (context) => action({request: request(), context}))
}

async function readPreview(cookies: string[], cfg = config()) {
  let preview: unknown
  await runMiddleware(
    createSanityMiddleware(cfg),
    new Request(`${ORIGIN}/`, {headers: {Cookie: toCookieHeader(cookies)}}),
    (context) => {
      preview = context.get(sanityContext).preview
      return new Response('ok')
    },
  )
  return preview
}

describe('preview enable (loader)', () => {
  it('redirects to the requested path and writes a signed, secure, cross-site cookie', async () => {
    const response = await callLoader(enableUrl(VALID_SECRET))
    expect(response.status).toBe(307)
    expect(response.headers.get('Location')).toBe('/products/a')
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    const [cookie] = setCookies(response)
    expect(cookie).toMatch(/^__sanity_preview=/)
    expect(cookie).toMatch(/HttpOnly/i)
    expect(cookie).toMatch(/Secure/i)
    expect(cookie).toMatch(/SameSite=None/i)
    expect(cookie).not.toMatch(/Partitioned/i)
  })

  it('returns 401 with no detail and no cookie for a wrong secret', async () => {
    const response = await callLoader(enableUrl('wrong'))
    expect(response.status).toBe(401)
    expect(await response.text()).toBe('')
    expect(setCookies(response)).toEqual([])
  })

  it('writes a Partitioned cookie and a flag cookie for a cross-site iframe', async () => {
    const response = await callLoader(enableUrl(VALID_SECRET), {
      'sec-fetch-dest': 'iframe',
      'sec-fetch-site': 'cross-site',
    })
    const cookies = setCookies(response)
    expect(cookies).toHaveLength(2)
    expect(cookies[0]).toMatch(/Partitioned/i)
    expect(cookies[1]).toMatch(/^__sanity_preview_partitioned=1;.*Partitioned/i)
  })

  it('keeps the partition on later writes from the same iframe', async () => {
    const enable = await callLoader(enableUrl(VALID_SECRET), {
      'sec-fetch-dest': 'iframe',
      'sec-fetch-site': 'cross-site',
    })
    // A fetcher request from inside the iframe is same-origin, so only the flag cookie proves the partition.
    const change = await callAction(
      {method: 'PUT', headers: {Origin: ORIGIN}, body: new URLSearchParams({perspective: 'published'})},
      setCookies(enable),
    )
    expect(setCookies(change)[0]).toMatch(/Partitioned/i)
  })

  it('takes the perspective and variant from Studio', async () => {
    const response = await callLoader(
      enableUrl(VALID_SECRET, '&sanity-preview-perspective=rSummer,drafts&sanity-preview-variant=de'),
    )
    expect(await readPreview(setCookies(response))).toEqual({
      enabled: true,
      perspective: ['rSummer', 'drafts'],
      variant: 'de',
    })
  })

  it('rejects a Studio origin outside the allowlist', async () => {
    const cfg = config({preview: {sessionSecrets: ['s3cret'], allowedStudioOrigins: ['https://other.example.com']}})
    const response = await callLoader(enableUrl(VALID_SECRET), {}, cfg)
    expect(response.status).toBe(401)
  })

  it('throws RRS020 without a server token', async () => {
    await expect(callLoader(enableUrl(VALID_SECRET), {}, config({serverToken: undefined}))).rejects.toThrow(/RRS020/)
  })

  it('throws RRS021 without session secrets', async () => {
    await expect(callLoader(enableUrl(VALID_SECRET), {}, config({preview: {}}))).rejects.toThrow(/RRS021/)
  })
})

describe('preview change and exit (action)', () => {
  async function previewCookies() {
    return setCookies(await callLoader(enableUrl(VALID_SECRET)))
  }

  it('changes the perspective on PUT with a matching Origin', async () => {
    const cookies = await previewCookies()
    const response = await callAction(
      {method: 'PUT', headers: {Origin: ORIGIN}, body: new URLSearchParams({perspective: '["rWinter","drafts"]'})},
      cookies,
    )
    expect(response.status).toBe(200)
    expect(await readPreview(setCookies(response))).toMatchObject({perspective: ['rWinter', 'drafts']})
  })

  it('rejects a PUT without an Origin header (CSRF)', async () => {
    const cookies = await previewCookies()
    const response = await callAction({method: 'PUT', body: new URLSearchParams({perspective: 'published'})}, cookies)
    expect(response.status).toBe(403)
  })

  it('rejects a PUT from another origin (CSRF)', async () => {
    const cookies = await previewCookies()
    const response = await callAction(
      {method: 'PUT', headers: {Origin: 'https://evil.example.com'}, body: new URLSearchParams({perspective: 'raw'})},
      cookies,
    )
    expect(response.status).toBe(403)
  })

  it('rejects a PUT without a preview session', async () => {
    const response = await callAction(
      {method: 'PUT', headers: {Origin: ORIGIN}, body: new URLSearchParams({perspective: 'published'})},
      [],
    )
    expect(response.status).toBe(403)
  })

  it('rejects an invalid perspective', async () => {
    const cookies = await previewCookies()
    const response = await callAction(
      {method: 'PUT', headers: {Origin: ORIGIN}, body: new URLSearchParams({perspective: 'not a perspective!'})},
      cookies,
    )
    expect(response.status).toBe(400)
  })

  it('exits preview on POST and redirects to /', async () => {
    const cookies = await previewCookies()
    const response = await callAction({method: 'POST', headers: {Origin: ORIGIN}}, cookies)
    expect(response.status).toBe(303)
    expect(response.headers.get('Location')).toBe('/')
    expect(await readPreview([...cookies, ...setCookies(response)].slice(-1))).toEqual({
      enabled: false,
      perspective: 'published',
    })
  })

  it('rejects GET and PATCH on the action', async () => {
    const cookies = await previewCookies()
    const response = await callAction({method: 'PATCH', headers: {Origin: ORIGIN}}, cookies)
    expect(response.status).toBe(405)
  })
})

describe('parsePerspective', () => {
  it('accepts a name, a JSON array and a comma-separated list', () => {
    expect(parsePerspective('drafts')).toBe('drafts')
    expect(parsePerspective('["rA","drafts"]')).toEqual(['rA', 'drafts'])
    expect(parsePerspective('rA, drafts')).toEqual(['rA', 'drafts'])
  })

  it('rejects empty, malformed and non-string values', () => {
    expect(parsePerspective('')).toBeUndefined()
    expect(parsePerspective('[broken')).toBeUndefined()
    expect(parsePerspective(42)).toBeUndefined()
  })

  it('rejects values that the upstream validator lets through', () => {
    expect(parsePerspective('[]')).toBeUndefined()
    expect(parsePerspective('[{"x":1}]')).toBeUndefined()
    expect(parsePerspective('["raw","drafts"]')).toBeUndefined()
    expect(parsePerspective('<script>')).toBeUndefined()
  })
})
