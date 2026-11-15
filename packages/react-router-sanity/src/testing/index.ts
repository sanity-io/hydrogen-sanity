/**
 * Test utilities. Unit-test loaders without network access.
 *
 * @packageDocumentation
 */
import {createClient, type ClientReturn, type SanityClient, type SyncTag} from '@sanity/client'
import {RouterContextProvider} from 'react-router'

import {sanityContext} from '../context'
import {DISABLED_PREVIEW} from '../root-data'
import type {FetchOptions, FetchResult, PreviewState, SanityRequestContext, SanityRootData} from '../types'

/**
 * Sets the options of `createTestSanityContext`.
 *
 * @public
 */
export interface TestSanityContextOptions {
  /**
   * Gives query results. Pass a map from query string to result, or a function of the fetch
   * options. A query without a result throws, so a test fails on an unexpected query.
   */
  results?: Record<string, unknown> | ((options: FetchOptions) => unknown)
  /** Gives the sync tags that every fetch returns. */
  syncTags?: SyncTag[]
  /** Sets the preview state. */
  preview?: Partial<PreviewState>
}

class TestRequestContext implements SanityRequestContext {
  readonly client: SanityClient = createClient({
    projectId: 'test',
    dataset: 'test',
    apiVersion: '2026-11-01',
    useCdn: false,
  })
  readonly preview: PreviewState
  readonly calls: FetchOptions[] = []
  readonly #options: TestSanityContextOptions

  constructor(options: TestSanityContextOptions) {
    this.#options = options
    this.preview = {...DISABLED_PREVIEW, ...options.preview}
  }

  fetch<const Q extends string>(options: FetchOptions<Q>): Promise<FetchResult<ClientReturn<Q, unknown>>>
  fetch<R>(options: FetchOptions): Promise<FetchResult<R>>
  async fetch(options: FetchOptions): Promise<FetchResult<unknown>> {
    this.calls.push(options)
    const {results = {}} = this.#options
    let data: unknown
    if (typeof results === 'function') {
      data = results(options)
    } else if (Object.hasOwn(results, options.query)) {
      data = results[options.query]
    } else {
      throw new Error(`createTestSanityContext: no result for query ${JSON.stringify(options.query)}`)
    }
    return {data, syncTags: this.#options.syncTags ?? []}
  }

  syncTags(): SyncTag[] {
    return this.#options.syncTags ?? []
  }

  getRootData(): SanityRootData {
    return {
      projectId: 'test',
      dataset: 'test',
      apiVersion: '2026-11-01',
      preview: this.preview,
      previewRoute: '/api/preview',
      live: {},
    }
  }
}

/**
 * Creates a router context with a fake Sanity request context.
 *
 * Pass the result as `context` to a loader in a unit test.
 *
 * @param options - The query results and the preview state.
 * @returns The router context, and the list of fetch calls for assertions.
 * @example
 * ```ts
 * const {context, calls} = createTestSanityContext({results: {[PAGE_QUERY]: {title: 'Home'}}})
 * const data = await loader({request, params: {}, context})
 * expect(calls[0]?.query).toBe(PAGE_QUERY)
 * ```
 * @public
 */
export function createTestSanityContext(options: TestSanityContextOptions = {}): {
  context: RouterContextProvider
  calls: readonly FetchOptions[]
} {
  const sanity = new TestRequestContext(options)
  const context = new RouterContextProvider()
  context.set(sanityContext, sanity)
  return {context, calls: sanity.calls}
}
