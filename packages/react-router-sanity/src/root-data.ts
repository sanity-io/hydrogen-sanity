import type {PreviewState, SanityRootData} from './types'

/** @internal */
export const DISABLED_PREVIEW: PreviewState = {enabled: false, perspective: 'published'}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Tells if a value has the shape of `SanityRootData`.
 *
 * @internal
 */
export function isSanityRootData(value: unknown): value is SanityRootData {
  if (!isRecord(value)) return false
  const {projectId, dataset, apiVersion, preview, previewRoute, live} = value
  return (
    typeof projectId === 'string' &&
    typeof dataset === 'string' &&
    typeof apiVersion === 'string' &&
    typeof previewRoute === 'string' &&
    isRecord(preview) &&
    typeof preview.enabled === 'boolean' &&
    isRecord(live)
  )
}

/**
 * Reads `SanityRootData` from the root loader data. The root loader returns it as `sanity`.
 *
 * Returns `undefined` when the data is missing, for example in an error boundary.
 *
 * @internal
 */
export function readRootData(loaderData: unknown): SanityRootData | undefined {
  if (!isRecord(loaderData)) return undefined
  const {sanity} = loaderData
  return isSanityRootData(sanity) ? sanity : undefined
}
