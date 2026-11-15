import type {ClientReturn, ContentSourceMap, SanityClient, SyncTag} from '@sanity/client'

import {createCacheKey} from '../cache/key'
import {runWithCache, type CacheStatus} from '../cache/run'
import type {CacheEntry} from '../cache/types'
import type {
  CacheStrategy,
  FetchOptions,
  FetchResult,
  PreviewState,
  SanityRequestContext,
  SanityRootData,
} from '../types'
import {DEFAULT_PREVIEW_ROUTE, type SanityMiddlewareConfig} from './config'

const LONG_STRATEGY: CacheStrategy = {maxAge: 3600, staleWhileRevalidate: 86400}
const SHORT_STRATEGY: CacheStrategy = {maxAge: 10, staleWhileRevalidate: 50}

/**
 * Returns the default cache strategy. A long TTL is safe only when an invalidation path exists:
 * a live secret for the Sync Tag Invalidate Function and a store that supports tags.
 *
 * @internal
 */
export function defaultStrategy(config: SanityMiddlewareConfig): CacheStrategy {
  if (config.cache?.strategy) return config.cache.strategy
  const canInvalidate = Boolean(config.live?.secret && config.cache?.store.invalidateTags)
  return canInvalidate ? LONG_STRATEGY : SHORT_STRATEGY
}

/** @internal */
export interface RequestContextInit {
  config: SanityMiddlewareConfig
  preview: PreviewState
  lastLiveEventId: string | undefined
}

/** @internal */
export interface RequestTiming {
  counts: Record<CacheStatus, number>
  apiMs: number
}

/**
 * Implements `SanityRequestContext` for one request.
 *
 * @internal
 */
export class RequestContext implements SanityRequestContext {
  readonly client: SanityClient
  readonly preview: PreviewState
  readonly timing: RequestTiming = {counts: {HIT: 0, STALE: 0, MISS: 0, BYPASS: 0}, apiMs: 0}
  readonly #config: SanityMiddlewareConfig
  readonly #lastLiveEventId: string | undefined
  readonly #tags = new Set<SyncTag>()

  constructor(init: RequestContextInit) {
    this.#config = init.config
    this.#lastLiveEventId = init.lastLiveEventId
    this.preview = init.preview
    const {studioUrl, serverToken} = init.config
    this.client = init.preview.enabled
      ? init.config.client.withConfig({
          token: serverToken,
          useCdn: false,
          perspective: init.preview.perspective,
          stega: studioUrl ? {enabled: true, studioUrl} : {enabled: false},
          ignoreBrowserTokenWarning: true,
        })
      : init.config.client.withConfig({perspective: 'published', stega: {enabled: false}})
  }

  fetch<const Q extends string>(options: FetchOptions<Q>): Promise<FetchResult<ClientReturn<Q, unknown>>>
  fetch<R>(options: FetchOptions): Promise<FetchResult<R>>
  async fetch(options: FetchOptions): Promise<FetchResult<unknown>> {
    const {query} = options
    const params = options.params ?? {}
    const preview = this.preview
    const perspective = preview.enabled ? (options.perspective ?? preview.perspective) : 'published'
    const variant = preview.enabled ? preview.variant : undefined
    const stega = preview.enabled && Boolean(this.#config.studioUrl) && options.stega !== false
    const lastLiveEventId = preview.enabled ? undefined : this.#lastLiveEventId
    let sourceMap: ContentSourceMap | undefined

    const load = async (): Promise<CacheEntry> => {
      const started = performance.now()
      try {
        const response = await this.client.fetch(query, params, {
          filterResponse: false,
          returnQuery: false,
          perspective,
          stega,
          ...(variant ? {variant} : {}),
          // The client sends `cacheMode` only when `useCdn` is true.
          ...(preview.enabled ? {} : {cacheMode: 'noStale'}),
          ...(lastLiveEventId ? {lastLiveEventId} : {}),
        })
        sourceMap = response.resultSourceMap
        const result: unknown = response.result
        return {data: result, syncTags: response.syncTags ?? [], fetchedAt: Date.now()}
      } finally {
        this.timing.apiMs += performance.now() - started
      }
    }

    const store = this.#config.cache?.store
    const strategy = options.cache === false ? undefined : (options.cache ?? defaultStrategy(this.#config))
    let entry: CacheEntry
    let status: CacheStatus
    if (!preview.enabled && !lastLiveEventId && store && strategy) {
      const {projectId = '', dataset = '', apiVersion = ''} = this.client.config()
      const key = await createCacheKey({projectId, dataset, apiVersion, perspective, variant, query, params})
      const result = await runWithCache({
        cache: store,
        key,
        strategy,
        tags: options.tags ?? [],
        waitUntil: this.#config.waitUntil,
        load,
        onError: this.#config.onError,
      })
      entry = result.entry
      status = result.status
    } else {
      entry = await load()
      status = 'BYPASS'
    }

    this.timing.counts[status] += 1
    for (const tag of entry.syncTags) this.#tags.add(tag)
    return {
      data: entry.data,
      syncTags: entry.syncTags,
      ...(preview.enabled && sourceMap ? {sourceMap} : {}),
    }
  }

  syncTags(): SyncTag[] {
    return [...this.#tags]
  }

  getRootData(): SanityRootData {
    const {projectId = '', dataset = '', apiVersion = ''} = this.#config.client.config()
    const {studioUrl, preview, live} = this.#config
    return {
      projectId,
      dataset,
      apiVersion,
      ...(studioUrl ? {studioUrl} : {}),
      preview: {...this.preview},
      previewRoute: preview?.route ?? DEFAULT_PREVIEW_ROUTE,
      live: live?.waitFor ? {waitFor: live.waitFor} : {},
      ...(this.preview.enabled && preview?.browserToken ? {browserToken: preview.browserToken} : {}),
    }
  }
}
