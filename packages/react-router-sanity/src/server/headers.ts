import type {SyncTag} from '@sanity/client'

import type {CacheStatus} from '../cache/run'
import type {CdnTagsConfig} from './config'

/** Lists every CDN tag header the SDK can write. Preview responses drop all of them. */
export const CDN_TAG_HEADERS = ['Cache-Tag', 'Surrogate-Key', 'Vercel-Cache-Tag', 'Netlify-Cache-Tag']

/**
 * Returns the value of a CDN cache-tag header for a set of sync tags.
 *
 * The value always includes a dataset tag, so you can purge a whole dataset. Past `maxLength`,
 * the value carries only the dataset tag.
 *
 * @param tags - The sync tags of the response.
 * @param options - The header name, the length limit, and the dataset identity.
 * @returns The header value.
 * @public
 */
export function cdnTagHeaderValue(
  tags: readonly SyncTag[],
  options: CdnTagsConfig & {projectId: string; dataset: string},
): string {
  const separator = options.header.toLowerCase() === 'surrogate-key' ? ' ' : ','
  const datasetTag = `sanity-${options.projectId}-${options.dataset}`
  const value = [datasetTag, ...tags].join(separator)
  return value.length <= (options.maxLength ?? 8000) ? value : datasetTag
}

/**
 * Returns the `Server-Timing` value for one request.
 *
 * @internal
 */
export function serverTimingValue(counts: Record<CacheStatus, number>, apiMs: number): string {
  const desc = `hit=${counts.HIT} stale=${counts.STALE} miss=${counts.MISS} bypass=${counts.BYPASS}`
  return `sanity;desc="${desc}";dur=${apiMs.toFixed(1)}`
}

/**
 * Returns a response with mutable headers. A response from `fetch()` has immutable headers, so
 * the SDK copies it.
 *
 * @internal
 */
export function withMutableHeaders(response: Response): Response {
  try {
    response.headers.set('X-Sanity-Probe', '1')
    response.headers.delete('X-Sanity-Probe')
    return response
  } catch {
    return new Response(response.body, response)
  }
}
