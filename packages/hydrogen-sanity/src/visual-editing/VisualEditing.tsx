import {lazy, type ReactElement, Suspense} from 'react'

import {isServer} from '../utils'
import type {VisualEditingProps} from './VisualEditing.client'

/**
 * Provide a consistent fallback to prevent hydration mismatch errors.
 */
function VisualEditingFallback(): ReactElement {
  return <></>
}

/**
 * If server-side rendering, then return the fallback instead of the heavy dependency.
 */
const VisualEditingComponent = isServer()
  ? VisualEditingFallback
  : lazy(
      () =>
        /**
         * `lazy` expects the component as the default export
         * @see https://react.dev/reference/react/lazy
         */
        import('./VisualEditing.client'),
    )

export function VisualEditing(props: VisualEditingProps): ReactElement {
  return (
    <Suspense fallback={<VisualEditingFallback />}>
      <VisualEditingComponent {...props} />
    </Suspense>
  )
}
