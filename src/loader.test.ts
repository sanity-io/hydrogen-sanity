/* eslint-disable max-nested-callbacks */
import {describe, expect, it, vi} from 'vitest'

import {createSanityLoader} from './loader'

// Mock the global caches object
const cache: Cache = {
  add: vi.fn().mockResolvedValue(undefined),
  addAll: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(true),
  keys: vi.fn().mockResolvedValue([]),
  match: vi.fn().mockResolvedValue(null),
  matchAll: vi.fn().mockResolvedValue([]),
  put: vi.fn().mockResolvedValue(undefined),
}

function waitUntil() {
  return Promise.resolve()
}

const projectId = 'my-project-id'
const dataset = 'my-dataset'

describe('when configured for preview', () => {
  const previewLoader = createSanityLoader({
    cache,
    waitUntil,
    config: {
      projectId,
      dataset,
    },
    preview: {
      token: 'my-token',
      studioUrl: 'https://example.com',
    },
  })

  it('should throw if a token is not provided', () => {
    expect(() =>
      // @ts-expect-error
      createSanityLoader({cache, waitUntil, config: {projectId, dataset}, preview: {}})
    ).toThrowErrorMatchingInlineSnapshot(
      `[Error: Preview mode attempted but SANITY_API_TOKEN not provided to preview.token]`
    )
  })

  it(`shouldn't use API CDN`, () => {
    expect(previewLoader.client.config().useCdn).toBe(false)
  })

  it('should use the `previewDrafts` perspective', () => {
    expect(previewLoader.client.config().perspective).toBe('previewDrafts')
  })

  it('should enable preview mode', () => {
    expect(previewLoader.preview).toBe(true)
  })

  it(`shouldn't cache queries`, () => {
    previewLoader.loadQuery<boolean>('true', {})
    expect(cache.match).not.toHaveBeenCalled()
  })
})

describe('when not configured for preview', () => {
  it(`shouldn't cache queries when using API`, () => {
    const uncachedLoader = createSanityLoader({
      cache,
      waitUntil,
      config: {
        projectId,
        dataset,
        useCdn: false,
      },
    })

    expect(uncachedLoader.client.config().useCdn).toBe(false)

    uncachedLoader.loadQuery<boolean>('true', {})
    expect(cache.match).not.toHaveBeenCalled()
  })
})
