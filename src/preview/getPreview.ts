import {isPreviewModeEnabled, Sanity} from '../client'

/** TODO: inline documentation */
export function getPreview<T extends {sanity: Sanity}>(
  context: T
): {projectId: string; dataset: string; token: string} | undefined {
  return isPreviewModeEnabled(context.sanity.preview)
    ? {
        projectId: context.sanity.preview.projectId,
        dataset: context.sanity.preview.dataset,
        token: context.sanity.preview.token,
      }
    : undefined
}
