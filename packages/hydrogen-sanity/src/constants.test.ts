import {describe, expect, it} from 'vitest'

import {DEFAULT_CACHE_STRATEGY} from './constants'

describe('DEFAULT_CACHE_STRATEGY', () => {
  it('keeps the 7.x value, fresh for an hour and stale-while-revalidate for 23 hours', () => {
    expect(DEFAULT_CACHE_STRATEGY).toEqual({
      mode: 'public',
      maxAge: 3600,
      staleWhileRevalidate: 82800,
    })
  })
})
