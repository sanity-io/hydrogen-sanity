import type {HydrogenSession} from '@shopify/hydrogen'

import type {SanityPreviewSession} from './session'

/**
 * Utility to check if preview mode is enabled based on session detection.
 *
 * @param projectId - Project ID to check against
 * @param session - Preview session to check
 * @returns true if preview mode is enabled, false otherwise
 */
export function isPreviewEnabled(
  projectId: string,
  session: SanityPreviewSession | HydrogenSession | undefined,
): boolean {
  if (!(session && 'get' in session && typeof session.get === 'function')) {
    return false
  }

  const sessionProjectId = session.get('projectId')
  return Boolean(sessionProjectId && sessionProjectId === projectId)
}
