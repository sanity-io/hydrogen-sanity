/**
 * Content Security Policy sources for Sanity. Server only.
 *
 * The directives use camelCase keys and contain no nonce, so they fit Hydrogen's
 * `createContentSecurityPolicy({directives})`. For other apps, `serializeCsp` builds the header.
 *
 * @packageDocumentation
 */
import type {RouterContextProvider} from 'react-router'

import {sanityContext} from '../context'
import {getInternal} from '../server/internal'

/**
 * Lists CSP directives and their sources. Keys are camelCase (`connectSrc`) or kebab-case
 * (`connect-src`). A `null` or `undefined` value leaves the directive out.
 *
 * @public
 */
export type CspDirectives = Record<string, readonly string[] | null | undefined>

/**
 * Lists the directives that Sanity needs.
 *
 * This is a type alias, not an interface, so it is assignable to `CspDirectives` and to the
 * Hydrogen directives type.
 *
 * @public
 */
export type SanityCspDirectives = {
  /** Gives the API and API CDN origins. `<SanityLive>` and browser clients connect to them. */
  connectSrc: string[]
  /** Gives the image CDN path of the dataset. `<SanityImage>` loads from it. */
  imgSrc: string[]
  /** Gives the file CDN path of the dataset, for audio and video file assets. */
  mediaSrc: string[]
  /** Allows inline styles for the overlays. Exists only in preview. */
  styleSrc?: string[]
  /** Gives the origins that may frame the page in Presentation. Exists only in preview. */
  frameAncestors?: string[]
}

/**
 * Sets the inputs of `createSanityCspDirectives`.
 *
 * @public
 */
export interface SanityCspOptions {
  /** Identifies the Sanity project. */
  projectId: string
  /** Identifies the dataset. */
  dataset: string
  /**
   * Gives the API host of the client.
   *
   * @defaultValue `'https://api.sanity.io'`
   */
  apiHost?: string
  /**
   * Tells if the client puts the project ID in the host name.
   *
   * @defaultValue `true`
   */
  useProjectHostname?: boolean
  /** Tells if the request is in preview. */
  preview: boolean
  /** Gives the Studio URL. In preview, the Studio origin may frame the page. */
  studioUrl?: string
  /**
   * Allows the Sanity Dashboard (`https://www.sanity.io`) to frame the page in preview. A Studio
   * that runs in the Dashboard puts the Dashboard in the frame chain, and `frame-ancestors`
   * checks every ancestor.
   *
   * @defaultValue `true`
   */
  dashboard?: boolean
}

/** The origin of the Sanity Dashboard. A Studio in the Dashboard puts it in the frame chain. */
const DASHBOARD_ORIGIN = 'https://www.sanity.io'

/**
 * Returns the CSP directives that Sanity needs, from explicit options.
 *
 * Use `getSanityCspDirectives(context)` in a React Router app. Use this function when you build
 * the policy outside a request.
 *
 * @param options - The project, the API host, the preview state and the Studio URL.
 * @returns The directives. Merge them into the policy of your app.
 * @public
 */
export function createSanityCspDirectives(options: SanityCspOptions): SanityCspDirectives {
  const {projectId, dataset, preview, studioUrl} = options
  const api = new URL(options.apiHost ?? 'https://api.sanity.io')
  const basePath = api.pathname.replace(/\/$/, '')
  const host = api.host
  const projectHosts = options.useProjectHostname !== false
  const origin = (name: string) => `${api.protocol}//${name}${basePath}`

  // `api.sanity.io` → `cdn.sanity.io` and `apicdn.sanity.io`; a custom `api.<domain>` follows suit.
  const cdnHost = host.replace(/^api\./, 'cdn.')
  const apiCdnHost = host.replace(/^api\./, 'apicdn.')
  const apiOrigin = projectHosts ? origin(`${projectId}.${host}`) : origin(host)
  const apiCdnOrigin = projectHosts ? origin(`${projectId}.${apiCdnHost}`) : origin(apiCdnHost)

  // A CSP path that ends with `/` matches every path under it. CSP allows no `*` in a path.
  const directives: SanityCspDirectives = {
    // A custom host without project host names gives the same origin twice.
    connectSrc: [...new Set([apiOrigin, apiCdnOrigin])],
    imgSrc: [`${api.protocol}//${cdnHost}/images/${projectId}/${dataset}/`],
    mediaSrc: [`${api.protocol}//${cdnHost}/files/${projectId}/${dataset}/`],
  }

  if (preview) {
    // The overlays inject styles at runtime. With a nonce in `style-src`, browsers ignore
    // `'unsafe-inline'`, and `<VisualEditing>` passes the nonce to the overlay styles instead.
    directives.styleSrc = ["'unsafe-inline'"]
    // A relative `studioUrl` is an embedded Studio on the same origin. `'self'` covers it.
    const ancestors = ["'self'"]
    if (studioUrl && /^https?:\/\//i.test(studioUrl)) ancestors.push(new URL(studioUrl).origin)
    if (options.dashboard !== false) ancestors.push(DASHBOARD_ORIGIN)
    directives.frameAncestors = [...new Set(ancestors)]
  }
  return directives
}

/**
 * Returns the CSP directives that Sanity needs for the current request.
 *
 * The function reads the client config, the Studio URL and the preview state from the Sanity
 * middleware. Outside preview, the page allows no framing by Sanity. In preview, the Studio and
 * the Sanity Dashboard may frame the page.
 *
 * @param context - The router context. The Sanity middleware must run first.
 * @param options - Turns off the Dashboard origin in preview.
 * @returns The directives. Pass them to Hydrogen as `directives`, or to `serializeCsp`.
 * @throws RRS010 when the Sanity middleware is not registered.
 * @example
 * ```ts
 * // app/entry.server.tsx (Hydrogen)
 * const csp = createContentSecurityPolicy({shop, directives: getSanityCspDirectives(context)})
 * ```
 * @public
 */
export function getSanityCspDirectives(
  context: Readonly<RouterContextProvider>,
  options: {dashboard?: boolean} = {},
): SanityCspDirectives {
  const sanity = context.get(sanityContext)
  const {config} = getInternal(context)
  const {projectId = '', dataset = '', apiHost, useProjectHostname} = config.client.config()
  return createSanityCspDirectives({
    projectId,
    dataset,
    apiHost,
    useProjectHostname,
    preview: sanity.preview.enabled,
    studioUrl: config.studioUrl,
    dashboard: options.dashboard,
  })
}

function kebab(name: string): string {
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
}

/**
 * Merges CSP directive sets into one `Content-Security-Policy` header value.
 *
 * The function accepts camelCase and kebab-case keys. It removes duplicate sources and skips
 * `null`, `undefined` and empty directives. When a set lists `'none'` and another set adds
 * sources, the sources replace `'none'`.
 *
 * @param policies - The directive sets to merge, in order.
 * @returns The header value.
 * @example
 * ```ts
 * const header = serializeCsp(
 *   {defaultSrc: ["'self'"], scriptSrc: ["'self'", `'nonce-${nonce}'`], frameAncestors: ["'none'"]},
 *   getSanityCspDirectives(context),
 * )
 * ```
 * @public
 */
export function serializeCsp(...policies: CspDirectives[]): string {
  const merged = new Map<string, string[]>()
  for (const policy of policies) {
    for (const [key, sources] of Object.entries(policy)) {
      if (!sources || sources.length === 0) continue
      const directive = kebab(key)
      const current = merged.get(directive) ?? []
      const base = current.every((source) => source === "'none'") ? [] : current
      merged.set(directive, [...new Set([...base, ...sources])])
    }
  }
  return [...merged].map(([directive, sources]) => `${directive} ${sources.join(' ')}`).join('; ')
}

/**
 * Returns a new random nonce for one response. Use it in `script-src`, in `style-src`, and in
 * `<ServerRouter nonce>`.
 *
 * Never cache a response that carries a nonce in a shared cache: every response needs a new one.
 *
 * @returns A base64 string from 16 random bytes.
 * @public
 */
export function createNonce(): string {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))))
}
