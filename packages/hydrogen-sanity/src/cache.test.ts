import * as hydrogen from '@shopify/hydrogen'
import {describe, expect, it, vi} from 'vitest'

import {createCachedRun} from './cache'
import {DEFAULT_CACHE_STRATEGY} from './constants'
import {MapCache} from './fixtures'

const isHydrogenLibrary = 'createRunWithCache' in hydrogen

function setup() {
  return createCachedRun({
    cache: new MapCache(),
    waitUntil: () => Promise.resolve(),
    request: new Request('https://example.com'),
  })
}

describe('createCachedRun with the installed Hydrogen', () => {
  it.each([
    ['an object', {title: 'Home'}],
    ['an array', [{_id: 'a'}, {_id: 'b'}]],
    ['a number', 42],
    ['null', null],
  ])('serves %s from the cache on the second run', async (_, value) => {
    const run = setup()
    const fn = vi.fn(async () => value)
    const options = {
      key: 'query-hash',
      strategy: DEFAULT_CACHE_STRATEGY,
      shouldCache: () => true,
      displayName: 'test',
    }

    expect(await run(options, fn)).toEqual(value)
    expect(await run(options, fn)).toEqual(value)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('runs again when `shouldCache` rejects the result', async () => {
    const run = setup()
    const fn = vi.fn(async () => ({title: 'Home'}))
    const options = {
      key: 'query-hash',
      strategy: DEFAULT_CACHE_STRATEGY,
      shouldCache: () => false,
      displayName: 'test',
    }

    await run(options, fn)
    await run(options, fn)
    expect(fn).toHaveBeenCalledTimes(2)
  })
})

describe('createCachedRun with a key-value store', () => {
  const options = {
    key: 'query-hash',
    strategy: DEFAULT_CACHE_STRATEGY,
    shouldCache: () => true,
    displayName: 'test',
  }
  const context = () => {
    const entries = new Map<string, unknown>()
    return {
      cache: {
        get: (key: string) => entries.get(key),
        set: (key: string, value: unknown) => entries.set(key, value),
      },
      waitUntil: () => Promise.resolve(),
      request: new Request('https://example.com'),
    }
  }

  it.runIf(isHydrogenLibrary)('caches the result on Hydrogen 2026.10 and later', async () => {
    const run = createCachedRun(context())
    const fn = vi.fn(async () => [{_id: 'a'}])

    await run(options, fn)
    expect(await run(options, fn)).toEqual([{_id: 'a'}])
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it.skipIf(isHydrogenLibrary)('throws on Hydrogen 2026.4 and earlier', () => {
    expect(() => createCachedRun(context())).toThrow(/key-value store needs Hydrogen 2026.10/)
  })
})
