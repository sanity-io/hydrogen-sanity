import type {ReactElement} from 'react'
import {Studio, StudioProps} from 'sanity'

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
function ClientStudio(props: Pick<StudioProps, 'basePath'>): ReactElement {
  // @ts-expect-error will add config
  return <Studio {...props} config={{}} />
}

export {ClientStudio as default}
