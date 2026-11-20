import * as hydrogen from '@shopify/hydrogen'
import {describe, expect, it} from 'vitest'

import {DEFAULT_CACHE_STRATEGY} from './constants'

/** The long preset of the installed Hydrogen, whichever API it exports. */
function getInstalledLongPreset(): unknown {
  const exports: Record<string, unknown> = {...hydrogen}

  const cache = exports.Cache
  if ((typeof cache === 'function' || typeof cache === 'object') && cache && 'long' in cache) {
    if (typeof cache.long === 'function') return cache.long()
  }

  if (typeof exports.CacheLong === 'function') return exports.CacheLong()

  throw new Error('The installed `@shopify/hydrogen` exports no long cache preset.')
}

describe('DEFAULT_CACHE_STRATEGY', () => {
  it('equals the long preset of the installed Hydrogen', () => {
    expect(DEFAULT_CACHE_STRATEGY).toEqual(getInstalledLongPreset())
  })
})
