import {isMaybePresentation} from '@sanity/presentation-comlink'
import {
  VisualEditing as VisualEditingComponent,
  type VisualEditingProps,
} from '@sanity/visual-editing/remix'
import {type ReactNode, useSyncExternalStore} from 'react'

import PresentationComlink, {type PresentationComlinkProps} from './PresentationComlink.client'

/**
 * Prevent a consumer from importing into a worker/server bundle.
 */
if (typeof document === 'undefined') {
  throw new Error(
    'Visual editing should only run client-side. Please check that this file is not being imported into a worker or server bundle.',
  )
}

/**
 * Enables visual editing on the front-end
 * @see https://www.sanity.io/docs/introduction-to-visual-editing
 */
export default function VisualEditing(
  props: VisualEditingProps & PresentationComlinkProps,
): ReactNode {
  // eslint-disable-next-line prefer-const
  let {action, ...visualEditingProps} = props

  if (!action) {
    console.warn(
      'No action URL provided for the visual editing component to set a new perspective. Defaulting to "/api/preview".',
    )
    action = '/api/preview'
  }

  const maybePresentation = useSyncExternalStore(
    noop,
    () => isMaybePresentation(),
    () => false,
  )

  return (
    <>
      {maybePresentation && <PresentationComlink action={action} />}
      <VisualEditingComponent {...visualEditingProps} />
    </>
  )
}

function noop() {
  // eslint-disable-next-line no-empty-function
  return () => {}
}
