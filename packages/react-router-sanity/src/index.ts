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
// `stegaClean` is not re-exported: `@sanity/client/stega` re-exports the whole client, so the root
// entry would evaluate rxjs and the HTTP stack on every page. Import it from `@sanity/client/stega`.
export type {ClientPerspective, SyncTag} from '@sanity/client'
