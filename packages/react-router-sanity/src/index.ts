/**
 * Shared types, the request context key and query helpers. Safe to import on the server and in
 * the browser.
 *
 * @packageDocumentation
 */
export {sanityContext} from './context'
export {SanityRouterError, type SanityErrorCode} from './errors'
export type {
  CacheStrategy,
  FetchOptions,
  FetchResult,
  PreviewState,
  SanityRequestContext,
  SanityRootData,
} from './types'
export {defineQuery, default as groq} from 'groq'
export {stegaClean} from '@sanity/client/stega'
export type {ClientPerspective, SyncTag} from '@sanity/client'
