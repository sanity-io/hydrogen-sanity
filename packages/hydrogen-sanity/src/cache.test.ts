import {Cache} from '@shopify/hydrogen'
import {describe, expect, it, vi} from 'vitest'

import {createCachedRun} from './cache'
import {createWaitUntil, MapCache, MapStore} from './fixtures'

describe.each([
  ['a Web Cache API cache', () => new MapCache()],
  ['a key-value store', () => new MapStore()],
])('createCachedRun with %s', (_, createCache) => {
  function setup() {
    const {waitUntil, flush} = createWaitUntil()
    const run = createCachedRun({cache: createCache(), waitUntil})
    return {run, flush}
  }

  it.each([
    ['an object', {title: 'Home'}],
    ['an array', [{_id: 'a'}, {_id: 'b'}]],
    ['a string', 'Home'],
    ['a number', 42],
    ['null', null],
  ])('serves %s from the cache on the second run', async (_, value) => {
    const {run, flush} = setup()
    const fn = vi.fn(async () => value)
    const options = {key: ['query-hash'], strategy: Cache.long(), shouldCache: () => true}

    expect(await run(options, fn)).toEqual(value)
    await flush()
    expect(await run(options, fn)).toEqual(value)
    expect(fn).toHaveBeenCalledOnce()
  })

  it('passes the result to `shouldCache`', async () => {
    const {run} = setup()
    const shouldCache = vi.fn(() => true)

    await run({key: ['query-hash'], strategy: Cache.long(), shouldCache}, async () => [1, 2])

    expect(shouldCache).toHaveBeenCalledWith([1, 2])
  })

  it('runs again when `shouldCache` rejects the result', async () => {
    const {run, flush} = setup()
    const fn = vi.fn(async () => ({title: 'Home'}))
    const options = {key: ['query-hash'], strategy: Cache.long(), shouldCache: () => false}

    await run(options, fn)
    await flush()
    await run(options, fn)
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('runs again with `Cache.none()`', async () => {
    const {run, flush} = setup()
    const fn = vi.fn(async () => ({title: 'Home'}))
    const options = {key: ['query-hash'], strategy: Cache.none(), shouldCache: () => true}

    await run(options, fn)
    await flush()
    await run(options, fn)
    expect(fn).toHaveBeenCalledTimes(2)
  })
})
