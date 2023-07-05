import type {ClientConfig} from '@sanity/client'

import {isPreviewModeEnabled, Sanity} from '../client'

/** TODO: inline documentation */
export function getPreview<T extends {sanity: Sanity}>(context: T): ClientConfig | undefined {
  return isPreviewModeEnabled(context.sanity.preview)
    ? {
        ...context.sanity.client.config(),
      }
    : undefined
}
