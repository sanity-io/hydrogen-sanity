import type {VisualEditingProps} from '@sanity/visual-editing/react-router'
import {Fragment, lazy, type ReactElement, Suspense} from 'react'

import {isServer} from '../utils'
import type {PresentationComlinkProps} from './PresentationComlink.client'

/**
 * If server-side rendering, then return the fallback instead of the heavy dependency.
 */
const VisualEditingComponent = isServer()
  ? Fragment
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
    <Suspense fallback={<Fragment />}>
      <VisualEditingComponent {...props} />
    </Suspense>
  )
}
