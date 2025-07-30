import {isMaybePresentation} from '@sanity/presentation-comlink'
import {VisualEditing} from '@sanity/visual-editing/remix'
import {type ComponentProps, type JSX, useSyncExternalStore} from 'react'

import PresentationComlink from './PresentationComlink.client'

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
export default function LiveVisualEditing(
  props: ComponentProps<typeof VisualEditing>,
): JSX.Element {
  // eslint-disable-next-line no-console
  console.log('LiveVisualEditing', props)

  const maybePresentation = useSyncExternalStore(
    noop,
    () => isMaybePresentation(),
    () => false,
  )

  return (
    <>
      {maybePresentation && <PresentationComlink />}
      <VisualEditing {...props} />
    </>
  )
}

function noop() {
  // eslint-disable-next-line no-empty-function
  return () => {}
}
