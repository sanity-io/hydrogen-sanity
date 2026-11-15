import type {SyncTag} from '@sanity/client'
import {afterAll, beforeAll, describe, expect, it, vi} from 'vitest'

import {memoryCache} from '../src/cache'
import {action} from '../src/live/route'
import {signInvalidation, verifyInvalidation} from '../src/live/signature'
import {collectSyncTags, eventTouchesPage} from '../src/live/tags'
import {createSanityMiddleware, type SanityMiddlewareConfig} from '../src/server'
import {startFakeLake, type FakeLake} from './fake-lake'
import {runMiddleware} from './helpers'

let lake: FakeLake
beforeAll(async () => {
  lake = await startFakeLake(() => ({result: 1}))
})
afterAll(() => lake.close())

describe('invalidation signature', () => {
  it('verifies its own signature', async () => {
    const header = await signInvalidation('secret', '{"tags":["s1:a"]}', 1_000)
    expect(await verifyInvalidation('secret', '{"tags":["s1:a"]}', header, 1_000)).toBe(true)
  })

  it('rejects a changed body, a wrong secret, a missing header and garbage', async () => {
    const header = await signInvalidation('secret', '{"tags":["s1:a"]}', 1_000)
    expect(await verifyInvalidation('secret', '{"tags":["s1:b"]}', header, 1_000)).toBe(false)
    expect(await verifyInvalidation('other', '{"tags":["s1:a"]}', header, 1_000)).toBe(false)
    expect(await verifyInvalidation('secret', '{}', null, 1_000)).toBe(false)
    expect(await verifyInvalidation('secret', '{}', 't=abc,v1=zz', 1_000)).toBe(false)
  })

  it('rejects a replay after 5 minutes', async () => {
    const header = await signInvalidation('secret', 'body', 1_000)
    expect(await verifyInvalidation('secret', 'body', header, 1_000 + 301)).toBe(false)
  })
})

describe('live route action', () => {
  const store = memoryCache()
  const onInvalidate = vi.fn()
  const config = (): SanityMiddlewareConfig => ({
    client: lake.client(),
    cache: {store},
    live: {secret: 'live-secret', onInvalidate},
  })

  async function post(body: string, signature?: string, method = 'POST') {
    const headers: Record<string, string> = {'Content-Type': 'application/json'}
    if (signature) headers['X-Sanity-Invalidate-Signature'] = signature
    const request = () => new Request('https://shop.example.com/api/sanity/invalidate', {method, headers, ...(method === 'POST' ? {body} : {})})
    return runMiddleware(createSanityMiddleware(config()), request(), (context) => action({request: request(), context}))
  }

  it('purges the app cache by tag and calls onInvalidate', async () => {
    await store.set('k', {data: 1, syncTags: ['s1:a'], fetchedAt: Date.now()}, {ttl: 60, tags: ['s1:a']})
    const body = JSON.stringify({tags: ['s1:a']})
    const response = await post(body, await signInvalidation('live-secret', body))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({tags: 1, purged: true})
    expect(await store.get('k')).toBeUndefined()
    expect(onInvalidate).toHaveBeenCalledWith(['s1:a'])
  })

  it('returns 401 for an unsigned or forged call', async () => {
    const body = JSON.stringify({tags: ['s1:a']})
    expect((await post(body)).status).toBe(401)
    expect((await post(body, await signInvalidation('wrong', body))).status).toBe(401)
  })

  it('returns 400 for a signed body with the wrong shape', async () => {
    const body = JSON.stringify({tags: 'nope'})
    expect((await post(body, await signInvalidation('live-secret', body))).status).toBe(400)
  })

  it('returns 405 for GET', async () => {
    expect((await post('', undefined, 'GET')).status).toBe(405)
  })

  it('returns 413 for a body over 64 KB, before it verifies the signature', async () => {
    const body = JSON.stringify({tags: Array.from({length: 10_000}, (_, i) => `s1:${i}`)})
    expect((await post(body, await signInvalidation('live-secret', body))).status).toBe(413)
  })
})

describe('event-to-route tag matching', () => {
  it('collects syncTags from every route and ignores other data', () => {
    const tags = collectSyncTags([
      {sanity: {}, syncTags: ['s1:root']},
      {page: {}, syncTags: ['s1:page', 'not-a-tag', 3]},
      undefined,
      {syncTags: 'nope'},
    ])
    expect([...tags]).toEqual(['s1:root', 's1:page'])
  })

  it('matches only events that touch the page', () => {
    const page = new Set<SyncTag>(['s1:a', 's1:b'])
    expect(eventTouchesPage(['s1:b'], page)).toBe(true)
    expect(eventTouchesPage(['s1:z'], page)).toBe(false)
  })

  it('matches every event when no route returned sync tags', () => {
    expect(eventTouchesPage(['s1:z'], new Set())).toBe(true)
  })
})
