/* eslint-disable max-nested-callbacks */
import type {QueryStore} from '@sanity/react-loader'
import {createWithCache} from '@shopify/hydrogen'
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {createSanityLoader} from './loader'

const mockedLoadQuery = vi.hoisted<QueryStore['loadQuery']>(() => vi.fn().mockResolvedValue(null))

vi.mock('@sanity/react-loader', async (importOriginal) => {
  const module = await importOriginal<typeof import('@sanity/react-loader')>()
  const queryStore = module.createQueryStore({client: false, ssr: true})

  return {
    ...module,
    createQueryStore: vi.fn().mockReturnValue({
      ...queryStore,
      loadQuery: mockedLoadQuery,
    }),
  }
})

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

const withCache = vi.fn().mockImplementation(createWithCache({cache, waitUntil}))

const projectId = 'my-project-id'
const dataset = 'my-dataset'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('when configured for preview', () => {
  const previewLoader = createSanityLoader({
    withCache,
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

  it(`shouldn't cache queries`, async () => {
    await previewLoader.loadQuery<boolean>('true')
    expect(mockedLoadQuery).toHaveBeenCalledOnce()
    expect(cache.put).not.toHaveBeenCalled()
  })
})

describe('when not configured for preview', () => {
  it(`shouldn't cache queries when using API`, async () => {
    const uncachedLoader = createSanityLoader({
      withCache,
      config: {
        projectId,
        dataset,
        useCdn: false,
      },
    })

    expect(uncachedLoader.client.config().useCdn).toBe(false)

    await uncachedLoader.loadQuery<boolean>('true')
    expect(mockedLoadQuery).toHaveBeenCalledOnce()
    expect(cache.put).not.toHaveBeenCalled()
  })
})
