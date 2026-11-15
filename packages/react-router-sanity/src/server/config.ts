import type {ClientPerspective, SanityClient} from '@sanity/client'
import type {RouterContextProvider} from 'react-router'

import type {SanityCache} from '../cache/types'
import type {CacheStrategy} from '../types'
import type {PreviewSessionFactory} from './session'

/**
 * Configures the Sanity middleware.
 *
 * The config needs only `client`. Every other option is opt-in. The minimal config is correct and
 * secure for production queries.
 *
 * @public
 */
export interface SanityMiddlewareConfig {
  /**
   * Gives the base client. The SDK derives a per-request client from it. Do not put a token on
   * this client. Use `serverToken` instead.
   */
  client: SanityClient
  /**
   * Gives a token with the Viewer role. The SDK uses it only on the server, only in preview, and
   * never serializes it.
   */
  serverToken?: string
  /** Gives the Studio URL. Stega encoding and click-to-edit overlays need it. */
  studioUrl?: string
  /** Configures preview mode and Presentation. Leave it out to disable preview. */
  preview?: PreviewConfig
  /** Configures the app cache. Leave it out to read from the API CDN on every request. */
  cache?: CacheConfig
  /**
   * Keeps the request alive for background work, such as cache writes. On Workers and Oxygen,
   * pass `ctx.waitUntil`. Without it, the SDK does background work inline.
   */
  waitUntil?: (promise: Promise<unknown>) => void
  /** Configures live content. */
  live?: LiveConfig
  /** Emits the sync tags of the response as a CDN cache-tag header. Off by default. */
  cdnTags?: CdnTagsConfig
  /**
   * Adds a `Server-Timing` header with cache hits, misses and API time.
   *
   * @defaultValue `true`
   */
  serverTiming?: boolean
  /** Receives errors that the SDK handles without a throw, such as a failed cache write. */
  onError?: (error: unknown) => void
}

/**
 * Configures preview mode.
 *
 * @public
 */
export interface PreviewConfig {
  /** Gives the secrets that sign the preview cookie. Put the newest secret first. */
  sessionSecrets?: string[]
  /** Replaces the default cookie session. A Hydrogen app can pass its session here. */
  session?: PreviewSessionFactory
  /**
   * Sets the name of the preview cookie.
   *
   * @defaultValue `'__sanity_preview'`
   */
  cookieName?: string
  /**
   * Sets the path of the preview resource route. Visual editing posts perspective changes to it.
   *
   * @defaultValue `'/api/preview'`
   */
  route?: string
  /** Limits preview entry to these Studio origins. Leave it out to accept any valid secret. */
  allowedStudioOrigins?: string[]
  /**
   * Gives a Viewer token to the browser in preview, for live drafts in `<SanityLive includeDrafts>`.
   * The token reaches every editor's browser. Leave it out unless you need live drafts.
   */
  browserToken?: string
  /**
   * Sets the perspective when Studio does not send one.
   *
   * @defaultValue `'drafts'`
   */
  defaultPerspective?: ClientPerspective
}

/**
 * Configures the app cache.
 *
 * @public
 */
export interface CacheConfig {
  /** Gives the cache store. Use `memoryCache`, `webCache`, `kvCache`, or your own adapter. */
  store: SanityCache
  /**
   * Sets the default strategy. A `fetch` call can override it.
   *
   * @defaultValue `{maxAge: 3600, staleWhileRevalidate: 86400}` when `live.secret` is set and the
   * store has global tag invalidation (`kvCache`); `{maxAge: 10, staleWhileRevalidate: 50}` otherwise
   */
  strategy?: CacheStrategy
}

/**
 * Configures live content.
 *
 * @public
 */
export interface LiveConfig {
  /** Gives the shared secret that signs calls from the Sync Tag Invalidate Function. */
  secret?: string
  /**
   * Tells `<SanityLive>` to wait for the Sync Tag Invalidate Function before it revalidates.
   * Set it only after you deploy the function.
   */
  waitFor?: 'function'
  /** Runs after the live route purges the app cache. Purge your CDN by tag here. */
  onInvalidate?: (tags: string[]) => Promise<void> | void
}

/**
 * Configures the CDN cache-tag header.
 *
 * @public
 */
export interface CdnTagsConfig {
  /**
   * Sets the header name. Cloudflare reads `Cache-Tag`, Fastly reads `Surrogate-Key`, Vercel reads
   * `Vercel-Cache-Tag`, Netlify reads `Netlify-Cache-Tag`.
   */
  header: 'Cache-Tag' | 'Surrogate-Key' | 'Vercel-Cache-Tag' | 'Netlify-Cache-Tag' | (string & {})
  /**
   * Sets the maximum header length. Past the limit, the header carries only the dataset tag.
   *
   * @defaultValue 8000
   */
  maxLength?: number
}

/**
 * Gives the arguments of the config function.
 *
 * @public
 */
export interface SanityMiddlewareConfigArgs {
  /** Gives the request. */
  request: Request
  /** Gives the router context. Read platform values, such as `env`, from it. */
  context: Readonly<RouterContextProvider>
}

/**
 * Returns the middleware config for one request. Use a function when the config depends on
 * per-request values, such as `env` on Workers and Oxygen.
 *
 * @public
 */
export type SanityMiddlewareConfigFunction = (
  args: SanityMiddlewareConfigArgs,
) => SanityMiddlewareConfig | Promise<SanityMiddlewareConfig>

/** The default preview route path. */
export const DEFAULT_PREVIEW_ROUTE = '/api/preview'
