import type {VisualEditingProps} from '@sanity/visual-editing/react-router'
import {lazy, type ReactElement, Suspense} from 'react'

import type {PresentationComlinkProps} from './PresentationComlink.client'

/**
 * Provide a consistent fallback to prevent hydration mismatch errors.
 */
function VisualEditingFallback(): ReactElement {
  return <></>
}

/**
 * If server-side rendering, then return the fallback instead of the heavy dependency.
 */
const VisualEditingComponent =
  typeof document === 'undefined'
    ? VisualEditingFallback
    : lazy(
        () =>
          /**
           * `lazy` expects the component as the default export
           * @see https://react.dev/reference/react/lazy
           */
          import('./VisualEditing.client'),
      )

export function VisualEditing(props: VisualEditingProps & PresentationComlinkProps): ReactElement {
  return (
    <Suspense>
      <VisualEditingComponent {...props} />
    </Suspense>
  )
}
