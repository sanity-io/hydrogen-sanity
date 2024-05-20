import type {VisualEditingProps} from '@sanity/visual-editing/remix'
import {lazy, type ReactElement, Suspense} from 'react'

/**
 * Provide a consistent fallback to prevent hydration mismatch errors.
 */
function VisualEditingFallback(): ReactElement {
  return <></>
}

/**
 * If server-side rendering, then return the fallback instead of the heavy dependency.
 * @see https://remix.run/docs/en/1.14.3/guides/constraints#browser-only-code-on-the-server
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

export function VisualEditing(props: VisualEditingProps): ReactElement {
  return (
    <Suspense>
      <VisualEditingComponent {...props} />
    </Suspense>
  )
}
