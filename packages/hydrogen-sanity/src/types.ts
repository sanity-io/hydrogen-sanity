import type {Session} from 'react-router'

export type WaitUntil = (promise: Promise<unknown>) => void

/** A Web Cache API cache, such as a cache from `caches.open()`. */
export type WebCacheLike = Pick<Cache, 'match' | 'put' | 'delete'>

/** A key-value store. Only Hydrogen 2026.10 and later accepts a key-value store. */
export type KeyValueCacheLike = {
  get(key: string): unknown
  set(key: string, value: unknown, options?: {ttl?: number}): unknown
  delete?(key: string): unknown
}

/** The cache shapes that Hydrogen 2026.10 exports as `CacheInstance`. */
export type CacheInstance = WebCacheLike | KeyValueCacheLike

/**
 * The session shape that Hydrogen 2026.4 and earlier exports as `HydrogenSession`.
 * Hydrogen 2026.10 removes the type, so the package declares it.
 */
export interface HydrogenSession {
  get: Session['get']
  set: Session['set']
  unset: Session['unset']
  commit: () => Promise<string>
  destroy?: () => Promise<string>
  isPending?: boolean
}
