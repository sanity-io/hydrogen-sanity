/* eslint-disable max-nested-callbacks */
import {describe, expect, it, vi} from 'vitest'

import {createSanityLoader, CreateSanityLoaderOptions} from './loader'

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

describe('loader', () => {
  vi.stubGlobal('caches', {
    open: vi.fn().mockResolvedValue(cache),
  })

  describe('if given preview config', () => {
    const previewConfig: CreateSanityLoaderOptions = {
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
    }

    const loader = createSanityLoader(previewConfig)

    it('should throw if a token is not provided', () => {
      expect(() =>
        // @ts-expect-error
        createSanityLoader({cache, waitUntil, config: {projectId, dataset}, preview: {}})
      ).toThrowErrorMatchingInlineSnapshot(
        `[Error: Preview mode attempted but SANITY_API_TOKEN not provided to preview.token]`
      )
    })

    it(`shouldn't use API CDN`, () => {
      expect(loader.client.config().useCdn).toBe(false)
    })

    it('should use the `previewDrafts` perspective', () => {
      expect(loader.client.config().perspective).toBe('previewDrafts')
    })

    it('should enable preview mode', () => {
      expect(loader.preview).toBe(true)
    })
  })

  vi.unstubAllGlobals()
})
