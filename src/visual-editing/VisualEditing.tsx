import type {VisualEditingProps} from '@sanity/visual-editing/remix'
import {lazy, type ReactElement, Suspense} from 'react'

const VisualEditingComponent = lazy(() =>
  import('@sanity/visual-editing/remix').then((mod) => ({default: mod.VisualEditing}))
)

export function VisualEditing(props: VisualEditingProps): ReactElement {
  return (
    <Suspense fallback={null}>
      <VisualEditingComponent {...props} />
    </Suspense>
  )
}
