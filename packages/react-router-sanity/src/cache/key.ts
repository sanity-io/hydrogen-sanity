import type {ClientPerspective} from '@sanity/client'

/**
 * Lists every input that changes a query result. The cache key includes all of them.
 *
 * @internal
 */
export interface CacheKeyParts {
  projectId: string
  dataset: string
  apiVersion: string
  perspective: ClientPerspective
  variant: string | undefined
  query: string
  params: unknown
}

/** Serializes a value with sorted object keys, so equal params give equal keys. */
export function stableStringify(value: unknown): string {
  if (value === undefined) return 'null'
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const entries = Object.entries(value)
    .filter(([, item]) => item !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(',')}}`
}

/**
 * Returns the app-cache key for a query. The key is the SHA-256 hex digest of every input that
 * changes the result, including the perspective and the variant.
 *
 * @internal
 */
export async function createCacheKey(parts: CacheKeyParts): Promise<string> {
  const input = stableStringify([
    parts.projectId,
    parts.dataset,
    parts.apiVersion,
    parts.perspective,
    parts.variant ?? null,
    parts.query,
    parts.params ?? {},
  ])
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}
