import type {SyncTag} from '@sanity/client'

/**
 * Describes one cached query result.
 *
 * @public
 */
export interface CacheEntry {
  /** Contains the query result. */
  data: unknown
  /** Contains the sync tags of the result. */
  syncTags: SyncTag[]
  /** Gives the time of the fetch, in milliseconds since the Unix epoch. */
  fetchedAt: number
}

/**
 * Sets how the app cache stores one entry.
 *
 * @public
 */
export interface CacheSetOptions {
  /** Sets the number of seconds that the store keeps the entry. */
  ttl: number
  /** Sets the tags that invalidate the entry. */
  tags: string[]
}

/**
 * Defines the port between the SDK and an app-cache store.
 *
 * Write an adapter for a store that the SDK does not cover. An adapter without
 * `invalidateTags` supports TTL invalidation only.
 *
 * @example
 * ```ts
 * const myCache: SanityCache = {
 *   get: async (key) => store.read(key),
 *   set: async (key, entry, {ttl}) => store.write(key, entry, ttl),
 * }
 * ```
 * @public
 */
export interface SanityCache {
  /** Returns the entry for a key, or `undefined` when the store has no live entry. */
  get(key: string): Promise<CacheEntry | undefined>
  /** Stores an entry for a key. */
  set(key: string, entry: CacheEntry, options: CacheSetOptions): Promise<void>
  /** Removes every entry that has one of the tags. Leave it out for TTL-only invalidation. */
  invalidateTags?(tags: string[]): Promise<void>
}

/**
 * Tells if a value has the shape of a cache entry.
 *
 * @param value - The value to check. Adapters read it from a store, so the shape is unknown.
 * @returns `true` when the value is a cache entry.
 * @internal
 */
export function isCacheEntry(value: unknown): value is CacheEntry {
  if (typeof value !== 'object' || value === null) return false
  if (!('data' in value) || !('syncTags' in value) || !('fetchedAt' in value)) return false
  return Array.isArray(value.syncTags) && typeof value.fetchedAt === 'number'
}

/**
 * Tells if a value is an array of strings.
 *
 * @internal
 */
export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

/**
 * Parses JSON and returns `undefined` when the text is not valid JSON.
 *
 * @internal
 */
export function parseJson(text: string | null | undefined): unknown {
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}
