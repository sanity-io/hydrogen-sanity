/**
 * Content Security Policy directives for Sanity. Server only.
 *
 * @packageDocumentation
 */

/**
 * Sets the options of `getSanityCspDirectives`.
 *
 * @public
 */
export interface SanityCspOptions {
  /** Identifies the Sanity project. */
  projectId: string
  /** Gives the Studio URL. In preview, the Studio origin may frame the page. */
  studioUrl?: string
  /** Tells if the request is in preview. Pass `sanity.preview.enabled`. */
  preview: boolean
}

/**
 * Lists CSP directives and their sources.
 *
 * @public
 */
export type CspDirectives = Record<string, string[]>

/**
 * Returns the CSP sources that Sanity needs.
 *
 * The result adds the API, API CDN and image CDN hosts. In preview, it also adds the Studio origin
 * to `frame-ancestors`, so Presentation can show the page in an iframe. Merge the result into the
 * policy of your app.
 *
 * @param options - The project, the Studio URL and the preview state.
 * @returns The directives, keyed by directive name.
 * @example
 * ```ts
 * const sanity = getSanityCspDirectives({projectId, studioUrl, preview: preview.enabled})
 * // {'connect-src': [...], 'img-src': [...], 'frame-ancestors': [...]}
 * ```
 * @public
 */
export function getSanityCspDirectives(options: SanityCspOptions): CspDirectives {
  const {projectId, studioUrl, preview} = options
  const directives: CspDirectives = {
    'connect-src': [`https://${projectId}.api.sanity.io`, `https://${projectId}.apicdn.sanity.io`],
    'img-src': ['https://cdn.sanity.io'],
  }
  if (preview && studioUrl) {
    directives['frame-ancestors'] = ["'self'", new URL(studioUrl).origin]
  }
  return directives
}

/**
 * Merges CSP directives into one policy string. Duplicate sources appear once.
 *
 * @param policies - The directive sets to merge.
 * @returns The `Content-Security-Policy` header value.
 * @public
 */
export function serializeCsp(...policies: CspDirectives[]): string {
  const merged = new Map<string, Set<string>>()
  for (const policy of policies) {
    for (const [directive, sources] of Object.entries(policy)) {
      const set = merged.get(directive) ?? new Set<string>()
      for (const source of sources) set.add(source)
      merged.set(directive, set)
    }
  }
  return [...merged].map(([directive, sources]) => `${directive} ${[...sources].join(' ')}`).join('; ')
}
