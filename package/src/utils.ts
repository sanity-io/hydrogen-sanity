import type {HydrogenSession} from '@shopify/hydrogen'

import {
  type ClientPerspective,
  type QueryParams,
  type QueryWithoutParams,
  validateApiPerspective,
} from './client'
import type {SanityPreviewSession} from './preview/session'

/**
 * Create an SHA-256 hash as a hex string
 * @see https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest#converting_a_digest_to_a_hex_string
 */
export async function sha256(message: string): Promise<string> {
  // encode as UTF-8
  const messageBuffer = await new TextEncoder().encode(message)
  // hash the message
  const hashBuffer = await crypto.subtle.digest('SHA-256', messageBuffer)
  // convert bytes to hex string
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Hash query and its parameters for use as cache key
 * NOTE: Oxygen deployment will break if the cache key is long or contains `\n`
 */
export function hashQuery(
  query: string,
  params: QueryParams | QueryWithoutParams,
): Promise<string> {
  let hash = query

  if (params) {
    hash += JSON.stringify(params)
  }

  return sha256(hash)
}

export function sanitizePerspective(perspective: unknown): Exclude<ClientPerspective, 'raw'> {
  const sanitizedPerspective =
    typeof perspective === 'string' && perspective.includes(',')
      ? perspective.split(',')
      : perspective

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

export function getPerspective(session: SanityPreviewSession | HydrogenSession): ClientPerspective {
  const perspective = session.get('perspective')!.split(',')
  validateApiPerspective(perspective)
  return perspective
}

export function isSanityPreviewSession(session: unknown): session is SanityPreviewSession {
  return (
    isHydrogenSession(session) &&
    'has' in session &&
    typeof session.has === 'function' &&
    'destroy' in session &&
    typeof session.destroy === 'function'
  )
}

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
