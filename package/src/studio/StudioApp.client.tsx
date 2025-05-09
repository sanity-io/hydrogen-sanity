import type {ReactElement} from 'react'
import {Studio} from 'sanity'

/**
 * Prevent a consumer from importing into a worker/server bundle.
 */
if (typeof document === 'undefined') {
  throw new Error(
    'Studio should only run client-side. Please check that this file is not being imported into a worker or server bundle.',
  )
}

/**
 * Enables the Studio App on the front-end
 */
export default function StudioClient(): ReactElement {
  // @ts-expect-error will add config
  return <Studio config={{}} />
}
