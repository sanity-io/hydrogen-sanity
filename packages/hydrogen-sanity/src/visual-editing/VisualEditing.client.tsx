import {isMaybePresentation} from '@sanity/presentation-comlink'
import {
  VisualEditing as VisualEditingComponent,
  type VisualEditingProps,
} from '@sanity/visual-editing/react-router'
import {type ReactNode, useSyncExternalStore} from 'react'

import {isServer} from '../utils'
import PresentationComlink, {type PresentationComlinkProps} from './PresentationComlink.client'

let didWarnAboutNoAction = false

/**
 * Prevent a consumer from importing into a worker/server bundle.
 */
if (isServer()) {
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
    if (process.env.NODE_ENV === 'development' && !didWarnAboutNoAction) {
      console.warn(
        'No action URL provided for the visual editing component to set a new perspective. Defaulting to "/api/preview".',
      )

      didWarnAboutNoAction = true
    }
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
