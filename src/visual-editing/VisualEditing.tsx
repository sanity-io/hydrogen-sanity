import type {VisualEditingProps} from '@sanity/visual-editing/remix'
import {lazy, type ReactElement, Suspense} from 'react'

const VisualEditingComponent = lazy(() =>
  import('@sanity/visual-editing/remix').then((mod) => ({default: mod.VisualEditing}))
)

/**
 * Enables visual editing on the front-end
 * @see https://www.sanity.io/docs/introduction-to-visual-editing
 */
export function VisualEditing(props: VisualEditingProps): ReactElement {
  return (
    <Suspense fallback={null}>
      <VisualEditingComponent {...props} />
    </Suspense>
  )
}
