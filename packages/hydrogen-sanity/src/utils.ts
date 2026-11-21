import {type ClientPerspective, validateApiPerspective} from '@sanity/client'
import {urlSearchParamPreviewPerspective} from '@sanity/preview-url-secret/constants'

import type {SanityPreviewSession} from './preview/session'
import type {HydrogenSession} from './types'

/**
 * A perspective name: `published`, `drafts`, `raw`, `previewDrafts` or a release name. Release
 * names use the document ID alphabet of `@sanity/id-utils` without dots, because a dot would
 * break `versions.<release>.<id>`. `validateApiPerspective` accepts any string, so this check is
 * what keeps markup out of a perspective that the page later serializes.
 */
const PERSPECTIVE_NAME = /^[a-zA-Z0-9_-]+$/

function assertPerspectiveNames(perspective: unknown): asserts perspective is string | string[] {
  const names = Array.isArray(perspective) ? perspective : [perspective]
  const valid =
    names.length > 0 &&
    names.every((name) => typeof name === 'string' && PERSPECTIVE_NAME.test(name))
  if (!valid) {
    throw new TypeError(`Invalid perspective: ${JSON.stringify(perspective)}`)
  }
}

/**
 * Sanitizes and validates a perspective value.
 * Handles both string (comma-separated) and array formats.
 * @throws TypeError when the value is empty or contains anything but perspective names.
 */
export function sanitizePerspective(perspective: unknown): Exclude<ClientPerspective, 'raw'> {
  let sanitizedPerspective =
    typeof perspective === 'string' && perspective.includes(',')
      ? perspective.split(',')
      : perspective

  // Filter out empty strings and undefined values from perspective array
  if (Array.isArray(sanitizedPerspective)) {
    sanitizedPerspective = sanitizedPerspective.filter(
      (p): p is string => typeof p === 'string' && p.length > 0,
    )
  }

  assertPerspectiveNames(sanitizedPerspective)
  validateApiPerspective(sanitizedPerspective)

  return sanitizedPerspective === 'raw' ? 'drafts' : sanitizedPerspective
}

/**
 * Check if API version supports perspective stack (v2025-02-19 or later)
 * Special versions: '1' doesn't support perspectives, 'X' does support perspectives
 */
export function supportsPerspectiveStack(apiVersion: string): boolean {
  // Special cases
  if (apiVersion === '1') return false
  if (apiVersion === 'X') return true

  // Normalize version by removing 'v' prefix if present
  const normalizedVersion = `${apiVersion}`.replace(/^v/, '')

  // Parse date format: 2025-02-19
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedVersion)) return false

  const versionDate = new Date(normalizedVersion)
  const cutoffDate = new Date('2025-02-19')

  return versionDate >= cutoffDate
}

/**
 * Extracts and validates the perspective from a session.
 * Falls back to `drafts` when the session has no valid perspective, so a stale or foreign session
 * value can't break the request.
 */
export function getPerspective(session: SanityPreviewSession | HydrogenSession): ClientPerspective {
  const stored = session.get('perspective')
  try {
    const perspective = sanitizePerspective(stored)
    return Array.isArray(perspective) ? perspective : [perspective]
  } catch (error) {
    if (stored && process.env.NODE_ENV === 'development') {
      console.warn('Using the `drafts` perspective instead of the stored perspective.', error)
    }
    return ['drafts']
  }
}

/**
 * Reads the `sanity-preview-perspective` URL search param and validates it.
 * Returns `undefined` if absent or invalid, so callers can fall back to the session.
 */
export function getPerspectiveFromUrl(url: URL | string): ClientPerspective | undefined {
  try {
    const parsed = typeof url === 'string' ? new URL(url) : url
    const param = parsed.searchParams.get(urlSearchParamPreviewPerspective)
    if (!param) return undefined
    return sanitizePerspective(param)
  } catch {
    return undefined
  }
}

/**
 * Type guard that checks if a session object is a SanityPreviewSession.
 * Validates presence of required methods: has, destroy (in addition to Hydrogen session methods).
 */
export function isSanityPreviewSession(session: unknown): session is SanityPreviewSession {
  return (
    isHydrogenSession(session) &&
    'has' in session &&
    typeof session.has === 'function' &&
    'destroy' in session &&
    typeof session.destroy === 'function'
  )
}

/**
 * Type guard that checks if a session object is a valid Hydrogen session.
 * Validates presence of required methods: get, set, unset, commit.
 */
export function isHydrogenSession(session: unknown): session is HydrogenSession {
  return (
    !!session &&
    typeof session === 'object' &&
    'get' in session &&
    typeof session.get === 'function' &&
    'set' in session &&
    typeof session.set === 'function' &&
    'unset' in session &&
    typeof session.unset === 'function' &&
    'commit' in session &&
    typeof session.commit === 'function'
  )
}

/**
 * Utility function that detects if code is running on the server.
 * Used for SSR safety and preventing client-only code from running on server.
 */
export function isServer(): boolean {
  return typeof document === 'undefined'
}
